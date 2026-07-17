#!/usr/bin/env bun
// AST semantic merge — SLICE 4 prototype (giti §4.4 v3 — compiler-VALIDATED merge).
//
// Slices 1-3 are the SOUND-CONSERVATIVE consumer ceiling: they refuse every glue change
// and every removal/retype, so everything they ACCEPT is already type-safe. A consequence
// we proved in S18: a pure structural merger only ever needs #6 member-emission, never #6b.
//
// Slice 4 LOOSENS that ceiling — and shows why #6b is the primitive that makes the loosening
// safe. It accepts DISJOINT glue edits (per-segment 3-way combine — the flogence
// disjoint-block insight applied to glue / use-sites), which CAN silently combine into a
// type-broken file: side A renames enum variant `Sha`->`Digest` (+ updates its own use),
// side B independently introduces a use of the OLD name `.Sha` in a different segment. Each
// side compiles; the STRUCTURAL merge of the two does not.
//
// The loosening is sound ONLY because of the #6b `scrml semdiff` validation gate: after the
// structural merge produces candidate M, semdiff classifies base-vs-M and reports any
// merge-INTRODUCED diagnostic (`diagnostics.added`). That field is giti-spec §4.4 v3
// verbatim: "type errors introduced by the merge (not pre-existing) are flagged as semantic
// conflicts with full compiler-quality error messages."
//
// Measured boundary (S18, slice2-enum-merge-and-measured-boundary.md §3): at the member
// level a clean rename and a use-breaking rename are IDENTICAL (both read "Sha removed,
// Digest added"); members[] carries no use-site, so the consumer driver cannot separate
// them. The separating signal (E-TYPE-063) lives only in the compiler — semdiff exposes it.
//
// Usage: bun merge-driver-semdiff.mjs <base> <A> <B> [-o merged.scrml]
//   exit 0 = clean auto-accept (semdiff: cosmetic)
//   exit 1 = accept-with-review (semdiff: behavioral, but compiles)
//   exit 2 = SEMANTIC CONFLICT — the merge INTRODUCED a type error (semdiff diagnostics.added)
//   exit 3 = structural conflict (a region changed on both sides — out of slice, before semdiff)

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";

const COMPILER = new URL("../../../../../scrml/compiler/src/cli.js", import.meta.url).pathname;

// ---- #6 sidecar: top-level entity blocks (types) with tight spans -------------------------
function blocksOf(file) {
  const out = mkdtempSync(join(tmpdir(), "s4-ba-"));
  const r = Bun.spawnSync(["bun", COMPILER, "compile", file, "--emit-block-analysis", "-o", out]);
  if (r.exitCode !== 0)
    throw new Error(`${file} won't compile — cannot analyze\n${new TextDecoder().decode(r.stderr)}`);
  const sidecar = join(out, basename(file).replace(/\.scrml$/, "") + ".block-analysis.json");
  return (JSON.parse(readFileSync(sidecar, "utf8")).blocks ?? []).sort((x, y) => x.span.start - y.span.start);
}

const key = b => `${b.kind}::${b.name}`;
const match = (blocks, k) => blocks.find(b => key(b) === k) ?? null;
// tight whole-entity text: [span.start, bodySpan.end) — bodySpan trims trailing trivia
const entityText = (src, b) => src.slice(b.span.start, b.bodySpan.end);

// ---- unified member merge (struct fields OR enum variants — same shape since #6) ----------
// Add-only + name+type collision detect. Removals/retypes fall through (that is the #6b line).
function mergeMembers(baseSrc, aSrc, bSrc, be, ae, oe) {
  const nameMap = ms => new Map(ms.map(m => [m.name, m]));
  const [B, A, Bb] = [nameMap(be.members), nameMap(ae.members), nameMap(oe.members)];
  for (const m of be.members) {
    if (!A.has(m.name) || !Bb.has(m.name))
      return { conflict: `${be.name}: member '${m.name}' removed on a side — out of slice (rename/removal is the #6b line)` };
    if (A.get(m.name).typeText !== m.typeText || Bb.get(m.name).typeText !== m.typeText)
      return { conflict: `${be.name}: member '${m.name}' retyped on a side — needs #6b classification / human` };
  }
  const addedA = ae.members.filter(m => !B.has(m.name));
  const addedB = oe.members.filter(m => !B.has(m.name));
  for (const ma of addedA) {
    const mb = addedB.find(x => x.name === ma.name);
    if (mb && mb.typeText !== ma.typeText)
      return { conflict: `${be.name}: both sides add '${ma.name}' with different types (${ma.typeText || "()"} vs ${mb.typeText || "()"})` };
  }
  const seen = new Set(be.members.map(m => m.name));
  const added = [];
  for (const m of [...addedA, ...addedB]) if (!seen.has(m.name)) { seen.add(m.name); added.push(m); }
  if (added.length === 0) return { text: entityText(baseSrc, be) };
  const bm = be.members;
  const sep = bm.length >= 2 ? baseSrc.slice(bm[0].span.end, bm[1].span.start) : ", ";
  const addedFrom = m => (ae.members.includes(m) ? aSrc : bSrc);
  const insertAbs = Math.max(...bm.map(m => m.span.end));
  const insertLocal = insertAbs - be.span.start;
  const inserted = added.map(m => sep + addedFrom(m).slice(m.span.start, m.span.end)).join("");
  const baseText = entityText(baseSrc, be);
  return { text: baseText.slice(0, insertLocal) + inserted + baseText.slice(insertLocal) };
}

// ---- glue segmentation: the N+1 non-entity regions around N sorted entities ----------------
function glueSegments(src, blocks) {
  const segs = []; let cur = 0;
  for (const b of blocks) { segs.push(src.slice(cur, b.span.start)); cur = b.bodySpan.end; }
  segs.push(src.slice(cur));
  return segs;
}

// SLICE-4 CHANGE vs slice-3: glue is no longer "must agree" (blunt fall-through). Each glue
// segment is resolved per-region by who-changed — DISJOINT segment edits combine; a
// both-sides edit of the SAME segment is still a (sound) structural conflict. The soundness
// of combining disjoint segments is delegated to the semdiff gate below.
function resolveGlue(gBase, gA, gB) {
  if (gBase.length !== gA.length || gBase.length !== gB.length)
    return { conflict: "glue segment count differs (entity added/removed on a side) — out of slice" };
  const segs = [], decisions = [];
  for (let i = 0; i < gBase.length; i++) {
    const aCh = gA[i] !== gBase[i], bCh = gB[i] !== gBase[i];
    if (aCh && bCh && gA[i] !== gB[i])
      return { conflict: `glue segment ${i} changed on BOTH sides — out of slice` };
    segs.push(aCh ? gA[i] : bCh ? gB[i] : gBase[i]);
    if (aCh || bCh) decisions.push(`glue#${i}:${aCh ? "A" : "B"}`);
  }
  return { segs, decisions };
}

// ---- #6b validation gate: classify base-vs-M, surface merge-introduced diagnostics --------
function semdiff(baseFile, mergedFile) {
  const r = Bun.spawnSync(["bun", COMPILER, "semdiff", baseFile, mergedFile, "--json"]);
  let json = null;
  try { json = JSON.parse(new TextDecoder().decode(r.stdout)); } catch { /* leave null */ }
  return { exitCode: r.exitCode, json };
}

// ---- driver -------------------------------------------------------------------------------
function structuralMerge(baseFile, aFile, bFile) {
  const [bB, aB, oB] = [baseFile, aFile, bFile].map(blocksOf);
  const src = {
    base: readFileSync(baseFile, "utf8"), a: readFileSync(aFile, "utf8"), b: readFileSync(bFile, "utf8"),
  };

  // per-segment glue merge (was: strict must-agree guard)
  const g = resolveGlue(glueSegments(src.base, bB), glueSegments(src.a, aB), glueSegments(src.b, oB));
  if (g.conflict) return { conflict: g.conflict };

  // resolve each base entity by who-changed (sorted by span.start; same order as glue)
  const entTexts = [], decisions = [];
  for (const be of bB) {
    const ae = match(aB, key(be)), oe = match(oB, key(be));
    if (!ae || !oe) return { conflict: `entity '${be.name}' deleted on a side — out of slice` };
    const [tBase, tA, tB] = [entityText(src.base, be), entityText(src.a, ae), entityText(src.b, oe)];
    const aChanged = tA !== tBase, bChanged = tB !== tBase;
    let text, who;
    if (!aChanged && !bChanged) { text = tBase; who = "unchanged"; }
    else if (aChanged && !bChanged) { text = tA; who = "A"; }
    else if (bChanged && !aChanged) { text = tB; who = "B"; }
    else {
      if (be.kind !== "type") return { conflict: `entity '${be.name}' (${be.kind}) changed on BOTH sides — out of slice` };
      const m = mergeMembers(src.base, src.a, src.b, be, ae, oe);
      if (m.conflict) return m;
      text = m.text; who = "A+B (member-merge)";
    }
    entTexts.push(text);
    if (who !== "unchanged") decisions.push(`${be.name}:${who}`);
  }

  // reassemble: interleave resolved glue + resolved entities (glue[i] + entity[i] + ... + glue[N])
  let out = "";
  for (let i = 0; i < bB.length; i++) out += g.segs[i] + entTexts[i];
  out += g.segs[bB.length];
  return { merged: out, decisions: [...decisions, ...g.decisions] };
}

// ---- cli ----------------------------------------------------------------------------------
const args = Bun.argv.slice(2);
const [baseFile, aFile, bFile] = args.filter(x => !x.startsWith("-"));
const oIdx = args.indexOf("-o");
const outFile = oIdx >= 0 ? args[oIdx + 1] : null;
if (!baseFile || !aFile || !bFile) {
  console.error("usage: merge-driver-semdiff.mjs base A B [-o merged.scrml]");
  process.exit(3);
}

const res = structuralMerge(baseFile, aFile, bFile);
if (res.conflict) {
  console.error(`STRUCTURAL CONFLICT — ${res.conflict}`);
  process.exit(3);
}
console.error(`structural merge — combined: ${res.decisions.join(", ")}`);

// write M and run the #6b validation gate
const mFile = join(mkdtempSync(join(tmpdir(), "s4-m-")), "merged.scrml");
writeFileSync(mFile, res.merged);
if (outFile) { writeFileSync(outFile, res.merged); console.error(`wrote ${outFile}`); }

const sd = semdiff(baseFile, mFile);
const added = sd.json?.diagnostics?.added ?? [];
if (added.length > 0) {
  console.error(`\n✗ SEMANTIC CONFLICT — the merge introduced ${added.length} error(s) neither side had:`);
  for (const d of added) console.error(`    ${d.message}`);
  console.error(`  (§4.4 v3: type errors introduced by the merge, not pre-existing — surface for human resolution)`);
  process.exit(2);
}
if (sd.json?.verdict === "cosmetic") {
  console.error(`\n✓ CLEAN — semdiff: cosmetic (safe to auto-accept)`);
  process.exit(0);
}
console.error(`\n✓ ACCEPT-WITH-REVIEW — semdiff: behavioral but compiles (real change, no merge-introduced break)`);
process.exit(1);
