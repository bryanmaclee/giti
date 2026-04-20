/**
 * Tests for save-time scope routing (slice 3).
 *
 * Covers:
 *   - classifyChanges / classifyFromStatus
 *   - planBookmarkMoves
 *   - advanceBookmarks (mocked engine)
 *   - `save` command end-to-end with a mocked engine:
 *       - public-only save advances both main and _private
 *       - private-only save advances only _private
 *       - mixed save is refused (exit 1)
 *       - empty working copy: no bookmark moves
 *   - sync `checkPushSafety` commit-range check (engine.changedFilesInRange)
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  classifyChanges,
  classifyFromStatus,
  planBookmarkMoves,
  advanceBookmarks,
  PRIVATE_BOOKMARK,
  PUBLIC_BOOKMARK,
} from "../src/private/save-routing.js";

import { save } from "../src/commands/save.js";
import { sync, checkPushSafety } from "../src/commands/sync.js";
import { addPrivatePattern } from "../src/private/scope.js";
import { addRemote } from "../src/private/remotes.js";

let repoRoot;
beforeEach(() => { repoRoot = mkdtempSync(join(tmpdir(), "giti-routing-")); });
afterEach(() => { if (existsSync(repoRoot)) rmSync(repoRoot, { recursive: true, force: true }); });

// ---------------------------------------------------------------------------
// classifyChanges / classifyFromStatus
// ---------------------------------------------------------------------------

describe("classifyChanges", () => {
  test("empty input → empty scope", () => {
    const c = classifyChanges([], [".giti/private"]);
    expect(c.scope).toBe("empty");
  });

  test("all public → public", () => {
    const c = classifyChanges(
      [{ kind: "modified", path: "src/main.js" }],
      [".giti/private"]
    );
    expect(c.scope).toBe("public");
    expect(c.publicFiles).toHaveLength(1);
    expect(c.privateFiles).toHaveLength(0);
  });

  test("all private → private", () => {
    const c = classifyChanges(
      [
        { kind: "modified", path: "user-voice.md" },
        { kind: "added", path: "handOffs/new.md" },
      ],
      [".giti/private", "user-voice.md", "handOffs/"]
    );
    expect(c.scope).toBe("private");
    expect(c.privateFiles).toHaveLength(2);
    expect(c.publicFiles).toHaveLength(0);
  });

  test("mixed → mixed", () => {
    const c = classifyChanges(
      [
        { kind: "modified", path: "src/main.js" },
        { kind: "modified", path: "user-voice.md" },
      ],
      [".giti/private", "user-voice.md"]
    );
    expect(c.scope).toBe("mixed");
    expect(c.publicFiles).toHaveLength(1);
    expect(c.privateFiles).toHaveLength(1);
  });
});

describe("classifyFromStatus", () => {
  test("reads manifest from repoRoot and parses status", () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    const c = classifyFromStatus("M user-voice.md\nM src/main.js\n", repoRoot);
    expect(c.scope).toBe("mixed");
    expect(c.parsed.changed).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// planBookmarkMoves
// ---------------------------------------------------------------------------

describe("planBookmarkMoves", () => {
  test("public advances both bookmarks", () => {
    expect(planBookmarkMoves("public")).toEqual([PUBLIC_BOOKMARK, PRIVATE_BOOKMARK]);
  });
  test("private advances only _private", () => {
    expect(planBookmarkMoves("private")).toEqual([PRIVATE_BOOKMARK]);
  });
  test("mixed advances nothing (save is refused before this)", () => {
    expect(planBookmarkMoves("mixed")).toEqual([]);
  });
  test("empty advances nothing", () => {
    expect(planBookmarkMoves("empty")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// advanceBookmarks (mocked engine)
// ---------------------------------------------------------------------------

describe("advanceBookmarks", () => {
  test("calls setBookmark for each bookmark and returns per-entry results", async () => {
    const calls = [];
    const engine = {
      setBookmark: async (name, target) => {
        calls.push({ name, target });
        return { ok: true, data: { name, target } };
      },
    };
    const r = await advanceBookmarks(engine, ["main", "_private"], "@-");
    expect(calls).toEqual([
      { name: "main", target: "@-" },
      { name: "_private", target: "@-" },
    ]);
    expect(r.every((x) => x.ok)).toBe(true);
  });

  test("surfaces per-bookmark failures but doesn't abort", async () => {
    const engine = {
      setBookmark: async (name) => {
        if (name === "_private") return { ok: false, error: "boom" };
        return { ok: true, data: {} };
      },
    };
    const r = await advanceBookmarks(engine, ["main", "_private"]);
    expect(r[0].ok).toBe(true);
    expect(r[1].ok).toBe(false);
    expect(r[1].error).toBe("boom");
  });
});

// ---------------------------------------------------------------------------
// save() command end-to-end with mocked engine
// ---------------------------------------------------------------------------

describe("save() routing", () => {
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

  function mockEngine({ statusRaw, saveOk = true, bookmarkFail = null } = {}) {
    const setBookmarkCalls = [];
    return {
      status: async () => ({ ok: true, data: { raw: statusRaw || "" } }),
      save: async (msg) =>
        saveOk
          ? { ok: true, data: { changeId: "abc123", description: msg || "save" } }
          : { ok: false, error: "save failed" },
      setBookmark: async (name, target) => {
        setBookmarkCalls.push({ name, target });
        if (bookmarkFail === name) return { ok: false, error: "bookmark boom" };
        return { ok: true, data: { name, target } };
      },
      _setBookmarkCalls: setBookmarkCalls,
    };
  }

  test("public-only save advances both main and _private", async () => {
    const engine = mockEngine({ statusRaw: "M src/main.js\n" });
    await save(["fix bug"], { cwd: repoRoot, engine });
    expect(exitCode).toBe(null);
    expect(engine._setBookmarkCalls.map((c) => c.name)).toEqual([
      PUBLIC_BOOKMARK,
      PRIVATE_BOOKMARK,
    ]);
    expect(stdout()).toMatch(/Saved: fix bug/);
  });

  test("private-only save advances only _private", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    const engine = mockEngine({ statusRaw: "M user-voice.md\n" });
    await save(["log"], { cwd: repoRoot, engine });
    expect(exitCode).toBe(null);
    expect(engine._setBookmarkCalls.map((c) => c.name)).toEqual([PRIVATE_BOOKMARK]);
    expect(stdout()).toMatch(/Saved \[private\]: log/);
  });

  test("mixed save is refused (exit 1) before any commit", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    const engine = mockEngine({
      statusRaw: "M user-voice.md\nM src/main.js\n",
      saveOk: true,
    });
    // Add a save spy to confirm it was NOT called.
    let savedCalled = false;
    engine.save = async () => { savedCalled = true; return { ok: true, data: {} }; };
    try {
      await save(["mix"], { cwd: repoRoot, engine });
    } catch (e) { /* swallow exit */ }
    expect(exitCode).toBe(1);
    expect(savedCalled).toBe(false);
    expect(engine._setBookmarkCalls).toHaveLength(0);
    expect(stderr()).toMatch(/both public and private paths/);
    expect(stderr()).toMatch(/user-voice\.md/);
    expect(stderr()).toMatch(/src\/main\.js/);
  });

  test("empty working copy: save succeeds but no bookmark moves", async () => {
    const engine = mockEngine({ statusRaw: "" });
    await save(["empty"], { cwd: repoRoot, engine });
    expect(exitCode).toBe(null);
    expect(engine._setBookmarkCalls).toHaveLength(0);
  });

  test("bookmark-advance failure is non-fatal — save still reported", async () => {
    const engine = mockEngine({
      statusRaw: "M src/main.js\n",
      bookmarkFail: PRIVATE_BOOKMARK,
    });
    await save(["msg"], { cwd: repoRoot, engine });
    expect(exitCode).toBe(null);
    // main succeeded, _private failed
    expect(engine._setBookmarkCalls).toHaveLength(2);
    expect(stdout()).toMatch(/Saved: msg/);
    expect(stderr()).toMatch(/could not advance bookmark '_private'/);
  });

  test("status failure aborts with exit 1", async () => {
    const engine = {
      status: async () => ({ ok: false, error: "jj broke" }),
    };
    try {
      await save(["x"], { cwd: repoRoot, engine });
    } catch (e) { /* swallow exit */ }
    expect(exitCode).toBe(1);
    expect(stderr()).toMatch(/jj broke/);
  });
});

// ---------------------------------------------------------------------------
// sync: commit-range awareness in checkPushSafety
// ---------------------------------------------------------------------------

describe("checkPushSafety with commit-range", () => {
  test("detects private path in a committed (not-yet-pushed) change", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    const engine = {
      status: async () => ({ ok: true, data: { raw: "" } }),
      changedFilesInRange: async () => ({
        ok: true,
        data: [
          { kind: "modified", path: "user-voice.md" },
          { kind: "added", path: "src/feature.js" },
        ],
      }),
    };
    const target = { name: "origin", url: "u", scope: "public" };
    const r = await checkPushSafety(engine, repoRoot, target);
    expect(r.allowed).toBe(false);
    expect(r.files.map((f) => f.path)).toContain("user-voice.md");
  });

  test("deduplicates a path flagged by both working-copy and commit-range", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    const engine = {
      status: async () => ({ ok: true, data: { raw: "M user-voice.md\n" } }),
      changedFilesInRange: async () => ({
        ok: true,
        data: [{ kind: "modified", path: "user-voice.md" }],
      }),
    };
    const target = { name: "origin", url: "u", scope: "public" };
    const r = await checkPushSafety(engine, repoRoot, target);
    expect(r.allowed).toBe(false);
    expect(r.files).toHaveLength(1);
    // "commit" source takes precedence for reporting.
    expect(r.files[0].source).toBe("commit");
  });

  test("commit-range errors are non-fatal (first-push scenario)", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    const engine = {
      status: async () => ({ ok: true, data: { raw: "" } }),
      changedFilesInRange: async () => ({ ok: false, error: "no remote" }),
    };
    const target = { name: "origin", url: "u", scope: "public" };
    const r = await checkPushSafety(engine, repoRoot, target);
    // Working copy is clean AND range check failed gracefully → allowed.
    expect(r.allowed).toBe(true);
  });

  test("engine without changedFilesInRange still works (backward compat)", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    const engine = {
      status: async () => ({ ok: true, data: { raw: "M user-voice.md\n" } }),
      // no changedFilesInRange method
    };
    const target = { name: "origin", url: "u", scope: "public" };
    const r = await checkPushSafety(engine, repoRoot, target);
    expect(r.allowed).toBe(false);
    expect(r.files.map((f) => f.path)).toContain("user-voice.md");
  });
});

// ---------------------------------------------------------------------------
// sync end-to-end with commit-range
// ---------------------------------------------------------------------------

describe("sync() with commit-range push safety", () => {
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
  const stderr = () => stderrChunks.join("");

  test("refuses push when a committed change touches a private path", async () => {
    addPrivatePattern(repoRoot, "handOffs/");
    addRemote(repoRoot, "origin", "https://a.b", "public");

    const engine = {
      status: async () => ({ ok: true, data: { raw: "" } }),
      changedFilesInRange: async () => ({
        ok: true,
        data: [{ kind: "added", path: "handOffs/hand-off-6.md" }],
      }),
      _rawSync: async () => ({ ok: true, data: "" }),
    };

    try {
      await sync(["--push"], { cwd: repoRoot, engine });
    } catch (e) { /* swallow exit */ }
    expect(exitCode).toBe(1);
    expect(stderr()).toMatch(/outgoing content includes private paths/);
    expect(stderr()).toMatch(/handOffs\/hand-off-6\.md/);
    expect(stderr()).toMatch(/committed/);
  });
});
