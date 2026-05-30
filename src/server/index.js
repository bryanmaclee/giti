/**
 * giti HTTP API — read-only by default, opt-in local-dev writes.
 *
 * M4.1 Hosted Forge foundation. Wraps the engine in a Bun.serve handler
 * so the Web UI (and eventually remote clients) can read repo state.
 *
 * Write endpoints (save/switch/merge/undo) are gated on `localDev: true`
 * AND the server always binds 127.0.0.1 until real auth ships. Anything
 * else is unsafe — there is no authentication yet.
 *
 * Spec ref: giti-spec-v1.md §M4.1
 */

import { existsSync, statSync, readdirSync } from "node:fs";
import { join, resolve, normalize } from "node:path";

import { getEngine } from "../engine/index.js";
import { parseStatus } from "../commands/status.js";
import { compileUi, DEFAULT_DIST_DIR } from "./compile-ui.js";

export const VERSION = "0.1.0";

// mimeFor + MIME table authored in scrml at ../lib/server-helpers.scrml
// (S10 slice 19 dogfood).
import { mimeFor } from "../lib/server-helpers.js";

/**
 * Resolve a request path against the UI dist directory. Returns the
 * absolute file path if it exists under distDir, null otherwise.
 * Protects against path traversal.
 */
function resolveStatic(pathname, distDir) {
  // "/" → status.html (the landing page)
  let rel = pathname === "/" ? "/status.html" : pathname;
  // strip leading slash so join doesn't absolute-override
  rel = rel.replace(/^\/+/, "");
  const abs = normalize(join(distDir, rel));
  if (!abs.startsWith(distDir)) return null; // traversal guard
  if (!existsSync(abs)) return null;
  const stat = statSync(abs);
  if (!stat.isFile()) return null;
  return abs;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function readJson(req) {
  try {
    return { ok: true, body: await req.json() };
  } catch (e) {
    return { ok: false, error: "invalid JSON body" };
  }
}

// composeScrmlFetch authored in scrml at ../lib/server-helpers.scrml (slice 19).
import { composeScrmlFetch } from "../lib/server-helpers.js";
export { composeScrmlFetch };

// Opt-in request logger. Enable with GITI_SERVER_LOG=1. Silent in tests.
const LOG = process.env.GITI_SERVER_LOG === "1";
function logLine(...parts) { if (LOG) console.log("[giti-server]", ...parts); }

function snapshotRequest(req) {
  const url = new URL(req.url);
  const cookie = req.headers.get("Cookie") || "";
  const csrfCookie = cookie.match(/scrml_csrf=([^;]+)/)?.[1] || null;
  const csrfHeader = req.headers.get("X-CSRF-Token") || null;
  return {
    method: req.method,
    pathname: url.pathname,
    search: url.search || "",
    contentType: req.headers.get("Content-Type") || null,
    cookiePresent: cookie.length > 0,
    csrfCookie: csrfCookie ? `${csrfCookie.slice(0, 8)}…` : null,
    csrfHeader: csrfHeader ? `${csrfHeader.slice(0, 8)}…` : null,
    csrfMatch: !!(csrfCookie && csrfHeader && csrfCookie === csrfHeader),
  };
}

function snapshotResponse(res) {
  return {
    status: res.status,
    contentType: res.headers.get("Content-Type") || null,
    setCookie: res.headers.get("Set-Cookie") || null,
  };
}

// Wraps every scrml-generated handler with entry/exit/error logging.
function instrumentScrmlHandlers(handlers) {
  if (!LOG) return handlers;
  return handlers.map((h, i) => async (req) => {
    const tag = `scrml#${i}`;
    logLine(tag, "IN ", snapshotRequest(req));
    try {
      const r = await h(req);
      if (r === null || r === undefined) {
        logLine(tag, "OUT null (falls through)");
      } else {
        logLine(tag, "OUT", snapshotResponse(r));
      }
      return r;
    } catch (err) {
      logLine(tag, "THROW", err?.stack || String(err));
      throw err;
    }
  });
}

// Recursively collect every `*.server.js` under `dir`, skipping compiler-repro
// artifacts. `ui/repros/*.scrml` are bug reproducers that intentionally exhibit
// broken shapes; loading them as live routes would crash the server at import.
function walkServerModules(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkServerModules(p));
    else if (e.isFile() && e.name.endsWith(".server.js")
             && !e.name.startsWith("repro-")) out.push(p);
  }
  return out;
}

/**
 * Discover every `*.server.js` file under `distDir` and dynamically import
 * its `fetch` export (if present). Returns an array of fetch functions
 * ready to pass to composeScrmlFetch.
 *
 * Files emitted by scrml that have no server functions have no `fetch`
 * export — those are silently skipped.
 */
export async function loadScrmlHandlers(distDir) {
  if (!distDir || !existsSync(distDir)) return [];
  const handlers = [];
  for (const file of walkServerModules(distDir)) {
    const mod = await import(file);
    if (typeof mod.fetch === "function") handlers.push(mod.fetch);
  }
  return handlers;
}

/**
 * Discover §38 channel WebSocket wiring emitted into `*.server.js` modules.
 *
 * Each channel-bearing module exports `_scrml_ws_handlers` ({open,message,close}
 * for Bun.serve's `websocket:` option) and one or more WebSocket upgrade routes
 * (`routes[].isWebSocket === true`, path `/_scrml_ws/<name>`). The upgrade
 * handler needs the live Bun server instance to call `server.upgrade(req)`, so
 * these routes are dispatched specially (see createHandler) rather than through
 * the standard WinterCG `fetch` export, which only forwards `req`.
 *
 * Returns `{ wsHandlers: object[], wsRoutes: object[] }`.
 */
export async function loadScrmlChannels(distDir) {
  if (!distDir || !existsSync(distDir)) return { wsHandlers: [], wsRoutes: [] };
  const wsHandlers = [];
  const wsRoutes = [];
  for (const file of walkServerModules(distDir)) {
    const mod = await import(file);
    if (mod._scrml_ws_handlers) wsHandlers.push(mod._scrml_ws_handlers);
    if (Array.isArray(mod.routes)) {
      for (const r of mod.routes) if (r && r.isWebSocket) wsRoutes.push(r);
    }
  }
  return { wsHandlers, wsRoutes };
}

/**
 * Merge per-file channel WS handler objects into the single `{open,message,close}`
 * Bun.serve expects. Each emitted handler self-filters on `ws.data.__ch`, so
 * fan-out is safe: only the matching channel's handler acts on a given socket.
 */
function mergeWsHandlers(list) {
  if (list.length <= 1) return list[0] || null;
  return {
    open(ws) { for (const h of list) h.open?.(ws); },
    message(ws, raw) { for (const h of list) h.message?.(ws, raw); },
    close(ws, code, reason) { for (const h of list) h.close?.(ws, code, reason); },
  };
}

/**
 * Build the fetch handler.
 *
 * @param {object} opts
 * @param {object} [opts.engine]        injectable engine (defaults to getEngine())
 * @param {boolean} [opts.localDev]     unlock write endpoints (save/switch/merge/undo)
 * @param {string}  [opts.distDir]      absolute path to compiled scrml UI (static serving)
 * @param {Array}   [opts.scrmlHandlers] scrml WinterCG fetch handlers (first-match wins)
 * @param {Array}   [opts.wsRoutes]      §38 channel WebSocket upgrade routes (need the server)
 */
export function createHandler({
  engine, localDev = false, distDir = null, scrmlHandlers = [], wsRoutes = [],
} = {}) {
  const eng = engine || getEngine();
  const scrml = composeScrmlFetch(instrumentScrmlHandlers(scrmlHandlers));

  async function handleGet(pathname, url) {
    if (pathname === "/health") return json({ ok: true, localDev });
    if (pathname === "/version") return json({ version: VERSION });

    if (pathname === "/status") {
      const result = await eng.status();
      if (!result.ok) return json({ error: result.error }, 500);
      return json(parseStatus(result.data.raw || ""));
    }

    if (pathname === "/history") {
      const limitParam = url.searchParams.get("limit");
      const limit = limitParam ? parseInt(limitParam, 10) : 20;
      const result = await eng.history(limit);
      if (!result.ok) return json({ error: result.error }, 500);
      return json(result.data);
    }

    return json({ error: "not found" }, 404);
  }

  async function handleWrite(pathname, req) {
    if (!localDev) {
      return json(
        { error: "write endpoints require local-dev mode (no auth yet)" },
        403,
      );
    }

    let body = {};
    if (pathname !== "/undo") {
      const parsed = await readJson(req);
      if (!parsed.ok) return json({ error: parsed.error }, 400);
      body = parsed.body ?? {};
    }

    let result;
    if (pathname === "/save") {
      result = await eng.save(body.message || "save");
    } else if (pathname === "/switch") {
      if (!body.name) return json({ error: "name is required" }, 400);
      result = await eng.switchTo(body.name);
    } else if (pathname === "/merge") {
      if (!body.name) return json({ error: "name is required" }, 400);
      result = await eng.merge(body.name);
    } else if (pathname === "/undo") {
      result = await eng.undo();
    } else {
      return json({ error: "not found" }, 404);
    }

    if (!result.ok) return json({ error: result.error }, 500);
    return json(result.data ?? { ok: true });
  }

  const WRITE_PATHS = new Set(["/save", "/switch", "/merge", "/undo"]);

  return async function handler(req, server) {
    const url = new URL(req.url);
    const { pathname } = url;
    if (LOG) logLine("REQ", snapshotRequest(req));

    // §38 channel WebSocket upgrade routes — dispatched here (not via the
    // scrml `fetch` export) because the emitted upgrade handler needs the live
    // Bun `server` to call server.upgrade(req). A successful upgrade returns
    // undefined; Bun then takes over the socket.
    if (server && wsRoutes.length > 0) {
      for (const r of wsRoutes) {
        if (r.path === pathname && r.method === req.method) {
          if (LOG) logLine("WS-UPGRADE", pathname);
          return r.handler(req, server);
        }
      }
    }

    // scrml-generated /_scrml/* routes first (first-match wins, null falls through).
    const scrmlResponse = await scrml(req);
    if (scrmlResponse) {
      if (LOG) logLine("RES", pathname, snapshotResponse(scrmlResponse));
      return scrmlResponse;
    }

    if (pathname.startsWith("/api/")) {
      const apiPath = pathname.slice(4); // "/api/status" -> "/status"

      if (req.method === "GET") {
        return handleGet(apiPath, url);
      }

      if (req.method === "POST") {
        if (!WRITE_PATHS.has(apiPath)) return json({ error: "not found" }, 404);
        return handleWrite(apiPath, req);
      }

      return json({ error: "method not allowed" }, 405);
    }

    // Static UI (compiled scrml). GET only.
    if (distDir && req.method === "GET") {
      const file = resolveStatic(pathname, distDir);
      if (file) {
        if (LOG) logLine("STATIC", pathname, "->", file.replace(distDir, "<distDir>"));
        return new Response(Bun.file(file), {
          headers: { "content-type": mimeFor(file) },
        });
      }
    }

    if (LOG) logLine("RES", pathname, "404");
    return json({ error: "not found" }, 404);
  };
}

/**
 * Start the HTTP server.
 *
 * Always binds 127.0.0.1 — there is no auth yet, so exposing the server
 * on another interface would let any local-network peer read or (in
 * localDev mode) mutate the repo.
 *
 * Compile-on-start: if `ui/` exists, shells out to the scrmlTS compiler
 * and emits into `dist/ui/`. Compile failures throw — by policy, scrmlTS
 * compiler bugs blocking giti are P0 on the scrmlTS side (pa.md), so we
 * fail loud instead of silently degrading.
 */
export async function startServer({ port = 3737, engine, localDev = false } = {}) {
  const compile = await compileUi();
  if (!compile.ok) {
    throw new Error(`UI compile failed:\n${compile.error}`);
  }

  const scrmlHandlers = await loadScrmlHandlers(compile.distDir);
  const { wsHandlers, wsRoutes } = await loadScrmlChannels(compile.distDir);
  const fetch = createHandler({
    engine, localDev, distDir: compile.distDir, scrmlHandlers, wsRoutes,
  });

  const serveOpts = { port, hostname: "127.0.0.1", fetch };
  const websocket = mergeWsHandlers(wsHandlers);
  if (websocket) serveOpts.websocket = websocket;

  const server = Bun.serve(serveOpts);
  // §38.6: the channel broadcast() built-in in HTTP-routed server functions
  // publishes via globalThis._scrml_active_server. Wire it to this server.
  globalThis._scrml_active_server = server;
  if (LOG) logLine("CHANNELS", `${wsRoutes.length} ws route(s), ${wsHandlers.length} handler set(s)`);
  return server;
}
