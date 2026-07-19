/**
 * `giti resolve` — argument parsing, side recovery, and the §4.1.3 structured
 * conflict view.
 */

import { describe, test, expect } from "bun:test";
import { parseResolveArgs } from "../src/commands/resolve.js";
import { getMergeContext, getConflictSides, hasConflictMarkers } from "../src/merge/sides.js";
import { buildConflictView, formatConflictView } from "../src/merge/conflict-view.js";

describe("parseResolveArgs", () => {
  test("no args means inspect everything", () => {
    expect(parseResolveArgs([])).toEqual({ action: null, file: null });
  });

  test("takes a single file", () => {
    expect(parseResolveArgs(["src/a.scrml"])).toEqual({ action: null, file: "src/a.scrml" });
  });

  test("takes an action flag", () => {
    expect(parseResolveArgs(["--accept-ours"]).action).toBe("--accept-ours");
    expect(parseResolveArgs(["--accept-theirs"]).action).toBe("--accept-theirs");
    expect(parseResolveArgs(["--keep-both"]).action).toBe("--keep-both");
  });

  test("combines a file and an action", () => {
    expect(parseResolveArgs(["a.scrml", "--keep-both"]))
      .toEqual({ action: "--keep-both", file: "a.scrml" });
  });

  test("rejects two conflicting actions rather than silently picking one", () => {
    const r = parseResolveArgs(["--accept-ours", "--accept-theirs"]);
    expect(r.error).toBeTruthy();
  });

  test("rejects an unknown option", () => {
    expect(parseResolveArgs(["--yolo"]).error).toContain("unknown option");
  });

  test("rejects more than one file", () => {
    expect(parseResolveArgs(["a.scrml", "b.scrml"]).error).toBeTruthy();
  });
});

describe("hasConflictMarkers", () => {
  test("detects a jj materialized conflict", () => {
    expect(hasConflictMarkers("<program>\n<<<<<<< conflict 1 of 1\nx\n")).toBe(true);
  });

  test("does not fire on ordinary source", () => {
    expect(hasConflictMarkers('<program>\n  <p>a < b</p>\n</program>')).toBe(false);
    // Prose mentioning the word, and comparison operators, must not trip it.
    expect(hasConflictMarkers("// resolve the conflict later\nif (a <<< b)")).toBe(false);
  });
});

describe("getMergeContext", () => {
  const engineWith = (parents) => ({
    async parents() { return { ok: true, data: parents }; },
    async mergeBase() { return { ok: true, data: "baseRev" }; },
  });

  test("resolves both parents and the base", async () => {
    const res = await getMergeContext(engineWith(["a", "b"]));
    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ isMerge: true, baseRev: "baseRev", revA: "a", revB: "b" });
  });

  test("a non-merge is a normal state, not an error", async () => {
    const res = await getMergeContext(engineWith(["only"]));
    expect(res.ok).toBe(true);
    expect(res.data.isMerge).toBe(false);
  });

  test("an octopus merge is reported as not-a-2-parent-merge", async () => {
    const res = await getMergeContext(engineWith(["a", "b", "c"]));
    expect(res.data.isMerge).toBe(false);
  });
});

describe("getConflictSides", () => {
  const ctx = { baseRev: "base", revA: "a", revB: "b" };

  test("maps revisions to base/ours/theirs", async () => {
    const engine = { async fileAt(rev) { return { ok: true, data: `content-${rev}` }; } };
    const res = await getConflictSides(engine, "f.scrml", ctx);
    expect(res.ok).toBe(true);
    expect(res.data).toEqual({
      base: "content-base", ours: "content-a", theirs: "content-b",
    });
  });

  test("reports a missing revision clearly", async () => {
    const engine = {
      async fileAt(rev) {
        return rev === "base" ? { ok: false, error: "no such path" } : { ok: true, data: "x" };
      },
    };
    const res = await getConflictSides(engine, "f.scrml", ctx);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("base revision");
  });

  test("a side that is ITSELF conflicted gets an actionable message", async () => {
    // §4.1.1 permits merging on top of an unresolved conflict, so this is a
    // real state. Regression guard: feeding markers to the compiler produced a
    // baffling unrelated tag-matching error.
    const engine = {
      async fileAt(rev) {
        return rev === "a"
          ? { ok: true, data: "<program>\n<<<<<<< conflict 1 of 1\n" }
          : { ok: true, data: "<program></program>" };
      },
    };
    const res = await getConflictSides(engine, "f.scrml", ctx);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("'ours' side");
    expect(res.error).toContain("itself unresolved");
  });
});

describe("conflict view (§4.1.3 structured format)", () => {
  const sides = {
    base: "a\nb\nc\n",
    ours: "a\nOURS\nc\n",
    theirs: "a\nTHEIRS\nc\n",
  };

  test("shows yours as a DIFF and theirs as CONTENT", () => {
    const view = buildConflictView("f.scrml", sides);
    expect(view.oursChangedLines).toBeGreaterThan(0);
    expect(view.theirs).toEqual(["a", "THEIRS", "c"]);

    const out = formatConflictView(view, ["Keep both", "Keep yours"]);
    expect(out).toContain("Base:");
    expect(out).toContain("Yours:");
    expect(out).toContain("Theirs:");
    expect(out).toContain("- b");
    expect(out).toContain("+ OURS");
    expect(out).toContain("| THEIRS");
    // Explicitly NOT git's markers (§4.1.3).
    expect(out).not.toContain("<<<<<<<");
    expect(out).not.toContain(">>>>>>>");
  });

  test("numbers the options", () => {
    const out = formatConflictView(buildConflictView("f.scrml", sides), ["Keep both", "Keep yours"]);
    expect(out).toContain("[1] Keep both");
    expect(out).toContain("[2] Keep yours");
  });

  test("recognises when both sides made the same change", () => {
    const view = buildConflictView("f.scrml", { base: "a\n", ours: "b\n", theirs: "b\n" });
    expect(view.identical).toBe(true);
    expect(formatConflictView(view)).toContain("same change");
  });

  test("condenses a large file to the changed region", () => {
    const big = Array.from({ length: 200 }, (_, i) => `line${i}`).join("\n") + "\n";
    const edited = big.replace("line100", "CHANGED");
    const view = buildConflictView("big.scrml", { base: big, ours: edited, theirs: big });
    // Context window, not all 200 lines.
    expect(view.oursDiff.length).toBeLessThan(20);
  });

  test("truncates a very long theirs rather than flooding the terminal", () => {
    const big = Array.from({ length: 200 }, (_, i) => `line${i}`).join("\n") + "\n";
    const out = formatConflictView(buildConflictView("big.scrml", {
      base: "a\n", ours: "b\n", theirs: big,
    }));
    expect(out).toContain("more line(s)");
  });
});
