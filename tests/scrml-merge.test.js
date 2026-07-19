/**
 * AST semantic merge (§4.3 v2) + compiler-validation gate (§4.4 v3).
 *
 * Two layers:
 *  1. structuralMerge — pure, compiler-free, hand-built blocks.
 *  2. mergeScrmlFile  — end-to-end against the REAL slice-4 fixtures, which is
 *     the only thing that proves the gate still separates a clean rename from a
 *     use-breaking one. Skipped if ../scrml is unavailable.
 */

import { describe, test, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  structuralMerge, mergeScrmlFile, VERDICT, isAccepted,
} from "../src/merge/scrml-merge.js";
import { resolveCompilerPath } from "../src/lib/resolve-compiler.js";

// ---------------------------------------------------------------------------
// Layer 1 — structural merge, no compiler
// ---------------------------------------------------------------------------

/** Minimal block: one entity occupying [start, end) of `src`. */
function block(name, start, end, members = [], kind = "type") {
  return {
    kind, name,
    span: { start, end },
    bodySpan: { start, end },
    members,
  };
}

describe("structuralMerge (pure)", () => {
  // "head\nTYPE1\ntail" — entity "TYPE1" at [5,10)
  const baseSrc = "head\nTYPE1\ntail";
  const blocks1 = [block("TYPE1", 5, 10)];

  test("takes the changed side when only A edits glue", () => {
    const aSrc = "head\nTYPE1\nTAIL-A";
    const res = structuralMerge(
      { base: baseSrc, a: aSrc, b: baseSrc },
      { base: blocks1, a: blocks1, b: blocks1 },
    );
    expect(res.conflict).toBeUndefined();
    expect(res.merged).toBe(aSrc);
    expect(res.decisions).toContain("glue#1:A");
  });

  // Editing the PREFIX shifts the entity, so side B's blocks must carry the
  // shifted span — "HEAD-B\n" is 7 chars, so TYPE1 sits at [7,12).
  const bPrefixSrc = "HEAD-B\nTYPE1\ntail";
  const blocksShifted = [block("TYPE1", 7, 12)];

  test("takes the changed side when only B edits glue", () => {
    const res = structuralMerge(
      { base: baseSrc, a: baseSrc, b: bPrefixSrc },
      { base: blocks1, a: blocks1, b: blocksShifted },
    );
    expect(res.merged).toBe(bPrefixSrc);
    expect(res.decisions).toContain("glue#0:B");
  });

  test("combines DISJOINT glue edits from both sides", () => {
    const aSrc = "head\nTYPE1\nTAIL-A";   // segment 1 (suffix — no shift)
    const res = structuralMerge(
      { base: baseSrc, a: aSrc, b: bPrefixSrc },
      { base: blocks1, a: blocks1, b: blocksShifted },
    );
    expect(res.conflict).toBeUndefined();
    expect(res.merged).toBe("HEAD-B\nTYPE1\nTAIL-A");
    expect(res.decisions).toEqual(expect.arrayContaining(["glue#0:B", "glue#1:A"]));
  });

  test("refuses a both-sides edit of the SAME glue segment", () => {
    const aSrc = "head\nTYPE1\nTAIL-A";
    const bSrc = "head\nTYPE1\nTAIL-B";
    const res = structuralMerge(
      { base: baseSrc, a: aSrc, b: bSrc },
      { base: blocks1, a: blocks1, b: blocks1 },
    );
    expect(res.merged).toBeUndefined();
    expect(res.conflict).toContain("BOTH sides");
  });

  test("resolves a single-sided entity edit", () => {
    const aSrc = "head\nTYPE2\ntail";
    const res = structuralMerge(
      { base: baseSrc, a: aSrc, b: baseSrc },
      { base: blocks1, a: [block("TYPE1", 5, 10)], b: blocks1 },
    );
    expect(res.merged).toBe(aSrc);
    expect(res.decisions).toContain("TYPE1:A");
  });

  test("refuses when an entity count differs (added/removed on a side)", () => {
    // The glue-count guard fires first here — an entity removal changes the
    // number of glue segments, so this never reaches the per-entity loop.
    const res = structuralMerge(
      { base: baseSrc, a: "head\ntail", b: baseSrc },
      { base: blocks1, a: [], b: blocks1 },
    );
    expect(res.merged).toBeUndefined();
    expect(res.conflict).toContain("segment count differs");
  });

  test("refuses when a base entity has no counterpart (renamed on a side)", () => {
    // Same entity COUNT, different key — this is the path that actually reaches
    // the per-entity "deleted on a side" guard.
    const res = structuralMerge(
      { base: baseSrc, a: "head\nTYPE2\ntail", b: baseSrc },
      { base: blocks1, a: [block("TYPE2", 5, 10)], b: blocks1 },
    );
    expect(res.conflict).toContain("deleted on a side");
  });

  test("member-merge combines fields added on both sides", () => {
    // base: "T{a}"  entity [0,5)  member "a" at [2,3)
    const b = "T{a}!";
    const bBlocks = [block("T", 0, 4, [{ name: "a", typeText: "int", span: { start: 2, end: 3 } }])];
    // A adds "b", B adds "c"
    const aSrc = "T{a,b}!";
    const aBlocks = [block("T", 0, 6, [
      { name: "a", typeText: "int", span: { start: 2, end: 3 } },
      { name: "b", typeText: "int", span: { start: 4, end: 5 } },
    ])];
    const bSrc = "T{a,c}!";
    const oBlocks = [block("T", 0, 6, [
      { name: "a", typeText: "int", span: { start: 2, end: 3 } },
      { name: "c", typeText: "int", span: { start: 4, end: 5 } },
    ])];

    const res = structuralMerge(
      { base: b, a: aSrc, b: bSrc },
      { base: bBlocks, a: aBlocks, b: oBlocks },
    );
    expect(res.conflict).toBeUndefined();
    expect(res.merged).toContain("b");
    expect(res.merged).toContain("c");
  });

  test("refuses when both sides add the same member with different types", () => {
    const b = "T{a}!";
    const bBlocks = [block("T", 0, 4, [{ name: "a", typeText: "int", span: { start: 2, end: 3 } }])];
    const mk = (t) => [block("T", 0, 6, [
      { name: "a", typeText: "int", span: { start: 2, end: 3 } },
      { name: "x", typeText: t, span: { start: 4, end: 5 } },
    ])];
    const res = structuralMerge(
      { base: b, a: "T{a,x}!", b: "T{a,x}!" },
      { base: bBlocks, a: mk("int"), b: mk("string") },
    );
    expect(res.conflict).toContain("different types");
  });
});

describe("VERDICT helpers", () => {
  test("only clean and accept-with-review are accepted", () => {
    expect(isAccepted(VERDICT.CLEAN)).toBe(true);
    expect(isAccepted(VERDICT.ACCEPT_WITH_REVIEW)).toBe(true);
    expect(isAccepted(VERDICT.SEMANTIC_CONFLICT)).toBe(false);
    expect(isAccepted(VERDICT.STRUCTURAL_CONFLICT)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Layer 2 — end-to-end against the real slice-4 fixtures
// ---------------------------------------------------------------------------

const FIXTURES = join(import.meta.dir, "..", "docs", "ast-merge", "prototype", "slice4-semdiff");
const compilerAvailable = resolveCompilerPath().ok && existsSync(FIXTURES);
const describeIf = compilerAvailable ? describe : describe.skip;

describeIf("mergeScrmlFile — §4.4 v3 gate (real fixtures, real compiler)", () => {
  const read = (f) => readFileSync(join(FIXTURES, f), "utf8");
  const base = () => read("base.scrml");
  const sideA = () => read("sideA.scrml");

  test("CLEAN: accepts a rename whose uses were updated", () => {
    const res = mergeScrmlFile({
      base: base(), sideA: sideA(), sideB: read("sideB-clean.scrml"), path: "base.scrml",
    });
    expect(res.ok).toBe(true);
    expect(isAccepted(res.data.verdict)).toBe(true);
    expect(res.data.diagnostics).toEqual([]);
    expect(typeof res.data.merged).toBe("string");
  });

  test("DANGLING: refuses a merge that introduces E-TYPE-063", () => {
    const res = mergeScrmlFile({
      base: base(), sideA: sideA(), sideB: read("sideB-dangling.scrml"), path: "base.scrml",
    });
    expect(res.ok).toBe(true);
    expect(res.data.verdict).toBe(VERDICT.SEMANTIC_CONFLICT);
    expect(res.data.diagnostics.length).toBeGreaterThan(0);
    // The signal that exists ONLY in the compiler — this is the whole thesis.
    const joined = JSON.stringify(res.data.diagnostics);
    expect(joined).toContain("E-TYPE-063");
  });

  test("a semantic conflict exposes NO merged text", () => {
    const res = mergeScrmlFile({
      base: base(), sideA: sideA(), sideB: read("sideB-dangling.scrml"),
    });
    // A caller that forgets to check the verdict must not be able to write it.
    expect(res.data.merged).toBeUndefined();
  });

  test("both sides individually compile — only the COMBINATION breaks", () => {
    // Guards the fixtures themselves: if either side stopped compiling, the
    // dangling test above would pass for the wrong reason.
    const selfMerge = mergeScrmlFile({
      base: base(), sideA: sideA(), sideB: base(),
    });
    expect(selfMerge.ok).toBe(true);
    expect(isAccepted(selfMerge.data.verdict)).toBe(true);
  });
});
