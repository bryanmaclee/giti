/**
 * AST semantic merge for .scrml files — the §4.3 v2 entity merge plus the
 * §4.4 v3 compiler-validation gate.
 *
 * Productized from the slice-4 prototype (docs/ast-merge/prototype/slice4-semdiff/,
 * built + gate-verified S19). The prototype is retained as the research record;
 * this module is the product path. Behaviour is identical — what changes is the
 * interface: content in / verdict out, no filesystem inputs, no process.exit,
 * giti's ok/err result tuples, and giti's own compiler resolution.
 *
 * ---------------------------------------------------------------------------
 * Why this is worth having (measured, S19, and re-verified S20):
 *
 *   scenario                     git merge-file      this driver
 *   -------------------------    ----------------    -------------------------
 *   disjoint edits, type-safe    auto-merges         accepts
 *   rename + dangling old use    auto-merges SILENTLY,
 *                                shipping a file     catches E-TYPE-063,
 *                                that won't compile  refuses
 *
 * The separating signal lives ONLY in the compiler: at the member level a clean
 * rename and a use-breaking rename are byte-identical (both read "Sha removed,
 * Digest added"). `scrml semdiff` exposes it as `diagnostics.added` — errors the
 * MERGE introduced that neither side had. That field is giti-spec §4.4 v3
 * verbatim: "type errors introduced by the merge (not pre-existing)".
 * ---------------------------------------------------------------------------
 *
 * Spec ref: giti-spec-v1.md §4.3 (v2 AST merge), §4.4 (v3 compiler validation)
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";

import { ok, err } from "../lib/result.js";
import { resolveCompilerPath } from "../lib/resolve-compiler.js";

/**
 * Merge verdicts. Ordered least->most severe; `accepted` tells a caller whether
 * the merged text may be written to the working copy.
 */
export const VERDICT = {
  CLEAN: "clean",                            // semdiff: cosmetic — safe to auto-accept
  ACCEPT_WITH_REVIEW: "accept-with-review",  // behavioral but compiles
  SEMANTIC_CONFLICT: "semantic-conflict",    // the merge INTRODUCED type errors
  STRUCTURAL_CONFLICT: "structural-conflict",// out of slice; never reached the gate
};

export function isAccepted(verdict) {
  return verdict === VERDICT.CLEAN || verdict === VERDICT.ACCEPT_WITH_REVIEW;
}

// ---------------------------------------------------------------------------
// Entity model (#6 block-analysis sidecar)
// ---------------------------------------------------------------------------

const key = (b) => `${b.kind}::${b.name}`;
const matchBlock = (blocks, k) => blocks.find((b) => key(b) === k) ?? null;
// Tight whole-entity text: [span.start, bodySpan.end) — bodySpan trims trailing trivia.
const entityText = (src, b) => src.slice(b.span.start, b.bodySpan.end);

/**
 * Unified member merge — struct fields OR enum variants (one shape since #6).
 * Add-only, with name+type collision detection. Removals and retypes fall
 * through as conflicts: that is exactly the #6b line the member set cannot
 * resolve on its own.
 */
function mergeMembers(baseSrc, aSrc, bSrc, be, ae, oe) {
  const nameMap = (ms) => new Map(ms.map((m) => [m.name, m]));
  const B = nameMap(be.members);
  const A = nameMap(ae.members);
  const O = nameMap(oe.members);

  for (const m of be.members) {
    if (!A.has(m.name) || !O.has(m.name)) {
      return { conflict: `${be.name}: member '${m.name}' removed on a side — rename/removal needs compiler classification` };
    }
    if (A.get(m.name).typeText !== m.typeText || O.get(m.name).typeText !== m.typeText) {
      return { conflict: `${be.name}: member '${m.name}' retyped on a side — needs human resolution` };
    }
  }

  const addedA = ae.members.filter((m) => !B.has(m.name));
  const addedB = oe.members.filter((m) => !B.has(m.name));
  for (const ma of addedA) {
    const mb = addedB.find((x) => x.name === ma.name);
    if (mb && mb.typeText !== ma.typeText) {
      return { conflict: `${be.name}: both sides add '${ma.name}' with different types (${ma.typeText || "()"} vs ${mb.typeText || "()"})` };
    }
  }

  const seen = new Set(be.members.map((m) => m.name));
  const added = [];
  for (const m of [...addedA, ...addedB]) {
    if (!seen.has(m.name)) { seen.add(m.name); added.push(m); }
  }
  if (added.length === 0) return { text: entityText(baseSrc, be) };

  const bm = be.members;
  // Reuse the base file's own inter-member separator so the merged text keeps
  // the source's formatting rather than imposing a canonical one.
  const sep = bm.length >= 2 ? baseSrc.slice(bm[0].span.end, bm[1].span.start) : ", ";
  const addedFrom = (m) => (ae.members.includes(m) ? aSrc : bSrc);
  const insertAbs = Math.max(...bm.map((m) => m.span.end));
  const insertLocal = insertAbs - be.span.start;
  const inserted = added.map((m) => sep + addedFrom(m).slice(m.span.start, m.span.end)).join("");
  const baseText = entityText(baseSrc, be);
  return { text: baseText.slice(0, insertLocal) + inserted + baseText.slice(insertLocal) };
}

// ---------------------------------------------------------------------------
// Glue segmentation — the N+1 non-entity regions around N sorted entities
// ---------------------------------------------------------------------------

function glueSegments(src, blocks) {
  const segs = [];
  let cur = 0;
  for (const b of blocks) { segs.push(src.slice(cur, b.span.start)); cur = b.bodySpan.end; }
  segs.push(src.slice(cur));
  return segs;
}

/**
 * Resolve each glue segment by who-changed. DISJOINT segment edits combine; a
 * both-sides edit of the SAME segment is a (sound) structural conflict.
 *
 * Combining disjoint segments is what can silently produce a type-break — its
 * soundness is delegated entirely to the semdiff gate. Do not loosen this
 * without that gate in place.
 */
function resolveGlue(gBase, gA, gB) {
  if (gBase.length !== gA.length || gBase.length !== gB.length) {
    return { conflict: "glue segment count differs (entity added/removed on a side)" };
  }
  const segs = [];
  const decisions = [];
  for (let i = 0; i < gBase.length; i++) {
    const aCh = gA[i] !== gBase[i];
    const bCh = gB[i] !== gBase[i];
    if (aCh && bCh && gA[i] !== gB[i]) {
      return { conflict: `glue segment ${i} changed on BOTH sides` };
    }
    segs.push(aCh ? gA[i] : bCh ? gB[i] : gBase[i]);
    if (aCh || bCh) decisions.push(`glue#${i}:${aCh ? "A" : "B"}`);
  }
  return { segs, decisions };
}

// ---------------------------------------------------------------------------
// Compiler interaction
// ---------------------------------------------------------------------------

function runCompiler(compilerPath, args, spawnSync) {
  const spawn = spawnSync || Bun.spawnSync;
  const r = spawn(["bun", compilerPath, ...args]);
  const decode = (b) => (b ? new TextDecoder().decode(b) : "");
  return { exitCode: r.exitCode, stdout: decode(r.stdout), stderr: decode(r.stderr) };
}

/** Top-level entity blocks with tight spans, via the #6 block-analysis sidecar. */
function blocksOf(compilerPath, file, spawnSync) {
  const out = mkdtempSync(join(tmpdir(), "giti-ba-"));
  try {
    const r = runCompiler(compilerPath, ["compile", file, "--emit-block-analysis", "-o", out], spawnSync);
    if (r.exitCode !== 0) {
      return { error: `${basename(file)} does not compile — cannot analyze:\n${r.stderr}` };
    }
    const sidecar = join(out, basename(file).replace(/\.scrml$/, "") + ".block-analysis.json");
    const parsed = JSON.parse(readFileSync(sidecar, "utf8"));
    const blocks = (parsed.blocks ?? []).sort((x, y) => x.span.start - y.span.start);
    return { blocks };
  } catch (e) {
    return { error: `block analysis failed for ${basename(file)}: ${e.message}` };
  } finally {
    try { rmSync(out, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

/** §4.4 v3 validation gate — classify base-vs-M and surface introduced diagnostics. */
function semdiff(compilerPath, baseFile, mergedFile, spawnSync) {
  const r = runCompiler(compilerPath, ["semdiff", baseFile, mergedFile, "--json"], spawnSync);
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* non-JSON output — treated as unavailable */ }
  return { exitCode: r.exitCode, json };
}

// ---------------------------------------------------------------------------
// Structural merge (exported for direct testing without a compiler)
// ---------------------------------------------------------------------------

/**
 * Combine three sources given their entity blocks.
 * @returns {{ merged: string, decisions: string[] } | { conflict: string }}
 */
export function structuralMerge(src, blocks) {
  const { base: baseSrc, a: aSrc, b: bSrc } = src;
  const { base: bB, a: aB, b: oB } = blocks;

  const g = resolveGlue(
    glueSegments(baseSrc, bB), glueSegments(aSrc, aB), glueSegments(bSrc, oB)
  );
  if (g.conflict) return { conflict: g.conflict };

  const entTexts = [];
  const decisions = [];
  for (const be of bB) {
    const ae = matchBlock(aB, key(be));
    const oe = matchBlock(oB, key(be));
    if (!ae || !oe) return { conflict: `entity '${be.name}' deleted on a side` };

    const tBase = entityText(baseSrc, be);
    const tA = entityText(aSrc, ae);
    const tB = entityText(bSrc, oe);
    const aChanged = tA !== tBase;
    const bChanged = tB !== tBase;

    let text, who;
    if (!aChanged && !bChanged) { text = tBase; who = "unchanged"; }
    else if (aChanged && !bChanged) { text = tA; who = "A"; }
    else if (bChanged && !aChanged) { text = tB; who = "B"; }
    else {
      if (be.kind !== "type") {
        return { conflict: `entity '${be.name}' (${be.kind}) changed on BOTH sides` };
      }
      const m = mergeMembers(baseSrc, aSrc, bSrc, be, ae, oe);
      if (m.conflict) return m;
      text = m.text;
      who = "A+B (member-merge)";
    }
    entTexts.push(text);
    if (who !== "unchanged") decisions.push(`${be.name}:${who}`);
  }

  let out = "";
  for (let i = 0; i < bB.length; i++) out += g.segs[i] + entTexts[i];
  out += g.segs[bB.length];
  return { merged: out, decisions: [...decisions, ...g.decisions] };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Merge one conflicted .scrml file from its three whole-file sides.
 *
 * Inputs are CONTENT, not paths — they come from `engine.fileAt()`, since jj
 * materializes the working-copy file with conflict markers and the entity
 * merger needs three parseable sources.
 *
 * @param {object} args
 * @param {string} args.base   base (common ancestor) content
 * @param {string} args.sideA  our side
 * @param {string} args.sideB  their side
 * @param {string} [args.path] repo-relative path, for messages
 * @param {object} [args.deps] { compilerPath, spawnSync } injection for tests
 * @returns {{ ok: true, data: { verdict, merged?, decisions, diagnostics, reason? } }
 *          | { ok: false, error: string }}
 */
export function mergeScrmlFile({ base, sideA, sideB, path, deps }) {
  const d = deps || {};

  let compilerPath = d.compilerPath;
  if (!compilerPath) {
    const resolved = resolveCompilerPath();
    if (!resolved.ok) {
      return err(`AST merge needs the scrml compiler: ${resolved.error}`);
    }
    compilerPath = resolved.path;
  }

  const work = mkdtempSync(join(tmpdir(), "giti-merge-"));
  try {
    // The compiler takes files; write the three sides out under stable names.
    const files = {
      base: join(work, "base.scrml"),
      a: join(work, "sideA.scrml"),
      b: join(work, "sideB.scrml"),
    };
    writeFileSync(files.base, base);
    writeFileSync(files.a, sideA);
    writeFileSync(files.b, sideB);

    const blocks = {};
    for (const k of ["base", "a", "b"]) {
      const r = blocksOf(compilerPath, files[k], d.spawnSync);
      if (r.error) return err(r.error);
      blocks[k] = r.blocks;
    }

    const res = structuralMerge({ base, a: sideA, b: sideB }, blocks);
    if (res.conflict) {
      return ok({
        verdict: VERDICT.STRUCTURAL_CONFLICT,
        decisions: [],
        diagnostics: [],
        reason: res.conflict,
      });
    }

    // Write candidate M and run the §4.4 v3 gate.
    const mFile = join(work, "merged.scrml");
    writeFileSync(mFile, res.merged);
    const sd = semdiff(compilerPath, files.base, mFile, d.spawnSync);
    const added = sd.json?.diagnostics?.added ?? [];

    if (added.length > 0) {
      return ok({
        verdict: VERDICT.SEMANTIC_CONFLICT,
        decisions: res.decisions,
        diagnostics: added,
        reason: `the merge introduced ${added.length} error(s) neither side had`,
        // Deliberately NO `merged`: a semantic conflict must not be writable
        // by a caller that forgets to check the verdict.
      });
    }

    const verdict = sd.json?.verdict === "cosmetic"
      ? VERDICT.CLEAN
      : VERDICT.ACCEPT_WITH_REVIEW;

    return ok({ verdict, merged: res.merged, decisions: res.decisions, diagnostics: [] });
  } catch (e) {
    return err(`AST merge failed${path ? ` for ${path}` : ""}: ${e.message}`);
  } finally {
    try { rmSync(work, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}
