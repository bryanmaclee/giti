/**
 * giti HTTP API — route tests with a mocked engine.
 */

import { describe, test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createHandler,
  VERSION,
  composeScrmlFetch,
  loadScrmlHandlers,
} from "../src/server/index.js";

function mockEngine(overrides = {}) {
  return {
    status: async () => ({ ok: true, data: { raw: "" } }),
    history: async () => ({ ok: true, data: [] }),
    save: async (message) => ({ ok: true, data: { changeId: "abc123", description: message } }),
    switchTo: async (name) => ({ ok: true, data: { name } }),
    merge: async (name) => ({ ok: true, data: { merged: name } }),
    undo: async () => ({ ok: true, data: { undone: true } }),
    ...overrides,
  };
}

function get(handler, path) {
  return handler(new Request(`http://localhost/api${path}`));
}

function post(handler, path, body) {
  return handler(
    new Request(`http://localhost/api${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

function raw(handler, path, init) {
  return handler(new Request(`http://localhost${path}`, init));
}

describe("server / routes", () => {
  test("GET /health returns ok", async () => {
    const handler = createHandler({ engine: mockEngine() });
    const res = await get(handler, "/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, localDev: false });
  });

  test("GET /version returns version", async () => {
    const handler = createHandler({ engine: mockEngine() });
    const res = await get(handler, "/version");
    expect(await res.json()).toEqual({ version: VERSION });
  });

  test("unknown /api path returns 404", async () => {
    const handler = createHandler({ engine: mockEngine() });
    const res = await get(handler, "/nope");
    expect(res.status).toBe(404);
  });

  test("non-/api path returns 404 (reserved for UI)", async () => {
    const handler = createHandler({ engine: mockEngine() });
    const res = await raw(handler, "/status");
    expect(res.status).toBe(404);
  });

  test("POST to read-only /api path returns 404", async () => {
    const handler = createHandler({ engine: mockEngine() });
    const res = await raw(handler, "/api/status", { method: "POST" });
    expect(res.status).toBe(404);
  });

  test("PUT to /api/status returns 405", async () => {
    const handler = createHandler({ engine: mockEngine() });
    const res = await raw(handler, "/api/status", { method: "PUT" });
    expect(res.status).toBe(405);
  });

  test("GET /health surfaces localDev flag", async () => {
    const h1 = createHandler({ engine: mockEngine(), localDev: false });
    const h2 = createHandler({ engine: mockEngine(), localDev: true });
    expect((await (await get(h1, "/health")).json()).localDev).toBe(false);
    expect((await (await get(h2, "/health")).json()).localDev).toBe(true);
  });
});

describe("server / write routes (local-dev gated)", () => {
  test("POST /save returns 403 when localDev is off", async () => {
    const handler = createHandler({ engine: mockEngine() });
    const res = await post(handler, "/save", { message: "hi" });
    expect(res.status).toBe(403);
  });

  test("POST /save returns engine result when localDev is on", async () => {
    const handler = createHandler({ engine: mockEngine(), localDev: true });
    const res = await post(handler, "/save", { message: "hi" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ changeId: "abc123", description: "hi" });
  });

  test("POST /save defaults message when missing", async () => {
    let gotMessage = null;
    const engine = mockEngine({
      save: async (m) => {
        gotMessage = m;
        return { ok: true, data: { changeId: "x", description: m } };
      },
    });
    const handler = createHandler({ engine, localDev: true });
    await post(handler, "/save", {});
    expect(gotMessage).toBe("save");
  });

  test("POST /switch requires name", async () => {
    const handler = createHandler({ engine: mockEngine(), localDev: true });
    const res = await post(handler, "/switch", {});
    expect(res.status).toBe(400);
  });

  test("POST /switch passes name to engine", async () => {
    let gotName = null;
    const engine = mockEngine({
      switchTo: async (n) => {
        gotName = n;
        return { ok: true, data: { name: n } };
      },
    });
    const handler = createHandler({ engine, localDev: true });
    const res = await post(handler, "/switch", { name: "feature-x" });
    expect(res.status).toBe(200);
    expect(gotName).toBe("feature-x");
  });

  test("POST /merge requires name", async () => {
    const handler = createHandler({ engine: mockEngine(), localDev: true });
    const res = await post(handler, "/merge", {});
    expect(res.status).toBe(400);
  });

  test("POST /undo works without body", async () => {
    const handler = createHandler({ engine: mockEngine(), localDev: true });
    const res = await raw(handler, "/api/undo", { method: "POST" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ undone: true });
  });

  test("POST with invalid JSON returns 400", async () => {
    const handler = createHandler({ engine: mockEngine(), localDev: true });
    const res = await raw(handler, "/api/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });

  test("engine error surfaces as 500", async () => {
    const engine = mockEngine({
      save: async () => ({ ok: false, error: "merge conflict" }),
    });
    const handler = createHandler({ engine, localDev: true });
    const res = await post(handler, "/save", { message: "x" });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("merge conflict");
  });

  test("unknown write path returns 404", async () => {
    const handler = createHandler({ engine: mockEngine(), localDev: true });
    const res = await post(handler, "/nope", {});
    expect(res.status).toBe(404);
  });
});

describe("server / GET /status", () => {
  test("returns parsed status", async () => {
    const raw = "M src/main.js\nA src/new.js\nWorking copy : abc123 feature-x\n";
    const engine = mockEngine({
      status: async () => ({ ok: true, data: { raw } }),
    });
    const res = await get(createHandler({ engine }), "/status");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.changed).toEqual([
      { kind: "modified", path: "src/main.js" },
      { kind: "added", path: "src/new.js" },
    ]);
    expect(body.bookmark).toBe("feature-x");
  });

  test("clean repo returns empty changed", async () => {
    const engine = mockEngine();
    const res = await get(createHandler({ engine }), "/status");
    const body = await res.json();
    expect(body.changed).toEqual([]);
    expect(body.conflicts).toEqual([]);
  });

  test("engine error returns 500", async () => {
    const engine = mockEngine({
      status: async () => ({ ok: false, error: "boom" }),
    });
    const res = await get(createHandler({ engine }), "/status");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "boom" });
  });
});

describe("server / GET /history", () => {
  test("returns history entries", async () => {
    const entries = [
      { changeId: "abc12345", description: "first save", timestamp: "t1" },
    ];
    const engine = mockEngine({
      history: async () => ({ ok: true, data: entries }),
    });
    const res = await get(createHandler({ engine }), "/history");
    expect(await res.json()).toEqual(entries);
  });

  test("passes limit query param to engine", async () => {
    let gotLimit = null;
    const engine = mockEngine({
      history: async (limit) => {
        gotLimit = limit;
        return { ok: true, data: [] };
      },
    });
    await get(createHandler({ engine }), "/history?limit=5");
    expect(gotLimit).toBe(5);
  });

  test("defaults limit to 20 when missing", async () => {
    let gotLimit = null;
    const engine = mockEngine({
      history: async (limit) => {
        gotLimit = limit;
        return { ok: true, data: [] };
      },
    });
    await get(createHandler({ engine }), "/history");
    expect(gotLimit).toBe(20);
  });

  test("engine error returns 500", async () => {
    const engine = mockEngine({
      history: async () => ({ ok: false, error: "broke" }),
    });
    const res = await get(createHandler({ engine }), "/history");
    expect(res.status).toBe(500);
  });
});

describe("server / static UI", () => {
  function makeDist() {
    const dir = mkdtempSync(join(tmpdir(), "giti-dist-"));
    writeFileSync(join(dir, "status.html"), "<html><body>hi</body></html>");
    writeFileSync(join(dir, "status.css"), ".x{}");
    writeFileSync(join(dir, "status.client.js"), "console.log('x')");
    return dir;
  }

  test("GET / returns compiled status.html", async () => {
    const dir = makeDist();
    const handler = createHandler({ engine: mockEngine(), distDir: dir });
    const res = await raw(handler, "/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("hi");
    rmSync(dir, { recursive: true });
  });

  test("serves .css with correct content-type", async () => {
    const dir = makeDist();
    const handler = createHandler({ engine: mockEngine(), distDir: dir });
    const res = await raw(handler, "/status.css");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/css");
    rmSync(dir, { recursive: true });
  });

  test("serves .client.js with JS content-type", async () => {
    const dir = makeDist();
    const handler = createHandler({ engine: mockEngine(), distDir: dir });
    const res = await raw(handler, "/status.client.js");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("javascript");
    rmSync(dir, { recursive: true });
  });

  test("unknown static path returns 404", async () => {
    const dir = makeDist();
    const handler = createHandler({ engine: mockEngine(), distDir: dir });
    const res = await raw(handler, "/nope.html");
    expect(res.status).toBe(404);
    rmSync(dir, { recursive: true });
  });

  test("blocks path traversal", async () => {
    const dir = makeDist();
    const handler = createHandler({ engine: mockEngine(), distDir: dir });
    const res = await raw(handler, "/../etc/passwd");
    expect(res.status).toBe(404);
    rmSync(dir, { recursive: true });
  });

  test("without distDir, root returns 404", async () => {
    const handler = createHandler({ engine: mockEngine() });
    const res = await raw(handler, "/");
    expect(res.status).toBe(404);
  });

  test("API routes still work alongside static serving", async () => {
    const dir = makeDist();
    const handler = createHandler({ engine: mockEngine(), distDir: dir });
    const res = await get(handler, "/version");
    expect(res.status).toBe(200);
    expect((await res.json()).version).toBe(VERSION);
    rmSync(dir, { recursive: true });
  });
});

// ---------------------------------------------------------------------------
// scrml route composition (design-insight 22)
// ---------------------------------------------------------------------------

describe("composeScrmlFetch", () => {
  test("empty chain returns null", async () => {
    const dispatch = composeScrmlFetch([]);
    expect(await dispatch(new Request("http://x/"))).toBeNull();
  });

  test("first non-null response wins", async () => {
    const a = async () => null;
    const b = async () => new Response("B", { status: 200 });
    const c = async () => new Response("C", { status: 200 });
    const dispatch = composeScrmlFetch([a, b, c]);
    const r = await dispatch(new Request("http://x/"));
    expect(await r.text()).toBe("B");
  });

  test("all-null chain falls through to null", async () => {
    const a = async () => null;
    const b = async () => null;
    const dispatch = composeScrmlFetch([a, b]);
    expect(await dispatch(new Request("http://x/"))).toBeNull();
  });
});

describe("createHandler with scrmlHandlers", () => {
  function mockEngineLocal() {
    return {
      status: async () => ({ ok: true, data: { raw: "" } }),
      history: async () => ({ ok: true, data: [] }),
    };
  }

  test("scrml handler takes precedence over /api/* for matching paths", async () => {
    const scrml = async (req) => {
      const u = new URL(req.url);
      if (u.pathname === "/_scrml/foo") {
        return new Response(JSON.stringify({ from: "scrml" }), { status: 200 });
      }
      return null;
    };
    const handler = createHandler({
      engine: mockEngineLocal(),
      scrmlHandlers: [scrml],
    });
    const res = await handler(new Request("http://127.0.0.1/_scrml/foo"));
    expect(res.status).toBe(200);
    expect((await res.json()).from).toBe("scrml");
  });

  test("scrml returning null falls through to existing /api/* behavior", async () => {
    const scrml = async () => null;
    const handler = createHandler({
      engine: mockEngineLocal(),
      scrmlHandlers: [scrml],
    });
    const res = await handler(new Request("http://127.0.0.1/api/health"));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  test("no scrml handlers: existing routes unaffected (backward compat)", async () => {
    const handler = createHandler({ engine: mockEngineLocal() });
    const res = await handler(new Request("http://127.0.0.1/api/version"));
    expect(res.status).toBe(200);
  });
});

describe("loadScrmlHandlers", () => {
  test("missing distDir returns empty array", async () => {
    const handlers = await loadScrmlHandlers("/no/such/path");
    expect(handlers).toEqual([]);
  });

  test("imports fetch export from a .server.js file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "scrml-handlers-"));
    writeFileSync(
      join(dir, "mod.server.js"),
      `export async function fetch(req) {
        const u = new URL(req.url);
        if (u.pathname === "/_scrml/ping") return new Response("pong");
        return null;
      }
      `,
    );
    const handlers = await loadScrmlHandlers(dir);
    expect(handlers).toHaveLength(1);

    const r = await handlers[0](new Request("http://x/_scrml/ping"));
    expect(await r.text()).toBe("pong");
    rmSync(dir, { recursive: true });
  });

  test("skips files without a fetch export", async () => {
    const dir = mkdtempSync(join(tmpdir(), "scrml-handlers-"));
    writeFileSync(
      join(dir, "no-fetch.server.js"),
      `export const something = 1;\n`,
    );
    writeFileSync(
      join(dir, "has-fetch.server.js"),
      `export async function fetch(req) { return new Response("ok"); }\n`,
    );
    const handlers = await loadScrmlHandlers(dir);
    expect(handlers).toHaveLength(1);
    rmSync(dir, { recursive: true });
  });
});
