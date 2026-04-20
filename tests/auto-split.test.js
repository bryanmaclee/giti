/**
 * Slice 5 tests: auto-split for mixed working copy + `giti private status`.
 *
 * Covers:
 *   - engine.split + engine.newChange primitives
 *   - parseSaveFlags
 *   - splitMessages (user-supplied vs auto-generated)
 *   - autoSplitSave: full orchestration against a mocked engine
 *   - save --split end-to-end (with refusal on no-flag still in place)
 *   - `giti private status` output for each scope
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  autoSplitSave,
  splitMessages,
  PUBLIC_BOOKMARK,
  PRIVATE_BOOKMARK,
} from "../src/private/save-routing.js";
import { save, parseSaveFlags } from "../src/commands/save.js";
import { private_ } from "../src/commands/private.js";
import { addPrivatePattern } from "../src/private/scope.js";
import { JjCliEngine } from "../src/engine/jj-cli.js";

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
beforeEach(() => { repoRoot = mkdtempSync(join(tmpdir(), "giti-split-")); });
afterEach(() => { if (existsSync(repoRoot)) rmSync(repoRoot, { recursive: true, force: true }); });

// ---------------------------------------------------------------------------
// Engine primitives
// ---------------------------------------------------------------------------

describe("engine.split", () => {
  test("builds `jj split -r @ -m <msg> path1 path2`", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.split({ paths: ["src/a.js", "src/b.js"], message: "public: fix" });
    expect(r.ok).toBe(true);
    expect(spawn.recorded[0].cmd).toEqual([
      "jj", "split", "-r", "@", "-m", "public: fix", "src/a.js", "src/b.js",
    ]);
  });

  test("omits -m when no message given", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/repo", { spawn });
    await engine.split({ paths: ["x"] });
    expect(spawn.recorded[0].cmd).toEqual(["jj", "split", "-r", "@", "x"]);
  });

  test("respects a custom revision", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/repo", { spawn });
    await engine.split({ paths: ["x"], revision: "@-" });
    expect(spawn.recorded[0].cmd).toContain("@-");
  });

  test("empty paths returns error", async () => {
    const engine = new JjCliEngine("/repo", { spawn: mockSpawn([]) });
    const r = await engine.split({ paths: [] });
    expect(r.ok).toBe(false);
  });
});

describe("engine.newChange", () => {
  test("runs `jj new`", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.newChange();
    expect(r.ok).toBe(true);
    expect(spawn.recorded[0].cmd).toEqual(["jj", "new"]);
  });
});

// ---------------------------------------------------------------------------
// parseSaveFlags
// ---------------------------------------------------------------------------

describe("parseSaveFlags", () => {
  test("--split is extracted from anywhere in args", () => {
    expect(parseSaveFlags(["--split", "fix", "bug"])).toEqual({
      split: true,
      messageArgs: ["fix", "bug"],
    });
    expect(parseSaveFlags(["fix", "--split", "bug"])).toEqual({
      split: true,
      messageArgs: ["fix", "bug"],
    });
  });

  test("no --split → split:false", () => {
    expect(parseSaveFlags(["fix", "bug"])).toEqual({
      split: false,
      messageArgs: ["fix", "bug"],
    });
  });

  test("empty args → no flag, no message", () => {
    expect(parseSaveFlags([])).toEqual({ split: false, messageArgs: [] });
  });
});

// ---------------------------------------------------------------------------
// splitMessages
// ---------------------------------------------------------------------------

describe("splitMessages", () => {
  test("user message is tagged with [public] / [private]", () => {
    const r = splitMessages("fix login bug", "auto-pub", "auto-priv");
    expect(r).toEqual({
      publicMessage: "fix login bug [public]",
      privateMessage: "fix login bug [private]",
    });
  });

  test("empty/whitespace user message falls back to autos", () => {
    expect(splitMessages(null, "A", "B"))
      .toEqual({ publicMessage: "A", privateMessage: "B" });
    expect(splitMessages("   ", "A", "B"))
      .toEqual({ publicMessage: "A", privateMessage: "B" });
  });
});

// ---------------------------------------------------------------------------
// autoSplitSave orchestration
// ---------------------------------------------------------------------------

describe("autoSplitSave", () => {
  function mockEngine({
    splitOk = true, describeOk = true, newOk = true,
    setMainOk = true, setPrivOk = true,
  } = {}) {
    const calls = [];
    return {
      split: async (opts) => {
        calls.push({ op: "split", ...opts });
        return splitOk ? { ok: true, data: "" } : { ok: false, error: "split boom" };
      },
      _rawDescribe: async (target, message) => {
        calls.push({ op: "describe", target, message });
        return describeOk ? { ok: true, data: "" } : { ok: false, error: "describe boom" };
      },
      newChange: async () => {
        calls.push({ op: "new" });
        return newOk ? { ok: true, data: "" } : { ok: false, error: "new boom" };
      },
      setBookmark: async (name, target) => {
        calls.push({ op: "setBookmark", name, target });
        if (name === PUBLIC_BOOKMARK && !setMainOk) return { ok: false, error: "main boom" };
        if (name === PRIVATE_BOOKMARK && !setPrivOk) return { ok: false, error: "priv boom" };
        return { ok: true, data: {} };
      },
      _calls: calls,
    };
  }

  function plan(overrides = {}) {
    return {
      publicFiles: [{ kind: "modified", path: "src/a.js" }],
      privateFiles: [{ kind: "modified", path: "user-voice.md" }],
      publicMessage: "public: fix",
      privateMessage: "private: log",
      ...overrides,
    };
  }

  test("happy path runs split → describe → new → set main @-- → set _private @-", async () => {
    const engine = mockEngine();
    const r = await autoSplitSave(engine, plan());
    expect(r.ok).toBe(true);

    const ops = engine._calls.map((c) => c.op);
    expect(ops).toEqual(["split", "describe", "new", "setBookmark", "setBookmark"]);

    const splitCall = engine._calls.find((c) => c.op === "split");
    expect(splitCall.paths).toEqual(["src/a.js"]);
    expect(splitCall.message).toBe("public: fix");

    const descCall = engine._calls.find((c) => c.op === "describe");
    expect(descCall.target).toBe("@");
    expect(descCall.message).toBe("private: log");

    const bookmarkCalls = engine._calls.filter((c) => c.op === "setBookmark");
    expect(bookmarkCalls[0]).toEqual({ op: "setBookmark", name: PUBLIC_BOOKMARK, target: "@--" });
    expect(bookmarkCalls[1]).toEqual({ op: "setBookmark", name: PRIVATE_BOOKMARK, target: "@-" });
  });

  test("fails fast on empty public paths (precondition)", async () => {
    const engine = mockEngine();
    const r = await autoSplitSave(engine, plan({ publicFiles: [] }));
    expect(r.ok).toBe(false);
    expect(r.stage).toBe("precondition");
    expect(engine._calls).toHaveLength(0);
  });

  test("fails fast on empty private paths (precondition)", async () => {
    const engine = mockEngine();
    const r = await autoSplitSave(engine, plan({ privateFiles: [] }));
    expect(r.ok).toBe(false);
    expect(r.stage).toBe("precondition");
  });

  test("split failure stops the pipeline", async () => {
    const engine = mockEngine({ splitOk: false });
    const r = await autoSplitSave(engine, plan());
    expect(r.ok).toBe(false);
    expect(r.stage).toBe("split");
    expect(engine._calls.map((c) => c.op)).toEqual(["split"]);
  });

  test("describe failure stops after split", async () => {
    const engine = mockEngine({ describeOk: false });
    const r = await autoSplitSave(engine, plan());
    expect(r.ok).toBe(false);
    expect(r.stage).toBe("describe");
  });

  test("new failure stops after describe", async () => {
    const engine = mockEngine({ newOk: false });
    const r = await autoSplitSave(engine, plan());
    expect(r.ok).toBe(false);
    expect(r.stage).toBe("new");
  });

  test("per-bookmark set failure is surfaced but pipeline returns ok", async () => {
    const engine = mockEngine({ setPrivOk: false });
    const r = await autoSplitSave(engine, plan());
    expect(r.ok).toBe(true);
    expect(r.bookmarkMoves[0].ok).toBe(true);
    expect(r.bookmarkMoves[1].ok).toBe(false);
    expect(r.bookmarkMoves[1].error).toBe("priv boom");
  });
});

// ---------------------------------------------------------------------------
// save --split end-to-end
// ---------------------------------------------------------------------------

describe("save --split end-to-end", () => {
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

  function fullMockEngine() {
    const calls = [];
    return {
      status: async () => ({ ok: true, data: { raw: "M src/main.js\nM user-voice.md\n" } }),
      split: async (o) => { calls.push({ op: "split", ...o }); return { ok: true, data: "" }; },
      _rawDescribe: async (t, m) => { calls.push({ op: "describe", target: t, message: m }); return { ok: true, data: "" }; },
      newChange: async () => { calls.push({ op: "new" }); return { ok: true, data: "" }; },
      setBookmark: async (n, t) => { calls.push({ op: "setBookmark", name: n, target: t }); return { ok: true, data: {} }; },
      _calls: calls,
    };
  }

  test("mixed WC without --split: refuses with split hint", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    const engine = fullMockEngine();
    try {
      await save(["fix"], { cwd: repoRoot, engine });
    } catch (e) { /* exit */ }
    expect(exitCode).toBe(1);
    expect(stderr()).toMatch(/giti save --split/);
    // None of the split operations should have run.
    expect(engine._calls.filter((c) => c.op === "split")).toHaveLength(0);
  });

  test("mixed WC with --split: runs full pipeline, reports two commits", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    const engine = fullMockEngine();
    await save(["fix", "login", "--split"], { cwd: repoRoot, engine });
    expect(exitCode).toBe(null);
    expect(stdout()).toMatch(/Saved 2 commits/);
    expect(stdout()).toMatch(/public : fix login \[public\]/);
    expect(stdout()).toMatch(/private: fix login \[private\]/);

    const splitCall = engine._calls.find((c) => c.op === "split");
    expect(splitCall.paths).toEqual(["src/main.js"]);
    expect(splitCall.message).toBe("fix login [public]");
  });

  test("mixed WC with --split and no message: auto-generates per-bucket messages", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    const engine = fullMockEngine();
    await save(["--split"], { cwd: repoRoot, engine });
    expect(exitCode).toBe(null);
    // Public bucket is 1 modified file → "Update main.js"
    const splitCall = engine._calls.find((c) => c.op === "split");
    expect(splitCall.message).toMatch(/Update main\.js/);
    // Private bucket is 1 modified file → "Update user-voice.md"
    const descCall = engine._calls.find((c) => c.op === "describe");
    expect(descCall.message).toMatch(/Update user-voice\.md/);
  });

  test("non-mixed WC ignores --split (normal save runs)", async () => {
    const engine = {
      status: async () => ({ ok: true, data: { raw: "M src/main.js\n" } }),
      save: async (m) => ({ ok: true, data: { description: m, changeId: "abc" } }),
      setBookmark: async () => ({ ok: true, data: {} }),
    };
    await save(["--split", "fix"], { cwd: repoRoot, engine });
    expect(exitCode).toBe(null);
    expect(stdout()).toMatch(/Saved: fix/);
  });
});

// ---------------------------------------------------------------------------
// `giti private status`
// ---------------------------------------------------------------------------

describe("giti private status", () => {
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

  test("empty status", async () => {
    const engine = { status: async () => ({ ok: true, data: { raw: "" } }) };
    await private_(["status"], { cwd: repoRoot, engine });
    expect(stdout()).toMatch(/No changes/);
  });

  test("all-public status", async () => {
    const engine = { status: async () => ({ ok: true, data: { raw: "M src/a.js\nA src/b.js\n" } }) };
    await private_(["status"], { cwd: repoRoot, engine });
    expect(stdout()).toMatch(/Public changes:/);
    expect(stdout()).toMatch(/modified\s+src\/a\.js/);
    expect(stdout()).toMatch(/added\s+src\/b\.js/);
    expect(stdout()).not.toMatch(/Private changes:/);
    expect(stdout()).toMatch(/advance both main and private bookmarks/);
  });

  test("all-private status", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    const engine = { status: async () => ({ ok: true, data: { raw: "M user-voice.md\n" } }) };
    await private_(["status"], { cwd: repoRoot, engine });
    expect(stdout()).not.toMatch(/Public changes:/);
    expect(stdout()).toMatch(/Private changes:/);
    expect(stdout()).toMatch(/user-voice\.md/);
    expect(stdout()).toMatch(/advance the private bookmark only/);
  });

  test("mixed status shows both buckets and the split hint", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    const engine = { status: async () => ({ ok: true, data: { raw: "M src/a.js\nM user-voice.md\n" } }) };
    await private_(["status"], { cwd: repoRoot, engine });
    expect(stdout()).toMatch(/Public changes:/);
    expect(stdout()).toMatch(/Private changes:/);
    expect(stdout()).toMatch(/giti save --split/);
  });
});
