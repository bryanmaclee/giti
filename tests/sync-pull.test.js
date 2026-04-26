/**
 * Slice 6.3 — fetch-side `_private` auto-tracking.
 *
 * When `giti sync --pull` runs against a private-scoped remote that already
 * has a `_private` bookmark, the local `_private` should pick it up and
 * track it (spec §12.5 — bootstrap a new machine onto an existing private
 * overlay). Without this, a fresh clone + `link-private` + `sync --pull`
 * leaves the local `_private` bookmark dangling at main, and the next
 * private save would diverge from the remote.
 *
 * Covers:
 *   - engine.trackRemoteBookmark — `jj bookmark track <name>@<remote>`
 *   - engine.remoteBookmarkExists — parses indented `  @<remote>:` lines
 *     out of `jj bookmark list <name> --all-remotes`
 *   - sync() pull path:
 *       - private remote with remote `_private` present → tracks it
 *       - private remote with no remote `_private` → no track call
 *       - public remote → no track attempt at all
 *       - "already tracked" track error → silent (idempotent)
 *       - other track error → non-fatal note on stderr
 *       - legacy engine without the new methods → no crash
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { sync } from "../src/commands/sync.js";
import { addRemote } from "../src/private/remotes.js";
import { JjCliEngine } from "../src/engine/jj-cli.js";
import { PRIVATE_BOOKMARK } from "../src/private/save-routing.js";

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
beforeEach(() => { repoRoot = mkdtempSync(join(tmpdir(), "giti-pull-")); });
afterEach(() => { if (existsSync(repoRoot)) rmSync(repoRoot, { recursive: true, force: true }); });

// ---------------------------------------------------------------------------
// engine.trackRemoteBookmark
// ---------------------------------------------------------------------------

describe("engine.trackRemoteBookmark", () => {
  test("builds `jj bookmark track <name>@<remote>`", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.trackRemoteBookmark("_private", "origin");
    expect(r.ok).toBe(true);
    expect(spawn.recorded[0].cmd).toEqual([
      "jj", "bookmark", "track", "_private@origin",
    ]);
  });

  test("missing args → error, no spawn call", async () => {
    const spawn = mockSpawn([]);
    const engine = new JjCliEngine("/repo", { spawn });
    expect((await engine.trackRemoteBookmark()).ok).toBe(false);
    expect((await engine.trackRemoteBookmark("_private")).ok).toBe(false);
    expect((await engine.trackRemoteBookmark(null, "origin")).ok).toBe(false);
    expect(spawn.recorded).toHaveLength(0);
  });

  test("surfaces stderr from a failing track call", async () => {
    const spawn = mockSpawn([{
      stdout: "",
      stderr: "Remote bookmark already tracked: _private@origin",
      exitCode: 1,
    }]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.trackRemoteBookmark("_private", "origin");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/already tracked/);
  });
});

// ---------------------------------------------------------------------------
// engine.remoteBookmarkExists
// ---------------------------------------------------------------------------

describe("engine.remoteBookmarkExists", () => {
  test("true when an indented `  @<remote>:` line is present", async () => {
    // Mirrors actual jj 0.40 output for `bookmark list <name> --all-remotes`.
    const spawn = mockSpawn([{
      stdout: "_private: rqnvwutq 351ed062 c1\n  @origin: rqnvwutq 351ed062 c1\n",
      exitCode: 0,
    }]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.remoteBookmarkExists("_private", "origin");
    expect(r.ok).toBe(true);
    expect(r.data).toBe(true);
    expect(spawn.recorded[0].cmd).toEqual([
      "jj", "bookmark", "list", "_private", "--all-remotes",
    ]);
  });

  test("false when only the local entry is present", async () => {
    const spawn = mockSpawn([{
      stdout: "_private: rqnvwutq 351ed062 c1\n",
      exitCode: 0,
    }]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.remoteBookmarkExists("_private", "origin");
    expect(r.data).toBe(false);
  });

  test("false when the bookmark itself is absent (no matches)", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.remoteBookmarkExists("_private", "origin");
    expect(r.data).toBe(false);
  });

  test("missing args → false, no spawn call", async () => {
    const spawn = mockSpawn([]);
    const engine = new JjCliEngine("/repo", { spawn });
    expect((await engine.remoteBookmarkExists("", "origin")).data).toBe(false);
    expect((await engine.remoteBookmarkExists("_private", "")).data).toBe(false);
    expect(spawn.recorded).toHaveLength(0);
  });

  test("does not match a different remote with the same suffix", async () => {
    // Both `@origin:` and `@upstream:` appear; we asked about `origin` only.
    const spawn = mockSpawn([{
      stdout: "_private: rqnvwutq c1\n  @upstream: rqnvwutq c1\n",
      exitCode: 0,
    }]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.remoteBookmarkExists("_private", "origin");
    expect(r.data).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sync() pull-side auto-tracking
// ---------------------------------------------------------------------------

describe("sync pull from private remote: auto-track _private", () => {
  let stdoutChunks, stderrChunks, origStdout, origStderr, origExit, exitCode;

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

  function mockEngine({
    remoteHasPrivate = true,
    trackResult = { ok: true, data: "" },
  } = {}) {
    const calls = [];
    return {
      status: async () => ({ ok: true, data: { raw: "" } }),
      changedFilesInRange: async () => ({ ok: true, data: [] }),
      fetch: async (opts) => { calls.push({ op: "fetch", ...opts }); return { ok: true, data: "" }; },
      push: async (opts) => { calls.push({ op: "push", ...opts }); return { ok: true, data: "" }; },
      remoteBookmarkExists: async (name, remote) => {
        calls.push({ op: "exists", name, remote });
        return { ok: true, data: name === PRIVATE_BOOKMARK && remoteHasPrivate };
      },
      trackRemoteBookmark: async (name, remote) => {
        calls.push({ op: "track", name, remote });
        return trackResult;
      },
      _calls: calls,
    };
  }

  test("private remote with remote _private present → tracks and reports", async () => {
    addRemote(repoRoot, "mine", "git@host", "private");
    const engine = mockEngine();
    await sync(["--pull", "--remote", "mine"], { cwd: repoRoot, engine });
    const trackCall = engine._calls.find((c) => c.op === "track");
    expect(trackCall).toEqual({ op: "track", name: PRIVATE_BOOKMARK, remote: "mine" });
    expect(stdout()).toMatch(/Tracked _private from mine/);
    expect(exitCode).toBe(null);
  });

  test("private remote without remote _private → no track call, silent", async () => {
    addRemote(repoRoot, "mine", "git@host", "private");
    const engine = mockEngine({ remoteHasPrivate: false });
    await sync(["--pull", "--remote", "mine"], { cwd: repoRoot, engine });
    expect(engine._calls.find((c) => c.op === "track")).toBeUndefined();
    expect(stdout()).not.toMatch(/Tracked/);
    expect(exitCode).toBe(null);
  });

  test("public remote: no exists/track attempt at all", async () => {
    addRemote(repoRoot, "origin", "https://x", "public");
    const engine = mockEngine();
    await sync(["--pull", "--remote", "origin"], { cwd: repoRoot, engine });
    expect(engine._calls.find((c) => c.op === "exists")).toBeUndefined();
    expect(engine._calls.find((c) => c.op === "track")).toBeUndefined();
  });

  test("'already tracked' error is silent (idempotent)", async () => {
    addRemote(repoRoot, "mine", "git@host", "private");
    const engine = mockEngine({
      trackResult: { ok: false, error: "Remote bookmark already tracked: _private@mine" },
    });
    await sync(["--pull", "--remote", "mine"], { cwd: repoRoot, engine });
    expect(stderr()).not.toMatch(/could not track/);
    expect(stdout()).not.toMatch(/Tracked _private/);
    expect(exitCode).toBe(null);
  });

  test("other track error is a non-fatal note on stderr", async () => {
    addRemote(repoRoot, "mine", "git@host", "private");
    const engine = mockEngine({
      trackResult: { ok: false, error: "permission denied on track ref" },
    });
    await sync(["--pull", "--remote", "mine"], { cwd: repoRoot, engine });
    expect(stderr()).toMatch(/could not track _private from mine/);
    expect(exitCode).toBe(null);
  });

  test("default sync (pull+push) on private remote also runs the track step", async () => {
    addRemote(repoRoot, "mine", "git@host", "private");
    const engine = mockEngine();
    await sync([], { cwd: repoRoot, engine });
    expect(engine._calls.find((c) => c.op === "track")).toBeDefined();
    expect(stdout()).toMatch(/Tracked _private/);
  });

  test("legacy engine without the new methods: pull still succeeds", async () => {
    addRemote(repoRoot, "mine", "git@host", "private");
    const legacy = {
      status: async () => ({ ok: true, data: { raw: "" } }),
      fetch: async () => ({ ok: true, data: "" }),
      push: async () => ({ ok: true, data: "" }),
      changedFilesInRange: async () => ({ ok: true, data: [] }),
    };
    await sync(["--pull", "--remote", "mine"], { cwd: repoRoot, engine: legacy });
    expect(exitCode).toBe(null);
    // Nothing else to assert — just that the missing-method path doesn't throw.
  });
});
