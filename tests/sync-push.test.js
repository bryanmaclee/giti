/**
 * Slice 4 tests: scope-aware bookmark targeting at push time +
 * link-private bookmark auto-create + engine push/fetch primitives.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { sync, bookmarksForPush } from "../src/commands/sync.js";
import { linkPrivate } from "../src/commands/link-private.js";
import { addRemote } from "../src/private/remotes.js";
import { JjCliEngine } from "../src/engine/jj-cli.js";
import {
  PUBLIC_BOOKMARK,
  PRIVATE_BOOKMARK,
} from "../src/private/save-routing.js";

// Test helpers (mirrors cli.test.js style)
function mockSpawn(calls) {
  let i = 0;
  const recorded = [];
  const spawn = (cmd, opts) => {
    recorded.push({ cmd: [...cmd], opts: { ...opts } });
    const entry = calls[i++] || { stdout: "", stderr: "", exitCode: 0 };
    return {
      stdout: new Response(entry.stdout || "").body,
      stderr: new Response(entry.stderr || "").body,
      exited: Promise.resolve(entry.exitCode ?? 0),
    };
  };
  spawn.recorded = recorded;
  return spawn;
}

let repoRoot;
beforeEach(() => { repoRoot = mkdtempSync(join(tmpdir(), "giti-slice4-")); });
afterEach(() => { if (existsSync(repoRoot)) rmSync(repoRoot, { recursive: true, force: true }); });

// ---------------------------------------------------------------------------
// bookmarksForPush
// ---------------------------------------------------------------------------

describe("bookmarksForPush", () => {
  test("no remote → empty (engine default)", () => {
    expect(bookmarksForPush(null)).toEqual([]);
  });
  test("public remote → [main]", () => {
    expect(bookmarksForPush({ name: "o", url: "u", scope: "public" })).toEqual([PUBLIC_BOOKMARK]);
  });
  test("private remote → [main, _private]", () => {
    expect(bookmarksForPush({ name: "p", url: "u", scope: "private" })).toEqual([
      PUBLIC_BOOKMARK, PRIVATE_BOOKMARK,
    ]);
  });
});

// ---------------------------------------------------------------------------
// Engine push / fetch primitives
// ---------------------------------------------------------------------------

describe("engine.push", () => {
  test("with remoteName and bookmarks: invokes `jj git push --remote X --bookmark A --bookmark B --allow-new`", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.push({ remoteName: "origin", bookmarks: ["main", "_private"] });
    expect(r.ok).toBe(true);
    const cmd = spawn.recorded[0].cmd;
    expect(cmd).toEqual(["jj", "git", "push", "--remote", "origin",
      "--bookmark", "main", "--bookmark", "_private", "--allow-new"]);
  });

  test("with remoteName only: `jj git push --remote X`", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/repo", { spawn });
    await engine.push({ remoteName: "origin" });
    expect(spawn.recorded[0].cmd).toEqual(["jj", "git", "push", "--remote", "origin"]);
  });

  test("no opts → plain `jj git push`", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/repo", { spawn });
    await engine.push();
    expect(spawn.recorded[0].cmd).toEqual(["jj", "git", "push"]);
  });
});

describe("engine.fetch", () => {
  test("with remoteName: `jj git fetch --remote X`", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/repo", { spawn });
    await engine.fetch({ remoteName: "origin" });
    expect(spawn.recorded[0].cmd).toEqual(["jj", "git", "fetch", "--remote", "origin"]);
  });

  test("no opts → `jj git fetch`", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/repo", { spawn });
    await engine.fetch();
    expect(spawn.recorded[0].cmd).toEqual(["jj", "git", "fetch"]);
  });
});

// ---------------------------------------------------------------------------
// sync() → engine.push invocation
// ---------------------------------------------------------------------------

describe("sync push with scope-aware bookmarks", () => {
  let stdoutChunks, stderrChunks, origStdout, origStderr, origExit;
  let exitCode;

  beforeEach(() => {
    stdoutChunks = []; stderrChunks = [];
    origStdout = process.stdout.write.bind(process.stdout);
    origStderr = process.stderr.write.bind(process.stderr);
    origExit = process.exit;
    exitCode = null;
    process.stdout.write = (c) => { stdoutChunks.push(c.toString()); return true; };
    process.stderr.write = (c) => { stderrChunks.push(c.toString()); return true; };
    process.exit = (code) => { exitCode = code; throw new Error(`__exit__${code}`); };
  });
  afterEach(() => {
    process.stdout.write = origStdout;
    process.stderr.write = origStderr;
    process.exit = origExit;
  });

  function mockEngine() {
    const pushCalls = [], fetchCalls = [];
    return {
      status: async () => ({ ok: true, data: { raw: "" } }),
      changedFilesInRange: async () => ({ ok: true, data: [] }),
      push: async (opts) => { pushCalls.push(opts); return { ok: true, data: "" }; },
      fetch: async (opts) => { fetchCalls.push(opts); return { ok: true, data: "" }; },
      _pushCalls: pushCalls,
      _fetchCalls: fetchCalls,
    };
  }

  test("push to public remote sends only [main]", async () => {
    addRemote(repoRoot, "origin", "https://a.b", "public");
    const engine = mockEngine();
    await sync(["--push", "--remote", "origin"], { cwd: repoRoot, engine });
    expect(engine._pushCalls).toHaveLength(1);
    expect(engine._pushCalls[0]).toEqual({
      remoteName: "origin",
      bookmarks: [PUBLIC_BOOKMARK],
    });
  });

  test("push to private remote sends [main, _private]", async () => {
    addRemote(repoRoot, "mine", "git@host", "private");
    const engine = mockEngine();
    await sync(["--push", "--remote", "mine"], { cwd: repoRoot, engine });
    expect(engine._pushCalls[0]).toEqual({
      remoteName: "mine",
      bookmarks: [PUBLIC_BOOKMARK, PRIVATE_BOOKMARK],
    });
  });

  test("pull passes remoteName to fetch", async () => {
    addRemote(repoRoot, "mine", "git@host", "private");
    const engine = mockEngine();
    await sync(["--pull", "--remote", "mine"], { cwd: repoRoot, engine });
    expect(engine._fetchCalls).toHaveLength(1);
    expect(engine._fetchCalls[0]).toEqual({ remoteName: "mine" });
  });

  test("engine without .push() falls back to _rawSync (legacy compat)", async () => {
    addRemote(repoRoot, "origin", "u", "public");
    const legacyCalls = [];
    const legacy = {
      status: async () => ({ ok: true, data: { raw: "" } }),
      _rawSync: async (dir) => { legacyCalls.push(dir); return { ok: true, data: "" }; },
    };
    await sync(["--push"], { cwd: repoRoot, engine: legacy });
    expect(legacyCalls).toContain("push");
  });
});

// ---------------------------------------------------------------------------
// link-private: auto-creates _private bookmark
// ---------------------------------------------------------------------------

describe("link-private bookmark bootstrap", () => {
  let stdoutChunks, stderrChunks, origStdout, origStderr, origExit;
  let exitCode;

  beforeEach(() => {
    stdoutChunks = []; stderrChunks = [];
    origStdout = process.stdout.write.bind(process.stdout);
    origStderr = process.stderr.write.bind(process.stderr);
    origExit = process.exit;
    exitCode = null;
    process.stdout.write = (c) => { stdoutChunks.push(c.toString()); return true; };
    process.stderr.write = (c) => { stderrChunks.push(c.toString()); return true; };
    process.exit = (code) => { exitCode = code; throw new Error(`__exit__${code}`); };
  });
  afterEach(() => {
    process.stdout.write = origStdout;
    process.stderr.write = origStderr;
    process.exit = origExit;
  });
  const stdout = () => stdoutChunks.join("");
  const stderr = () => stderrChunks.join("");

  function mockEngine({ exists = false, setOk = true } = {}) {
    const calls = [];
    return {
      bookmarkExists: async (name) => {
        calls.push({ op: "exists", name });
        return { ok: true, data: exists };
      },
      setBookmark: async (name, target) => {
        calls.push({ op: "set", name, target });
        return setOk
          ? { ok: true, data: { name, target, created: !exists } }
          : { ok: false, error: "set failed" };
      },
      _calls: calls,
    };
  }

  test("creates _private at bookmarks(main) when missing", async () => {
    const engine = mockEngine({ exists: false });
    await linkPrivate(["git@host"], { cwd: repoRoot, engine });
    const setCall = engine._calls.find((c) => c.op === "set");
    expect(setCall).toBeDefined();
    expect(setCall.name).toBe(PRIVATE_BOOKMARK);
    expect(setCall.target).toBe("bookmarks(main)");
    expect(stdout()).toMatch(/Created local bookmark '_private'/);
  });

  test("skips creation when _private already exists", async () => {
    const engine = mockEngine({ exists: true });
    await linkPrivate(["git@host"], { cwd: repoRoot, engine });
    const setCall = engine._calls.find((c) => c.op === "set");
    expect(setCall).toBeUndefined();
    expect(stdout()).not.toMatch(/Created local bookmark/);
  });

  test("set-bookmark failure is reported but non-fatal", async () => {
    const engine = mockEngine({ exists: false, setOk: false });
    await linkPrivate(["git@host"], { cwd: repoRoot, engine });
    expect(exitCode).toBe(null);
    expect(stderr()).toMatch(/could not create '_private' bookmark yet/);
  });

  test("engine without bookmark methods: link-private still succeeds", async () => {
    await linkPrivate(["git@host"], { cwd: repoRoot, engine: {} });
    expect(exitCode).toBe(null);
    expect(stdout()).toMatch(/Linked private remote/);
  });
});
