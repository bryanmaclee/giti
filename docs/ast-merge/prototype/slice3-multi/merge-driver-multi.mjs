#!/usr/bin/env bun
// AST semantic merge — SLICE 3 prototype (giti §4.3, Approach-D consumer path).
//
// Slices 1 & 2 merged a SINGLE diverged entity (struct field-add / enum variant-add).
// Slice 3 is the MULTI-ENTITY same-file case — the flogence disjoint-block scenario:
// side A edits entity E1, side B edits a DIFFERENT entity E2 in the same file. git
// text-merge CONFLICTS when the edits land on adjacent lines (or a side reflows), even
// though the entities are semantically independent. Entity-merge combines them.
//
// Generalization unlocked by #6: BOTH structs and enums now emit `members[]`
// ({name, typeText, span}), so the per-entity member-merge is ONE unified path —
// struct field-add and enum variant-add are the same code (`mergeMembers`).
//
// Approach: base is the frame. For each top-level entity, pick base/A/B by who-changed
// (whole-entity splice via [span.start, bodySpan.end) — bodySpan is the tight boundary).
// Only when the SAME entity changed on BOTH sides do we recurse into `mergeMembers`.
// Non-entity "glue" (markup/whitespace/cells) must be unchanged across base/A/B, else a
// side touched glue → out of slice → fall through (sound). Reassemble back-to-front so
// splices don't invalidate earlier offsets.
//
// Usage: bun merge-driver-multi.mjs <base> <A> <B> [-o merged.scrml]

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";

const COMPILER = new URL("../../../../../scrml/compiler/src/cli.js", import.meta.url).pathname;

function blocksOf(file) {
  const out = mkdtempSync(join(tmpdir(), "ba-multi-"));
  const r = Bun.spawnSync(["bun", COMPILER, "compile", file, "--emit-block-analysis", "-o", out]);
  if (r.exitCode !== 0)
    throw new Error(`${file} won't compile — cannot analyze\n${new TextDecoder().decode(r.stderr)}`);
  const sidecar = join(out, basename(file).replace(/\.scrml$/, "") + ".block-analysis.json");
  return JSON.parse(readFileSync(sidecar, "utf8")).blocks ?? [];
}

const key = b => `${b.kind}::${b.name}`;
const match = (blocks, k) => blocks.find(b => key(b) === k) ?? null;
// tight whole-entity text: [span.start, bodySpan.end) — bodySpan trims trailing trivia
const entityText = (src, b) => src.slice(b.span.start, b.bodySpan.end);

// ---- unified member merge (struct fields OR enum variants — same shape since #6) ----------
// Returns { text } (rebuilt entity, entity-local) or { conflict }. Add-only + name+type
// collision detect, identical to slice 2's core but shape-agnostic.
function mergeMembers(baseSrc, aSrc, bSrc, be, ae, oe) {
  const nameMap = ms => new Map(ms.map(m => [m.name, m]));
  const [B, A, Bb] = [nameMap(be.members), nameMap(ae.members), nameMap(oe.members)];
  for (const m of be.members) {
    if (!A.has(m.name) || !Bb.has(m.name))
      return { conflict: `${be.name}: member '${m.name}' removed on a side — out of slice` };
    if (A.get(m.name).typeText !== m.typeText || Bb.get(m.name).typeText !== m.typeText)
      return { conflict: `${be.name}: member '${m.name}' retyped on a side — needs #6b classification / human` };
  }
  const addedA = ae.members.filter(m => !B.has(m.name));
  const addedB = oe.members.filter(m => !B.has(m.name));
  for (const ma of addedA) {
    const mb = addedB.find(x => x.name === ma.name);
    if (mb && mb.typeText !== ma.typeText)
      return { conflict: `${be.name}: both sides add '${ma.name}' with different types (${ma.typeText||"()"} vs ${mb.typeText||"()"})` };
  }
  const seen = new Set(be.members.map(m => m.name));
  const added = [];
  for (const m of [...addedA, ...addedB]) if (!seen.has(m.name)) { seen.add(m.name); added.push(m); }
  if (added.length === 0) return { text: entityText(baseSrc, be) };

  // derive the base member separator (", " one-liner / "\n    " multi-line) from the first gap
  const bm = be.members;
  const sep = bm.length >= 2 ? baseSrc.slice(bm[0].span.end, bm[1].span.start) : ", ";
  const addedFrom = m => (ae.members.includes(m) ? aSrc : bSrc);
  const insertAbs = Math.max(...bm.map(m => m.span.end));       // after last base member (abs)
  const insertLocal = insertAbs - be.span.start;               // entity-local offset
  const inserted = added.map(m => sep + addedFrom(m).slice(m.span.start, m.span.end)).join("");
  const baseText = entityText(baseSrc, be);
  return { text: baseText.slice(0, insertLocal) + inserted + baseText.slice(insertLocal) };
}

// ---- glue check: the non-entity regions must agree across base/A/B ------------------------
function glueSegments(src, blocks) {
  const ents = [...blocks].sort((x, y) => x.span.start - y.span.start);
  const segs = []; let cur = 0;
  for (const b of ents) { segs.push(src.slice(cur, b.span.start)); cur = b.bodySpan.end; }
  segs.push(src.slice(cur));
  return segs;
}

// ---- driver -------------------------------------------------------------------------------
function mergeDriver(baseFile, aFile, bFile) {
  const [bB, aB, oB] = [baseFile, aFile, bFile].map(blocksOf);
  const src = { base: readFileSync(baseFile,"utf8"), a: readFileSync(aFile,"utf8"), b: readFileSync(bFile,"utf8") };

  // glue must be untouched on both sides (else a side edited markup/whitespace — out of slice)
  const [gBase, gA, gB] = [glueSegments(src.base, bB), glueSegments(src.a, aB), glueSegments(src.b, oB)];
  if (JSON.stringify(gBase) !== JSON.stringify(gA) || JSON.stringify(gBase) !== JSON.stringify(gB))
    return { conflict: "a side changed non-entity glue (markup/whitespace) — out of slice (fall through to text merge)" };

  // decide each base entity's resolved text
  const decisions = [];
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
      if (be.kind !== "type") return { conflict: `entity '${be.name}' (${be.kind}) changed on BOTH sides — non-type both-change out of slice` };
      const m = mergeMembers(src.base, src.a, src.b, be, ae, oe);
      if (m.conflict) return m;
      text = m.text; who = "A+B (member-merge)";
    }
    decisions.push({ be, text, who });
  }

  // reassemble: splice resolved entity texts into the base frame, back-to-front
  let out = src.base;
  for (const d of [...decisions].sort((x, y) => y.be.span.start - x.be.span.start))
    out = out.slice(0, d.be.span.start) + d.text + out.slice(d.be.bodySpan.end);

  return { merged: out, decisions: decisions.map(d => `${d.be.name}:${d.who}`) };
}

// ---- cli ----------------------------------------------------------------------------------
const args = Bun.argv.slice(2);
const [baseFile, aFile, bFile] = args.filter(x => !x.startsWith("-"));
const oIdx = args.indexOf("-o");
const outFile = oIdx >= 0 ? args[oIdx + 1] : null;
if (!baseFile || !aFile || !bFile) { console.error("usage: merge-driver-multi.mjs base A B [-o merged.scrml]"); process.exit(2); }

const res = mergeDriver(baseFile, aFile, bFile);
if (res.conflict) { console.error(`CONFLICT — ${res.conflict}`); process.exit(1); }
console.error(`clean merge — resolved: ${res.decisions.join(", ")}`);
if (outFile) { writeFileSync(outFile, res.merged); console.error(`wrote ${outFile}`); }
else process.stdout.write(res.merged);
