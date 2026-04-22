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

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
};

function mimeFor(path) {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? (MIME[path.slice(dot)] || "application/octet-stream") : "application/octet-stream";
}

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

/**
 * Compose a chain of scrml-generated WinterCG fetch handlers into a single
 * dispatcher that tries each in order and returns the first non-null
 * Response. Matches the verdict in scrmlTS design-insight 22: each
 * `.server.js` exports `fetch(request): Response | null`; the `null` return
 * is the composition seam.
 */
export function composeScrmlFetch(handlers) {
  return async function scrmlDispatch(req) {
    for (const h of handlers) {
      const r = await h(req);
      if (r !== null && r !== undefined) return r;
    }
    return null;
  };
}

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

  const walk = (dir) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) files.push(...walk(p));
      else if (e.isFile() && e.name.endsWith(".server.js")) files.push(p);
    }
    return files;
  };

  for (const file of walk(distDir)) {
    const mod = await import(file);
    if (typeof mod.fetch === "function") handlers.push(mod.fetch);
  }
  return handlers;
}

/**
 * Build the fetch handler.
 *
 * @param {object} opts
 * @param {object} [opts.engine]        injectable engine (defaults to getEngine())
 * @param {boolean} [opts.localDev]     unlock write endpoints (save/switch/merge/undo)
 * @param {string}  [opts.distDir]      absolute path to compiled scrml UI (static serving)
 * @param {Array}   [opts.scrmlHandlers] scrml WinterCG fetch handlers (first-match wins)
 */
export function createHandler({
  engine, localDev = false, distDir = null, scrmlHandlers = [],
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

  return async function handler(req) {
    const url = new URL(req.url);
    const { pathname } = url;
    if (LOG) logLine("REQ", snapshotRequest(req));

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
  const fetch = createHandler({
    engine, localDev, distDir: compile.distDir, scrmlHandlers,
  });
  return Bun.serve({ port, hostname: "127.0.0.1", fetch });
}
