#!/usr/bin/env bun
// AST semantic merge — SLICE 2 prototype (giti §4.3, Approach-D consumer path).
//
// Slice 1 (../merge-driver.mjs) merged struct FIELD-adds, but had to RE-PARSE the
// struct body from span text (a hand-rolled flat-struct parser) because the shipping
// sidecar gave spans, not member structure. That re-parse "breaks down the moment
// real types appear" — the canonical payload-union enum. Oracle ask #6 closed that:
// `--emit-block-analysis` now emits `typeShape` + `members[]` (per-member + arg spans,
// absolute byte offsets) + a tight `bodySpan`.
//
// Slice 2 proves the payoff: enum VARIANT-add merge with the re-parse layer DROPPED.
// The driver consumes `members[]` directly and does splice-one-member VERBATIM
// (source.slice(member.span) — flogence sharpening #2), no scrml type-grammar re-impl.
//
// Scope (deliberately narrow — the enum analog of slice 1): a `.scrml` payload-union
// enum (`type X:enum`) where side A and side B each ADD disjoint variants. git
// text-merge conflicts (same brace region); this driver combines them. Variant
// removals / arg-retypes of a base variant / rename↔use / non-enum entities are OUT
// of the slice — detected and refused (honest fall-through). See LIMITS in README.
//
// Usage: bun merge-driver-enum.mjs <base> <A> <B> [-o merged.scrml]
//   exit 0 + merged file on clean merge; exit 1 + reason on genuine conflict.

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";

const COMPILER = new URL("../../../../../scrml/compiler/src/cli.js", import.meta.url).pathname;

// ---- block-analysis: compile a .scrml, return its blocks (members[] included) -------------
function blocksOf(file) {
  const out = mkdtempSync(join(tmpdir(), "ba-enum-"));
  const r = Bun.spawnSync(["bun", COMPILER, "compile", file, "--emit-block-analysis", "-o", out]);
  if (r.exitCode !== 0)
    throw new Error(`${file} won't compile — cannot analyze\n${new TextDecoder().decode(r.stderr)}`);
  const sidecar = join(out, basename(file).replace(/\.scrml$/, "") + ".block-analysis.json");
  return JSON.parse(readFileSync(sidecar, "utf8")).blocks ?? [];
}

// ---- entity matching: the enum both sides touched, by (kind, name) ------------------------
function enumEntity(blocks, name) {
  return blocks.find(b => b.kind === "type" && b.typeShape === "enum" && b.name === name) ?? null;
}

// ---- derive the member indent from the base source (whitespace before the 1st member) -----
function memberIndent(src, firstMemberStart) {
  const lineStart = src.lastIndexOf("\n", firstMemberStart - 1) + 1;
  return src.slice(lineStart, firstMemberStart);
}

// ---- 3-way variant merge — NO re-parse; keyed on members[] {name, typeText} ---------------
// collision iff same NEW variant name on both sides with a different typeText (arg-tuple).
// typeText (#6, flogence sharpening #3) is what lifts this from name-only to name+type:
// identical variant added on both sides => auto-resolvable, NOT a conflict.
function mergeVariants(base, a, b) {
  const byName = ms => new Map(ms.map(m => [m.name, m]));
  const [B, A, Bb] = [byName(base), byName(a), byName(b)];

  // base-variant removals / arg-retypes on a side => out of the v0 slice (honest refuse)
  for (const m of base) {
    if (!A.has(m.name) || !Bb.has(m.name))
      return { conflict: `variant '${m.name}' removed on one side — out of slice (fall through to text merge)` };
    if (A.get(m.name).typeText !== m.typeText || Bb.get(m.name).typeText !== m.typeText)
      return { conflict: `variant '${m.name}' arg-tuple retyped on a side — semantic conflict (needs #6b classification / human)` };
  }

  const addedA = a.filter(m => !B.has(m.name));
  const addedB = b.filter(m => !B.has(m.name));

  // both-sides-add-same-name: identical typeText auto-resolves; different typeText conflicts
  for (const va of addedA) {
    const vb = addedB.find(x => x.name === va.name);
    if (vb && vb.typeText !== va.typeText)
      return { conflict: `both sides add variant '${va.name}' with different arg-tuples (${va.typeText || "()"} vs ${vb.typeText || "()"})` };
  }

  const seen = new Set(base.map(m => m.name));
  const added = [];
  for (const m of [...addedA, ...addedB]) if (!seen.has(m.name)) { seen.add(m.name); added.push(m); }
  return { added }; // each `m` still carries its side + span for verbatim splice
}

// ---- driver -------------------------------------------------------------------------------
function mergeDriver(baseFile, aFile, bFile) {
  const [bBlocks, aBlocks, oBlocks] = [baseFile, aFile, bFile].map(blocksOf);
  const src = {
    base: readFileSync(baseFile, "utf8"),
    a: readFileSync(aFile, "utf8"),
    b: readFileSync(bFile, "utf8"),
  };

  const enums = bBlocks.filter(b => b.kind === "type" && b.typeShape === "enum");
  for (const be of enums) {
    const ae = enumEntity(aBlocks, be.name), oe = enumEntity(oBlocks, be.name);
    if (!ae || !oe) return { conflict: `enum '${be.name}' deleted on a side — out of slice` };

    const res = mergeVariants(be.members, ae.members, oe.members);
    if (res.conflict) return res;

    // splice-one-member VERBATIM: for each added variant, copy its exact source text
    // from its own side (source.slice(member.span)) — no scrml syntax reconstruction.
    // Insert after the last BASE member (before the enum's closing `}`), one per line.
    if (res.added.length === 0) return { merged: src.base, entity: be.name, variants: be.members.map(m => m.name) };

    const sideSrc = { [aFile]: src.a, [bFile]: src.b };
    const addedFrom = m => (ae.members.includes(m) ? src.a : src.b);
    const indent = memberIndent(src.base, be.members[0].span.start);
    const insertAt = Math.max(...be.members.map(m => m.span.end));
    const inserted = res.added
      .map(m => "\n" + indent + addedFrom(m).slice(m.span.start, m.span.end))
      .join("");

    const out = src.base.slice(0, insertAt) + inserted + src.base.slice(insertAt);
    return {
      merged: out,
      entity: be.name,
      variants: [...be.members.map(m => m.name), ...res.added.map(m => m.name)],
    };
  }
  return { conflict: "no enum entity found to merge" };
}

// ---- cli ----------------------------------------------------------------------------------
const args = Bun.argv.slice(2);
const [baseFile, aFile, bFile] = args.filter(x => !x.startsWith("-"));
const oIdx = args.indexOf("-o");
const outFile = oIdx >= 0 ? args[oIdx + 1] : null;
if (!baseFile || !aFile || !bFile) {
  console.error("usage: merge-driver-enum.mjs base A B [-o merged.scrml]");
  process.exit(2);
}

const res = mergeDriver(baseFile, aFile, bFile);
if (res.conflict) { console.error(`CONFLICT — ${res.conflict}`); process.exit(1); }
console.error(`clean merge: ${res.entity} { ${res.variants.join(", ")} }`);
if (outFile) { writeFileSync(outFile, res.merged); console.error(`wrote ${outFile}`); }
else process.stdout.write(res.merged);
