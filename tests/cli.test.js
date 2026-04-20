/**
 * giti jj-cli engine — unit + integration tests
 *
 * These tests mock Bun.spawn so they run without jj installed.
 * They cover: error handling, output parsing, new methods (conflicts, diff, land),
 * and the friendlyError mapping.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { JjCliEngine, friendlyError } from "../src/engine/jj-cli.js";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/**
 * Create a mock spawn function that returns predetermined results.
 * Each call consumes the next entry in the `calls` array.
 * If `calls` is exhausted, returns a default success with empty output.
 */
function mockSpawn(calls) {
  let callIndex = 0;
  const recorded = [];

  const spawn = (cmd, opts) => {
    recorded.push({ cmd: [...cmd], opts: { ...opts } });
    const entry = calls[callIndex++] || { stdout: "", stderr: "", exitCode: 0 };
    return {
      stdout: new Response(entry.stdout || "").body,
      stderr: new Response(entry.stderr || "").body,
      exited: Promise.resolve(entry.exitCode ?? 0),
    };
  };

  spawn.recorded = recorded;
  return spawn;
}

/**
 * Create a mock spawn that always throws (simulates ENOENT / jj not installed).
 */
function mockSpawnNotInstalled() {
  return () => {
    const e = new Error("spawn jj ENOENT");
    e.code = "ENOENT";
    throw e;
  };
}

/**
 * Create a mock spawn that throws a generic error.
 */
function mockSpawnGenericError(message) {
  return () => {
    throw new Error(message || "something broke");
  };
}

// ---------------------------------------------------------------------------
// friendlyError mapping
// ---------------------------------------------------------------------------

describe("friendlyError", () => {
  test("maps conflict stderr to friendly message", () => {
    const msg = friendlyError("error: Some conflict in file.txt");
    expect(msg).toContain("Merge conflict detected");
    expect(msg).toContain("giti status");
  });

  test("maps 'no changes' to friendly message", () => {
    const msg = friendlyError("No changes to commit.");
    expect(msg).toContain("Nothing to save");
  });

  test("maps bookmark already exists", () => {
    const msg = friendlyError('Error: bookmark "feature" already exists');
    expect(msg).toContain("already exists");
    expect(msg).toContain("feature");
  });

  test("maps bookmark not found", () => {
    const msg = friendlyError("Error: No such bookmark 'feature'");
    expect(msg).toContain("does not exist");
    expect(msg).toContain("giti branches");
  });

  test("maps revision not found", () => {
    const msg = friendlyError("Error: Revset 'abc123' resolved to no revisions");
    expect(msg).toContain("No context called");
    expect(msg).toContain("giti history");
  });

  test("maps auth failure", () => {
    const msg = friendlyError("Error: authentication required");
    expect(msg).toContain("Could not connect to the remote");
  });

  test("maps permission denied", () => {
    const msg = friendlyError("Error: Permission denied (publickey).");
    expect(msg).toContain("Could not connect to the remote");
  });

  test("returns raw message for unrecognized stderr", () => {
    const msg = friendlyError("some weird jj error");
    expect(msg).toBe("some weird jj error");
  });

  test("truncates very long messages", () => {
    const long = "x".repeat(500);
    const msg = friendlyError(long);
    expect(msg.length).toBeLessThanOrEqual(300);
    expect(msg).toEndWith("...");
  });

  test("handles empty stderr", () => {
    const msg = friendlyError("");
    expect(msg).toBe("An unknown error occurred.");
  });
});

// ---------------------------------------------------------------------------
// ENOENT — jj not installed
// ---------------------------------------------------------------------------

describe("jj not installed", () => {
  test("init returns friendly install message", async () => {
    const engine = new JjCliEngine("/tmp/test", { spawn: mockSpawnNotInstalled() });
    const result = await engine.init();
    expect(result.ok).toBe(false);
    expect(result.error).toContain("not installed");
    expect(result.error).toContain("https://martinvonz.github.io/jj/");
  });

  test("save returns friendly install message", async () => {
    const engine = new JjCliEngine("/tmp/test", { spawn: mockSpawnNotInstalled() });
    const result = await engine.save("test");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("not installed");
  });

  test("status returns friendly install message", async () => {
    const engine = new JjCliEngine("/tmp/test", { spawn: mockSpawnNotInstalled() });
    const result = await engine.status();
    expect(result.ok).toBe(false);
    expect(result.error).toContain("not installed");
  });
});

// ---------------------------------------------------------------------------
// Generic spawn errors
// ---------------------------------------------------------------------------

describe("generic spawn errors", () => {
  test("propagates error message", async () => {
    const engine = new JjCliEngine("/tmp/test", {
      spawn: mockSpawnGenericError("disk full"),
    });
    const result = await engine.init();
    expect(result.ok).toBe(false);
    expect(result.error).toBe("disk full");
  });
});

// ---------------------------------------------------------------------------
// Non-zero exit code
// ---------------------------------------------------------------------------

describe("non-zero exit code", () => {
  test("returns friendly error from stderr", async () => {
    const spawn = mockSpawn([
      { stdout: "", stderr: "Error: No such bookmark 'oops'", exitCode: 1 },
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.createBranch("oops");
    // Should not crash — returns err result
    expect(result.ok).toBe(false);
    expect(result.error).toContain("does not exist");
  });

  test("handles empty stderr with non-zero exit", async () => {
    const spawn = mockSpawn([
      { stdout: "", stderr: "", exitCode: 42 },
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.undo();
    expect(result.ok).toBe(false);
    expect(result.error).toBe("An unknown error occurred.");
  });
});

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

describe("init", () => {
  test("calls jj init --git and returns path", async () => {
    const spawn = mockSpawn([
      { stdout: "Initialized repo in /tmp/test\n", exitCode: 0 },
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.init();
    expect(result.ok).toBe(true);
    expect(result.data.path).toBe("/tmp/test");
    expect(spawn.recorded[0].cmd).toEqual(["jj", "git", "init"]);
  });

  test("init with explicit path overrides repoPath", async () => {
    const spawn = mockSpawn([
      { stdout: "Initialized repo\n", exitCode: 0 },
    ]);
    const engine = new JjCliEngine("/tmp/default", { spawn });
    const result = await engine.init("/tmp/explicit");
    expect(result.ok).toBe(true);
    expect(result.data.path).toBe("/tmp/explicit");
    expect(spawn.recorded[0].opts.cwd).toBe("/tmp/explicit");
  });
});

// ---------------------------------------------------------------------------
// save
// ---------------------------------------------------------------------------

describe("save", () => {
  test("calls describe then new then log", async () => {
    const spawn = mockSpawn([
      { stdout: "", exitCode: 0 },                         // describe
      { stdout: "", exitCode: 0 },                         // new
      { stdout: "abc123def456\n", exitCode: 0 },           // log
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.save("my save");
    expect(result.ok).toBe(true);
    expect(result.data.changeId).toBe("abc123def456");
    expect(result.data.description).toBe("my save");

    // Verify command sequence
    expect(spawn.recorded[0].cmd).toContain("describe");
    expect(spawn.recorded[0].cmd).toContain("my save");
    expect(spawn.recorded[1].cmd).toContain("new");
    expect(spawn.recorded[2].cmd).toContain("log");
  });

  test("uses 'save' as default message", async () => {
    const spawn = mockSpawn([
      { stdout: "", exitCode: 0 },
      { stdout: "", exitCode: 0 },
      { stdout: "changeXYZ\n", exitCode: 0 },
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.save();
    expect(result.ok).toBe(true);
    expect(result.data.description).toBe("save");
    expect(spawn.recorded[0].cmd).toContain("save");
  });

  test("returns error if describe fails", async () => {
    const spawn = mockSpawn([
      { stderr: "No changes to commit.", exitCode: 1 },
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.save("test");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Nothing to save");
  });

  test("returns 'unknown' changeId if log fails", async () => {
    const spawn = mockSpawn([
      { stdout: "", exitCode: 0 },              // describe
      { stdout: "", exitCode: 0 },              // new
      { stderr: "log error", exitCode: 1 },     // log fails
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.save("test");
    expect(result.ok).toBe(true);
    expect(result.data.changeId).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// listBranches — output parsing
// ---------------------------------------------------------------------------

describe("listBranches", () => {
  test("parses branch list output", async () => {
    const output = [
      "main: abc123 some description",
      "feature: def456 (active) work in progress",
      "bugfix: 789abc fix the thing",
    ].join("\n");

    const spawn = mockSpawn([{ stdout: output, exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.listBranches();
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(result.data[0].name).toBe("main");
    expect(result.data[0].active).toBe(false);
    expect(result.data[1].name).toBe("feature");
    expect(result.data[1].active).toBe(true);
    expect(result.data[2].name).toBe("bugfix");
  });

  test("handles empty branch list", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.listBranches();
    expect(result.ok).toBe(true);
    expect(result.data).toEqual([]);
  });

  test("handles error from jj bookmark list", async () => {
    const spawn = mockSpawn([
      { stderr: "Error: not a jj repository", exitCode: 1 },
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.listBranches();
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// switchTo
// ---------------------------------------------------------------------------

describe("switchTo", () => {
  test("tries bookmark first, then change ID on failure", async () => {
    const spawn = mockSpawn([
      { stderr: "no such bookmark", exitCode: 1 },  // bookmark attempt fails
      { stdout: "Now editing abc", exitCode: 0 },   // change ID succeeds
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.switchTo("abc123");
    // The second call should succeed
    expect(spawn.recorded[0].cmd).toContain("bookmarks(abc123)");
    expect(spawn.recorded[1].cmd).toContain("abc123");
  });

  test("returns ok with name when bookmark found", async () => {
    const spawn = mockSpawn([
      { stdout: "Now editing feature", exitCode: 0 },
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.switchTo("feature");
    expect(result.ok).toBe(true);
    expect(result.data.name).toBe("feature");
  });
});

// ---------------------------------------------------------------------------
// createBranch
// ---------------------------------------------------------------------------

describe("createBranch", () => {
  test("creates bookmark and returns name", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.createBranch("my-feature");
    expect(result.ok).toBe(true);
    expect(result.data.name).toBe("my-feature");
    expect(spawn.recorded[0].cmd).toEqual(["jj", "bookmark", "create", "my-feature"]);
  });
});

// ---------------------------------------------------------------------------
// merge
// ---------------------------------------------------------------------------

describe("merge", () => {
  test("calls jj new with @ and bookmark revset (jj merge removed)", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.merge("feature");
    expect(result.ok).toBe(true);
    expect(result.data.merged).toBe("feature");
    // Should use `jj new @ bookmarks(feature)` not `jj merge`
    const cmd = spawn.recorded[0].cmd;
    expect(cmd).toContain("new");
    expect(cmd).not.toContain("merge");
    expect(cmd).toContain("@");
    expect(cmd).toContain("bookmarks(feature)");
  });
});

// ---------------------------------------------------------------------------
// undo
// ---------------------------------------------------------------------------

describe("undo", () => {
  test("calls jj undo", async () => {
    const spawn = mockSpawn([{ stdout: "Undid operation abc", exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.undo();
    expect(result.ok).toBe(true);
    expect(result.data.undone).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// history — output parsing
// ---------------------------------------------------------------------------

describe("history", () => {
  test("parses structured log output", async () => {
    const output = [
      "aaa111 | initial commit | Alice | 2 hours ago",
      "bbb222 | add feature | Bob | 5 minutes ago",
    ].join("\n");

    const spawn = mockSpawn([{ stdout: output, exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.history(5);
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(2);

    expect(result.data[0].changeId).toBe("aaa111");
    expect(result.data[0].description).toBe("initial commit");
    expect(result.data[0].author).toBe("Alice");
    expect(result.data[0].timestamp).toBe("2 hours ago");

    expect(result.data[1].changeId).toBe("bbb222");
    expect(result.data[1].description).toBe("add feature");
    expect(result.data[1].author).toBe("Bob");
    expect(result.data[1].timestamp).toBe("5 minutes ago");
  });

  test("passes limit to -n flag", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    await engine.history(25);
    expect(spawn.recorded[0].cmd).toContain("25");
  });

  test("defaults limit to 10", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    await engine.history();
    expect(spawn.recorded[0].cmd).toContain("10");
  });

  test("handles empty history", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.history();
    expect(result.ok).toBe(true);
    expect(result.data).toEqual([]);
  });

  test("handles lines with missing fields gracefully", async () => {
    const spawn = mockSpawn([
      { stdout: "abc123 | only description", exitCode: 0 },
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.history();
    expect(result.ok).toBe(true);
    expect(result.data[0].changeId).toBe("abc123");
    expect(result.data[0].description).toBe("only description");
    expect(result.data[0].author).toBe("");
    expect(result.data[0].timestamp).toBe("");
  });
});

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

describe("status", () => {
  test("returns raw status output", async () => {
    const statusOutput = "Working copy : abc123\nM src/main.js\nA src/new.js";
    const spawn = mockSpawn([{ stdout: statusOutput, exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.status();
    expect(result.ok).toBe(true);
    expect(result.data.raw).toBe(statusOutput);
  });
});

// ---------------------------------------------------------------------------
// conflicts (new method)
// ---------------------------------------------------------------------------

describe("conflicts", () => {
  test("detects conflicted files from status output", async () => {
    const statusOutput = [
      "Working copy : abc123",
      "C src/main.js",
      "C src/utils.js",
      "M src/clean.js",
    ].join("\n");

    const spawn = mockSpawn([{ stdout: statusOutput, exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.conflicts();
    expect(result.ok).toBe(true);
    expect(result.data.hasConflicts).toBe(true);
    expect(result.data.files).toEqual(["src/main.js", "src/utils.js"]);
  });

  test("returns no conflicts when clean", async () => {
    const statusOutput = "Working copy : abc123\nM src/main.js";
    const spawn = mockSpawn([{ stdout: statusOutput, exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.conflicts();
    expect(result.ok).toBe(true);
    expect(result.data.hasConflicts).toBe(false);
    expect(result.data.files).toEqual([]);
  });

  test("detects conflict from message even without file markers", async () => {
    const statusOutput = "There are unresolved conflicts in the working copy.";
    const spawn = mockSpawn([{ stdout: statusOutput, exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.conflicts();
    expect(result.ok).toBe(true);
    expect(result.data.hasConflicts).toBe(true);
    expect(result.data.files).toEqual([]); // message but no parsed files
  });

  test("propagates error from jj status", async () => {
    const spawn = mockSpawn([
      { stderr: "not a jj repo", exitCode: 1 },
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.conflicts();
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// diff (new method)
// ---------------------------------------------------------------------------

describe("diff", () => {
  test("returns raw diff output", async () => {
    const diffOutput = "--- a/file.js\n+++ b/file.js\n@@ -1 +1 @@\n-old\n+new";
    const spawn = mockSpawn([{ stdout: diffOutput, exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.diff();
    expect(result.ok).toBe(true);
    expect(result.data).toBe(diffOutput);
    expect(spawn.recorded[0].cmd).toEqual(["jj", "diff"]);
  });

  test("passes --from target when specified", async () => {
    const spawn = mockSpawn([{ stdout: "some diff", exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.diff("main");
    expect(result.ok).toBe(true);
    expect(spawn.recorded[0].cmd).toEqual(["jj", "diff", "--from", "main"]);
  });

  test("returns empty diff when no changes", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.diff();
    expect(result.ok).toBe(true);
    expect(result.data).toBe("");
  });
});

// ---------------------------------------------------------------------------
// land (new method)
// ---------------------------------------------------------------------------

describe("land", () => {
  test("moves main to bookmark and deletes source", async () => {
    const spawn = mockSpawn([
      { stdout: "", exitCode: 0 },   // bookmark set main --to bookmarks(feature)
      { stdout: "", exitCode: 0 },   // bookmark delete feature
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.land("feature");
    expect(result.ok).toBe(true);
    expect(result.data.landed).toBe("feature");
    expect(result.data.onto).toBe("main");

    // Verify commands
    expect(spawn.recorded[0].cmd).toEqual([
      "jj", "bookmark", "set", "main", "--to", "bookmarks(feature)",
    ]);
    expect(spawn.recorded[1].cmd).toEqual([
      "jj", "bookmark", "delete", "feature",
    ]);
  });

  test("lands onto custom target bookmark", async () => {
    const spawn = mockSpawn([
      { stdout: "", exitCode: 0 },
      { stdout: "", exitCode: 0 },
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.land("feature", { target: "develop" });
    expect(result.ok).toBe(true);
    expect(result.data.onto).toBe("develop");
    expect(spawn.recorded[0].cmd).toContain("develop");
  });

  test("skips cleanup when cleanup=false", async () => {
    const spawn = mockSpawn([
      { stdout: "", exitCode: 0 },   // bookmark set
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.land("feature", { cleanup: false });
    expect(result.ok).toBe(true);
    // Only one call — no delete
    expect(spawn.recorded).toHaveLength(1);
  });

  test("does not delete when landing onto self", async () => {
    const spawn = mockSpawn([
      { stdout: "", exitCode: 0 },   // bookmark set main --to bookmarks(main)
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.land("main");
    expect(result.ok).toBe(true);
    // Should not attempt delete when bookmark === target
    expect(spawn.recorded).toHaveLength(1);
  });

  test("returns error if move fails", async () => {
    const spawn = mockSpawn([
      { stderr: "Error: No such bookmark 'ghost'", exitCode: 1 },
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.land("ghost");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("does not exist");
  });

  test("succeeds even if delete fails (non-critical)", async () => {
    const spawn = mockSpawn([
      { stdout: "", exitCode: 0 },                           // bookmark set
      { stderr: "delete failed somehow", exitCode: 1 },      // delete fails
    ]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine.land("feature");
    expect(result.ok).toBe(true);
    expect(result.data.landed).toBe("feature");
  });
});

// ---------------------------------------------------------------------------
// _rawDescribe
// ---------------------------------------------------------------------------

describe("_rawDescribe", () => {
  test("passes target and message to jj describe", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine._rawDescribe("abc123", "new message");
    expect(result.ok).toBe(true);
    expect(spawn.recorded[0].cmd).toEqual([
      "jj", "describe", "abc123", "-m", "new message",
    ]);
  });
});

// ---------------------------------------------------------------------------
// _rawSync
// ---------------------------------------------------------------------------

describe("_rawSync", () => {
  test("fetch runs jj git fetch", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine._rawSync("fetch");
    expect(result.ok).toBe(true);
    expect(spawn.recorded[0].cmd).toEqual(["jj", "git", "fetch"]);
  });

  test("push runs jj git push", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine._rawSync("push");
    expect(result.ok).toBe(true);
    expect(spawn.recorded[0].cmd).toEqual(["jj", "git", "push"]);
  });

  test("unknown direction returns error", async () => {
    const spawn = mockSpawn([]);
    const engine = new JjCliEngine("/tmp/test", { spawn });
    const result = await engine._rawSync("yeet");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("unknown sync direction: yeet");
  });
});

// ---------------------------------------------------------------------------
// Constructor / repoPath
// ---------------------------------------------------------------------------

describe("constructor", () => {
  test("uses provided repoPath for all commands", async () => {
    const spawn = mockSpawn([{ stdout: "ok", exitCode: 0 }]);
    const engine = new JjCliEngine("/my/repo", { spawn });
    await engine.status();
    expect(spawn.recorded[0].opts.cwd).toBe("/my/repo");
  });
});

// ---------------------------------------------------------------------------
// New error catalog entries (spec §10.1)
// ---------------------------------------------------------------------------

describe("friendlyError — expanded catalog", () => {
  test("GIT-002: not a giti repository", () => {
    const msg = friendlyError("Error: There is no jj repo in this directory");
    expect(msg).toContain("not a giti project");
    expect(msg).toContain("giti init");
  });

  test("GIT-002: not a jj repo (alternate)", () => {
    const msg = friendlyError("Error: not a jj repo");
    expect(msg).toContain("not a giti project");
  });

  test("GIT-008: disk full", () => {
    const msg = friendlyError("Error: No space left on device");
    expect(msg).toContain("disk is out of space");
    expect(msg).toContain("giti save again");
  });

  test("GIT-009: no remote configured", () => {
    const msg = friendlyError("Error: No remote configured");
    expect(msg).toContain("No remote repository");
    expect(msg).toContain("giti remote add");
  });

  test("GIT-011: nothing to undo", () => {
    const msg = friendlyError("Error: Nothing to undo");
    expect(msg).toContain("beginning of your project's history");
  });

  test("GIT-012: merge into self", () => {
    const msg = friendlyError("Error: cannot merge into itself");
    expect(msg).toContain("Cannot merge a context into itself");
  });
});

// ---------------------------------------------------------------------------
// parseStatus — human-friendly status parsing
// ---------------------------------------------------------------------------

import { parseStatus, formatStatus } from "../src/commands/status.js";

describe("parseStatus", () => {
  test("parses modified files", () => {
    const raw = "Working copy : abc123\nM src/main.js\nM src/utils.js";
    const result = parseStatus(raw);
    expect(result.changed).toHaveLength(2);
    expect(result.changed[0]).toEqual({ kind: "modified", path: "src/main.js" });
    expect(result.changed[1]).toEqual({ kind: "modified", path: "src/utils.js" });
  });

  test("parses added files", () => {
    const raw = "A src/new.js";
    const result = parseStatus(raw);
    expect(result.changed).toHaveLength(1);
    expect(result.changed[0]).toEqual({ kind: "added", path: "src/new.js" });
  });

  test("parses deleted files", () => {
    const raw = "D src/old.js";
    const result = parseStatus(raw);
    expect(result.changed).toHaveLength(1);
    expect(result.changed[0]).toEqual({ kind: "deleted", path: "src/old.js" });
  });

  test("parses conflicted files", () => {
    const raw = "C src/conflict.js\nC src/other.js";
    const result = parseStatus(raw);
    expect(result.conflicts).toEqual(["src/conflict.js", "src/other.js"]);
  });

  test("parses bookmark from Working copy line", () => {
    const raw = "Working copy : abc123 feature-x\nM src/main.js";
    const result = parseStatus(raw);
    expect(result.bookmark).toBe("feature-x");
  });

  test("ignores (no description set) as bookmark", () => {
    const raw = "Working copy : abc123 (no description set)";
    const result = parseStatus(raw);
    expect(result.bookmark).toBeNull();
  });

  test("detects unresolved conflict message", () => {
    const raw = "There are unresolved conflicts";
    const result = parseStatus(raw);
    expect(result.hasConflictMessage).toBe(true);
  });

  test("returns empty data for clean state", () => {
    const raw = "Working copy : abc123";
    const result = parseStatus(raw);
    expect(result.changed).toEqual([]);
    expect(result.conflicts).toEqual([]);
    expect(result.hasConflictMessage).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatStatus — human-friendly output formatting
// ---------------------------------------------------------------------------

describe("formatStatus", () => {
  test("shows clean message when no changes or conflicts", () => {
    const output = formatStatus({ changed: [], conflicts: [], bookmark: null, hasConflictMessage: false });
    expect(output).toContain("Everything is clean.");
  });

  test("shows unsaved changes with file list", () => {
    const output = formatStatus({
      changed: [
        { kind: "modified", path: "src/main.js" },
        { kind: "added", path: "src/new.js" },
      ],
      conflicts: [],
      bookmark: null,
      hasConflictMessage: false,
    });
    expect(output).toContain("You have unsaved changes:");
    expect(output).toContain("modified: src/main.js");
    expect(output).toContain("new: src/new.js");
  });

  test("shows deleted files", () => {
    const output = formatStatus({
      changed: [{ kind: "deleted", path: "old.js" }],
      conflicts: [],
      bookmark: null,
      hasConflictMessage: false,
    });
    expect(output).toContain("deleted: old.js");
  });

  test("shows bookmark name", () => {
    const output = formatStatus({
      changed: [],
      conflicts: [],
      bookmark: "feature-x",
      hasConflictMessage: false,
    });
    expect(output).toContain("You're working on: feature-x");
  });

  test("shows conflict warning with file list", () => {
    const output = formatStatus({
      changed: [],
      conflicts: ["src/a.js", "src/b.js"],
      bookmark: null,
      hasConflictMessage: false,
    });
    expect(output).toContain("Conflicts in 2 files:");
    expect(output).toContain("src/a.js");
    expect(output).toContain("src/b.js");
    expect(output).toContain("Resolve these files then run `giti save`.");
  });

  test("shows conflict warning for single file", () => {
    const output = formatStatus({
      changed: [],
      conflicts: ["src/only.js"],
      bookmark: null,
      hasConflictMessage: false,
    });
    expect(output).toContain("Conflicts in 1 file:");
  });

  test("shows conflict from message even without files", () => {
    const output = formatStatus({
      changed: [],
      conflicts: [],
      bookmark: null,
      hasConflictMessage: true,
    });
    expect(output).toContain("Conflicts in some file");
    expect(output).toContain("Resolve these files");
  });
});

// ---------------------------------------------------------------------------
// generateMessage — auto-generated save messages
// ---------------------------------------------------------------------------

import { generateMessage } from "../src/commands/save.js";

describe("generateMessage", () => {
  test("returns 'save' when no files changed", () => {
    expect(generateMessage([])).toBe("save");
    expect(generateMessage(null)).toBe("save");
    expect(generateMessage(undefined)).toBe("save");
  });

  test("single modified file: 'Update filename'", () => {
    const msg = generateMessage([{ kind: "modified", path: "src/main.js" }]);
    expect(msg).toBe("Update main.js");
  });

  test("single added file: 'Add filename'", () => {
    const msg = generateMessage([{ kind: "added", path: "components/button.scrml" }]);
    expect(msg).toBe("Add button.scrml");
  });

  test("single deleted file: 'Remove filename'", () => {
    const msg = generateMessage([{ kind: "deleted", path: "old/legacy.js" }]);
    expect(msg).toBe("Remove legacy.js");
  });

  test("multiple modified files: 'update N files'", () => {
    const msg = generateMessage([
      { kind: "modified", path: "a.js" },
      { kind: "modified", path: "b.js" },
      { kind: "modified", path: "c.js" },
    ]);
    expect(msg).toContain("update 3");
    expect(msg).toContain("files");
  });

  test("mixed changes: 'add N, update N files'", () => {
    const msg = generateMessage([
      { kind: "added", path: "new.js" },
      { kind: "modified", path: "existing.js" },
      { kind: "deleted", path: "old.js" },
    ]);
    expect(msg).toContain("add 1");
    expect(msg).toContain("update 1");
    expect(msg).toContain("remove 1");
    expect(msg).toContain("files");
  });
});

// ---------------------------------------------------------------------------
// setBookmark / bookmarkExists / changedFilesInRange (slice 3 engine primitives)
// ---------------------------------------------------------------------------

describe("setBookmark", () => {
  test("moves an existing bookmark via `bookmark set --to`", async () => {
    const spawn = mockSpawn([
      { stdout: "", stderr: "", exitCode: 0 }, // bookmark set succeeds
    ]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.setBookmark("main", "@-");
    expect(r.ok).toBe(true);
    expect(r.data.created).toBeUndefined();
    expect(spawn.recorded[0].cmd).toContain("bookmark");
    expect(spawn.recorded[0].cmd).toContain("set");
    expect(spawn.recorded[0].cmd).toContain("--allow-backwards");
  });

  test("falls back to `bookmark create` when set fails", async () => {
    const spawn = mockSpawn([
      { stdout: "", stderr: "No bookmark exists with that name.", exitCode: 1 }, // set fails
      { stdout: "", stderr: "", exitCode: 0 }, // create succeeds
    ]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.setBookmark("_private", "@-");
    expect(r.ok).toBe(true);
    expect(r.data.created).toBe(true);
    expect(spawn.recorded[1].cmd).toContain("create");
  });

  test("returns an error when both set and create fail", async () => {
    const spawn = mockSpawn([
      { stdout: "", stderr: "no such bookmark", exitCode: 1 },
      { stdout: "", stderr: "disk is full or something", exitCode: 1 },
    ]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.setBookmark("main", "@-");
    expect(r.ok).toBe(false);
  });

  test("rejects empty name", async () => {
    const engine = new JjCliEngine("/repo", { spawn: mockSpawn([]) });
    const r = await engine.setBookmark("", "@-");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/name required/);
  });
});

describe("bookmarkExists", () => {
  test("true when `bookmark list NAME` prints output", async () => {
    const spawn = mockSpawn([{ stdout: "main: abcdef (behind by 0 commits)\n", exitCode: 0 }]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.bookmarkExists("main");
    expect(r.ok).toBe(true);
    expect(r.data).toBe(true);
  });

  test("false when `bookmark list NAME` output is empty", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.bookmarkExists("ghost");
    expect(r.data).toBe(false);
  });

  test("false when `bookmark list NAME` errors (treats as absent)", async () => {
    const spawn = mockSpawn([{ stdout: "", stderr: "no such bookmark", exitCode: 1 }]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.bookmarkExists("ghost");
    expect(r.data).toBe(false);
  });
});

describe("changedFilesInRange", () => {
  test("parses `jj diff --summary -r <range>` output", async () => {
    const spawn = mockSpawn([{
      stdout: "M src/main.js\nA docs/readme.md\nD old/thing.js\n",
      exitCode: 0,
    }]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.changedFilesInRange("main..@");
    expect(r.ok).toBe(true);
    expect(r.data).toEqual([
      { kind: "modified", path: "src/main.js" },
      { kind: "added", path: "docs/readme.md" },
      { kind: "deleted", path: "old/thing.js" },
    ]);
    expect(spawn.recorded[0].cmd).toContain("--summary");
  });

  test("empty output yields empty list", async () => {
    const spawn = mockSpawn([{ stdout: "", exitCode: 0 }]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.changedFilesInRange("main..@");
    expect(r.ok).toBe(true);
    expect(r.data).toEqual([]);
  });

  test("skips lines that do not match [MAD] path pattern", async () => {
    const spawn = mockSpawn([{
      stdout: "Summary:\nM src/a.js\n(some header line)\nA src/b.js\n",
      exitCode: 0,
    }]);
    const engine = new JjCliEngine("/repo", { spawn });
    const r = await engine.changedFilesInRange("main..@");
    expect(r.data.map((f) => f.path)).toEqual(["src/a.js", "src/b.js"]);
  });

  test("empty range yields error", async () => {
    const engine = new JjCliEngine("/repo", { spawn: mockSpawn([]) });
    const r = await engine.changedFilesInRange("");
    expect(r.ok).toBe(false);
  });
});
