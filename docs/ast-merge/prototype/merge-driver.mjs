#!/usr/bin/env bun
// AST semantic merge — first-slice prototype (giti §4.3, Approach-D consumer path).
//
// Proves the §6-Q2 "consumer" shape: giti/flogence assemble the merged file from the
// scrml compiler's `--emit-block-analysis` sidecar of base/A/B — NO compiler --merge
// entrypoint needed for the state-type field-add case. What block-analysis gives us:
//   per top-level block { id, kind, name, span:{start,end,line,endLine}, reads, writes }
// The byte-precise span (start/end) lets us slice the exact entity text from each version.
//
// Scope (deliberately narrow — the §8 first slice): a `.scrml` state-type (`type X:struct`)
// where side A and side B each ADD disjoint fields. git text-merge conflicts (same line);
// this driver combines them. Modifications/removals/nested types/non-struct entities are
// out of the v0 slice — flagged, not handled (see LIMITS below).
//
// Usage: bun merge-driver.mjs <base.scrml> <sideA.scrml> <sideB.scrml> [-o merged.scrml]
//   exit 0 + write merged file on clean merge; exit 1 + reason on genuine conflict.

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";

const COMPILER = new URL("../../../../scrml/compiler/src/cli.js", import.meta.url).pathname;

// ---- block-analysis: compile a .scrml, return its blocks (with byte spans) ----------------
function blocksOf(file) {
  const out = mkdtempSync(join(tmpdir(), "ba-"));
  const r = Bun.spawnSync(["bun", COMPILER, "compile", file, "--emit-block-analysis", "-o", out]);
  const sidecar = join(out, basename(file).replace(/\.scrml$/, "") + ".block-analysis.json");
  if (r.exitCode !== 0) throw new Error(`${file} won't compile — cannot analyze`);
  return JSON.parse(readFileSync(sidecar, "utf8")).blocks ?? [];
}

// ---- entity matching: find the same top-level entity across base/A/B by (kind,name) -------
function entity(blocks, kind, name) {
  return blocks.find(b => b.kind === kind && b.name === name) ?? null;
}

// ---- parse a `type X:struct = { a: T, b: U }` span into an ordered field list -------------
// v0: flat struct bodies only (no nested braces). Returns { header, fields:[{name,type,raw}] }.
function parseStruct(text) {
  const open = text.indexOf("{"), close = text.lastIndexOf("}");
  if (open < 0 || close < 0) throw new Error(`not a struct body: ${text}`);
  const header = text.slice(0, open);                       // `type X:struct = `
  const body = text.slice(open + 1, close);
  if (/[{}]/.test(body)) throw new Error("nested struct — out of v0 slice scope");
  const fields = body.split(",").map(s => s.trim()).filter(Boolean).map(raw => {
    const i = raw.indexOf(":");
    return { name: raw.slice(0, i).trim(), type: raw.slice(i + 1).trim(), raw };
  });
  return { header, fields };
}

// ---- 3-way field merge: base + A's adds + B's adds; collision iff same new name, diff type -
function mergeFields(base, a, b) {
  const byName = fs => new Map(fs.map(f => [f.name, f]));
  const [B, A, Bb] = [byName(base), byName(a), byName(b)];
  // removals/type-changes are out of the v0 slice — detect and refuse (honest fall-through)
  for (const f of base) {
    if (!A.has(f.name) || !Bb.has(f.name))
      return { conflict: `field '${f.name}' removed on one side — out of v0 slice (fall through to text merge)` };
    if (A.get(f.name).type !== f.type && Bb.get(f.name).type !== f.type)
      return { conflict: `field '${f.name}' retyped on BOTH sides — semantic conflict (needs v3 type-diff / human)` };
  }
  const addedA = a.filter(f => !B.has(f.name));
  const addedB = b.filter(f => !B.has(f.name));
  // disjointness check: same new field name on both sides
  for (const fa of addedA) {
    const fb = addedB.find(x => x.name === fa.name);
    if (fb && fb.type !== fa.type)
      return { conflict: `both sides add field '${fa.name}' with different types (${fa.type} vs ${fb.type})` };
  }
  const seen = new Set(base.map(f => f.name));
  const merged = [...base];
  for (const f of [...addedA, ...addedB]) if (!seen.has(f.name)) { seen.add(f.name); merged.push(f); }
  return { merged };
}

// ---- driver -------------------------------------------------------------------------------
function mergeDriver(baseFile, aFile, bFile) {
  const [bBlocks, aBlocks, oBlocks] = [baseFile, aFile, bFile].map(blocksOf);
  const src = { base: readFileSync(baseFile, "utf8"), a: readFileSync(aFile, "utf8"), b: readFileSync(bFile, "utf8") };

  // find the entity that diverged (v0 slice: the single struct both sides touched)
  const structs = bBlocks.filter(b => b.kind === "type");
  for (const bs of structs) {
    const as = entity(aBlocks, "type", bs.name), os = entity(oBlocks, "type", bs.name);
    if (!as || !os) return { conflict: `entity '${bs.name}' deleted on a side — out of v0 slice` };
    const slice = (text, blk) => text.slice(blk.span.start, blk.span.end);
    const [pBase, pA, pB] = [parseStruct(slice(src.base, bs)), parseStruct(slice(src.a, as)), parseStruct(slice(src.b, os))];
    const res = mergeFields(pBase.fields, pA.fields, pB.fields);
    if (res.conflict) return res;
    // rebuild the merged struct + splice into the base file at the base entity's span.
    // NB: block-analysis span.end extends past the closing `}` into trailing trivia (the
    // `\n  <` before the next block), so we re-derive a TIGHT end at the struct's `}` to
    // avoid clobbering the following declaration. (Empirical finding — see LIMITS/§6.)
    const mergedText = `${pBase.header}{ ${res.merged.map(f => f.raw).join(", ")} }`;
    const tightEnd = bs.span.start + slice(src.base, bs).lastIndexOf("}") + 1;
    const out = src.base.slice(0, bs.span.start) + mergedText + src.base.slice(tightEnd);
    return { merged: out, entity: bs.name, fields: res.merged.map(f => f.name) };
  }
  return { conflict: "no struct entity found to merge" };
}

// ---- cli ----------------------------------------------------------------------------------
const [baseFile, aFile, bFile] = Bun.argv.slice(2).filter(x => !x.startsWith("-"));
const oIdx = Bun.argv.indexOf("-o");
const outFile = oIdx > 0 ? Bun.argv[oIdx + 1] : null;
if (!baseFile || !aFile || !bFile) { console.error("usage: merge-driver.mjs base A B [-o merged.scrml]"); process.exit(2); }

const res = mergeDriver(baseFile, aFile, bFile);
if (res.conflict) { console.error(`CONFLICT — ${res.conflict}`); process.exit(1); }
console.error(`clean merge: ${res.entity} { ${res.fields.join(", ")} }`);
if (outFile) { writeFileSync(outFile, res.merged); console.error(`wrote ${outFile}`); }
else process.stdout.write(res.merged);
