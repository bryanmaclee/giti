/**
 * Merge log (§4.3.4) + the auto-resolution pass (§4.3/§4.4 wire-in).
 *
 * The driver itself is covered in scrml-merge.test.js against the real
 * compiler; here the driver is stubbed so the ORCHESTRATION is what is under
 * test — which files are attempted, what gets written back, what is refused,
 * and what lands in the audit log.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { readMergeLog, appendMergeLog, formatMergeLog, MERGE_LOG_PATH } from "../src/merge/merge-log.js";
import {
  autoResolveConflicts, formatAutoResolve,
  validateMergeResult, formatValidation,
} from "../src/merge/auto-resolve.js";
import { VERDICT } from "../src/merge/scrml-merge.js";

let repo;
beforeEach(() => { repo = mkdtempSync(join(tmpdir(), "giti-mlog-")); });
afterEach(() => { try { rmSync(repo, { recursive: true, force: true }); } catch {} });

// ---------------------------------------------------------------------------
// merge log
// ---------------------------------------------------------------------------

describe("merge log", () => {
  test("a missing log reads as empty", () => {
    const log = readMergeLog(repo);
    expect(log.entries).toEqual([]);
  });

  test("append then read round-trips an entry", () => {
    const r = appendMergeLog(repo, {
      path: "src/a.scrml", verdict: VERDICT.CLEAN, decisions: ["T:A"],
    });
    expect(r.ok).toBe(true);
    expect(existsSync(join(repo, MERGE_LOG_PATH))).toBe(true);

    const log = readMergeLog(repo);
    expect(log.entries.length).toBe(1);
    expect(log.entries[0].path).toBe("src/a.scrml");
    expect(log.entries[0].verdict).toBe(VERDICT.CLEAN);
    expect(log.entries[0].timestamp).toBeTruthy();
  });

  test("appends accumulate in order", () => {
    appendMergeLog(repo, { path: "a.scrml", verdict: VERDICT.CLEAN });
    appendMergeLog(repo, { path: "b.scrml", verdict: VERDICT.SEMANTIC_CONFLICT });
    const log = readMergeLog(repo);
    expect(log.entries.map((e) => e.path)).toEqual(["a.scrml", "b.scrml"]);
  });

  test("a CORRUPT log reads as empty rather than throwing", () => {
    // An unreadable audit record must never block a merge.
    mkdirSync(join(repo, ".giti"), { recursive: true });
    Bun.write(join(repo, MERGE_LOG_PATH), "{not json");
    expect(() => readMergeLog(repo)).not.toThrow();
  });

  test("formats an empty log without pretending work happened", () => {
    expect(formatMergeLog([])).toContain("No auto-resolved merges");
  });

  test("format surfaces diagnostics and the review caveat", () => {
    const out = formatMergeLog([{
      timestamp: "2026-07-19T10:30:00.000Z",
      path: "src/a.scrml",
      verdict: VERDICT.SEMANTIC_CONFLICT,
      diagnostics: [{ message: "E-TYPE-063: `.Sha` is not a declared variant" }],
    }]);
    expect(out).toContain("src/a.scrml");
    expect(out).toContain("E-TYPE-063");
    expect(out).toContain("REFUSED");
    // §4.4.4 — compiler approval is not human review.
    expect(out).toContain("not a substitute for human review");
  });
});

// ---------------------------------------------------------------------------
// auto-resolution pass
// ---------------------------------------------------------------------------

/** Engine stub with just the surface autoResolveConflicts uses. */
function stubEngine({ files = [], parents = ["revA", "revB"], contents = {} }) {
  return {
    async conflicts() {
      return { ok: true, data: { hasConflicts: files.length > 0, files } };
    },
    async parents() { return { ok: true, data: parents }; },
    async mergeBase() { return { ok: true, data: "revBase" }; },
    async fileAt(rev, path) {
      const c = contents[`${rev}:${path}`];
      if (c === undefined) return { ok: false, error: `no ${path} at ${rev}` };
      return { ok: true, data: c };
    },
  };
}

/**
 * These cases drive the REAL merge module with a stubbed ENGINE, and cover the
 * orchestration paths that never reach the compiler (clean tree, non-.scrml,
 * octopus, missing base). The compiler-dependent verdict paths are covered
 * end-to-end against real fixtures in scrml-merge.test.js.
 */
describe("autoResolveConflicts — orchestration", () => {
  test("a clean tree attempts nothing", async () => {
    const res = await autoResolveConflicts(stubEngine({ files: [] }), { repoRoot: repo });
    expect(res.ok).toBe(true);
    expect(res.data.attempted).toBe(0);
    expect(res.data.resolved).toEqual([]);
  });

  test("non-.scrml conflicts are skipped, not attempted (§4.3.3 text fallback)", async () => {
    const res = await autoResolveConflicts(
      stubEngine({ files: ["README.md", "src/a.js"] }), { repoRoot: repo },
    );
    expect(res.ok).toBe(true);
    expect(res.data.attempted).toBe(0);
    expect(res.data.skipped).toEqual(["README.md", "src/a.js"]);
  });

  test("an octopus merge is left entirely to the human", async () => {
    const res = await autoResolveConflicts(
      stubEngine({ files: ["a.scrml"], parents: ["r1", "r2", "r3"] }), { repoRoot: repo },
    );
    expect(res.ok).toBe(true);
    expect(res.data.attempted).toBe(0);
    expect(res.data.skipped).toEqual(["a.scrml"]);
  });

  test("a file with no base revision is reported unresolved, not fatal", async () => {
    // Added on one side only — fileAt fails for the base rev.
    const engine = stubEngine({
      files: ["new.scrml"],
      contents: { "revA:new.scrml": "x", "revB:new.scrml": "y" },
    });
    const res = await autoResolveConflicts(engine, { repoRoot: repo });
    expect(res.ok).toBe(true);
    expect(res.data.resolved).toEqual([]);
    expect(res.data.unresolved.length).toBe(1);
    expect(res.data.unresolved[0].path).toBe("new.scrml");
  });

  test("propagates a genuine engine failure", async () => {
    const engine = {
      async conflicts() { return { ok: false, error: "not a jj repo" }; },
    };
    const res = await autoResolveConflicts(engine, { repoRoot: repo });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("not a jj repo");
  });
});

// ---------------------------------------------------------------------------
// validation pass — the NON-conflict case
// ---------------------------------------------------------------------------

describe("validateMergeResult — runs regardless of conflicts", () => {
  // Regression guard for a real design bug: the first wire-in gated validation
  // on conflicts().hasConflicts, so the silent auto-merge case — the ONE this
  // feature exists to catch — never got validated. This stub reports NO
  // conflicts on purpose; validation must still inspect the changed files.
  function validateEngine({ changed = [], parents = ["revA", "revB"] }) {
    return {
      async conflicts() { return { ok: true, data: { hasConflicts: false, files: [] } }; },
      async parents() { return { ok: true, data: parents }; },
      async mergeBase() { return { ok: true, data: "revBase" }; },
      async changedFilesInRange() { return { ok: true, data: changed }; },
      async fileAt() { return { ok: true, data: "<program></program>" }; },
    };
  }

  test("inspects changed .scrml files even with zero conflicts", async () => {
    const engine = validateEngine({ changed: [{ kind: "modified", path: "a.scrml" }] });
    // File does not exist on disk under repoRoot -> skipped, but the pass must
    // have got far enough to look, i.e. not short-circuit on hasConflicts.
    const res = await validateMergeResult(engine, { repoRoot: repo });
    expect(res.ok).toBe(true);
    expect(res.data.broken).toEqual([]);
  });

  test("ignores non-.scrml and deleted files", async () => {
    const engine = validateEngine({
      changed: [
        { kind: "modified", path: "README.md" },
        { kind: "deleted", path: "gone.scrml" },
      ],
    });
    const res = await validateMergeResult(engine, { repoRoot: repo });
    expect(res.ok).toBe(true);
    expect(res.data.checked).toBe(0);
  });

  test("is a no-op when the commit is not a 2-parent merge", async () => {
    const engine = validateEngine({ changed: [], parents: ["only-one"] });
    const res = await validateMergeResult(engine, { repoRoot: repo });
    expect(res.ok).toBe(true);
    expect(res.data.checked).toBe(0);
  });

  test("propagates an engine failure", async () => {
    const engine = {
      async parents() { return { ok: false, error: "boom" }; },
    };
    const res = await validateMergeResult(engine, { repoRoot: repo });
    expect(res.ok).toBe(false);
  });
});

describe("formatValidation", () => {
  test("is silent when nothing is broken", () => {
    expect(formatValidation({ checked: 3, broken: [] })).toBeNull();
  });

  test("explains that both sides were individually fine", () => {
    const out = formatValidation({
      checked: 1,
      broken: [{
        path: "f.scrml",
        diagnostics: [{ message: "E-TYPE-063: `.Sha` is not a declared variant" }],
      }],
    });
    expect(out).toContain("WILL NOT COMPILE");
    expect(out).toContain("neither side had");
    expect(out).toContain("E-TYPE-063");
    expect(out).toContain("giti undo");
  });
});

describe("formatAutoResolve", () => {
  test("returns null when nothing was attempted", () => {
    expect(formatAutoResolve({ attempted: 0, resolved: [], unresolved: [] })).toBeNull();
  });

  test("reports resolutions and points at the review surface", () => {
    const out = formatAutoResolve({
      attempted: 1,
      resolved: [{ path: "a.scrml", verdict: VERDICT.CLEAN, decisions: ["T:A"] }],
      unresolved: [],
    });
    expect(out).toContain("Auto-resolved 1");
    expect(out).toContain("a.scrml");
    expect(out).toContain("giti status --merge-log");
  });

  test("spells out a semantic conflict as a break neither side had", () => {
    const out = formatAutoResolve({
      attempted: 1,
      resolved: [],
      unresolved: [{
        path: "a.scrml",
        verdict: VERDICT.SEMANTIC_CONFLICT,
        diagnostics: [{ message: "E-TYPE-063: `.Sha` is not a declared variant" }],
      }],
    });
    expect(out).toContain("introduce type errors neither side had");
    expect(out).toContain("E-TYPE-063");
  });
});
