/**
 * Auto-resolution pass over a conflicted working copy (§4.3 + §4.4).
 *
 * Runs after the engine reports conflicts. For every conflicted `.scrml` file
 * it recovers the three whole-file sides by revision, runs the entity merge +
 * compiler-validation gate, and writes back only what the gate accepted.
 *
 * Non-.scrml files are left alone — spec §4.3.3 puts them on the text-merge
 * fallback, and giti has no tree-sitter layer yet (§4.3.2 is future work).
 *
 * Spec ref: giti-spec-v1.md §4.3 (v2 AST merge), §4.4 (v3 validation), §4.3.4 (log)
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { ok, err } from "../lib/result.js";
import { mergeScrmlFile, validateMergedFile, isAccepted, VERDICT } from "./scrml-merge.js";
import { appendMergeLog } from "./merge-log.js";

/**
 * Validate every .scrml file the merge touched, whether or not it conflicted.
 *
 * THE IMPORTANT CASE: when two sides edit disjoint regions, jj/git auto-merge
 * with NO conflict and silently produce a file that may not compile. That is
 * precisely the break this layer exists to catch, and it is invisible to a
 * conflict-driven pass — so validation is deliberately NOT gated on conflicts.
 *
 * (Found by running the real CLI against the slice-4 dangling fixture: jj
 * auto-merged it clean, so a conflict-gated pass never fired.)
 *
 * @returns {{ ok: true, data: { checked, broken: [] } } | { ok: false, error }}
 */
export async function validateMergeResult(engine, opts = {}) {
  const repoRoot = opts.repoRoot || process.cwd();
  const read = opts.read || ((p) => readFileSync(p, "utf8"));

  const parentsRes = await engine.parents("@");
  if (!parentsRes.ok) return parentsRes;
  const parents = parentsRes.data || [];
  if (parents.length !== 2) return ok({ checked: 0, broken: [] });

  const baseRes = await engine.mergeBase(parents[0], parents[1]);
  if (!baseRes.ok) return baseRes;
  const baseRev = baseRes.data;

  const changedRes = await engine.changedFilesInRange(`${baseRev}::@`);
  if (!changedRes.ok) return changedRes;

  const targets = (changedRes.data || [])
    .filter((f) => f.path.endsWith(".scrml") && f.kind !== "deleted")
    .map((f) => f.path);

  const broken = [];
  let checked = 0;

  for (const path of targets) {
    const abs = join(repoRoot, path);
    if (!existsSync(abs)) continue;

    const baseRead = await engine.fileAt(baseRev, path);
    // A file ADDED by the merge has no base — nothing to diff against.
    if (!baseRead.ok) continue;

    let mergedContent;
    try { mergedContent = read(abs); } catch { continue; }

    const res = validateMergedFile({
      base: baseRead.data, merged: mergedContent, path, deps: opts.deps,
    });
    if (!res.ok) continue; // validation unavailable — never block a merge on it
    checked++;

    if (res.data.verdict === VERDICT.SEMANTIC_CONFLICT) {
      broken.push({ path, diagnostics: res.data.diagnostics, reason: res.data.reason });
      appendMergeLog(repoRoot, {
        path,
        verdict: VERDICT.SEMANTIC_CONFLICT,
        decisions: ["auto-merged by the engine with no textual conflict"],
        diagnostics: res.data.diagnostics,
        reason: res.data.reason,
      });
    }
  }

  return ok({ checked, broken });
}

/** Human-facing summary of the validation pass. Null when nothing to say. */
export function formatValidation(data) {
  if (!data || data.broken.length === 0) return null;
  const lines = [
    `⚠ ${data.broken.length} file(s) merged cleanly but WILL NOT COMPILE.`,
    "",
    "  Both sides were fine on their own; combining them introduced type",
    "  errors neither side had. A text-based merge cannot see this.",
    "",
  ];
  for (const b of data.broken) {
    lines.push(`  ${b.path}`);
    for (const d of b.diagnostics || []) lines.push(`    ${d.message || d}`);
  }
  lines.push("");
  lines.push("Fix these before saving, or run: giti undo");
  return lines.join("\n");
}

/**
 * @param {object} engine  - engine exposing conflicts/parents/mergeBase/fileAt
 * @param {object} [opts]
 * @param {string} [opts.repoRoot] - defaults to cwd
 * @param {object} [opts.deps]     - forwarded to the merge driver (tests)
 * @param {function} [opts.write]  - file writer injection (tests)
 * @returns {{ ok: true, data: { attempted, resolved: [], unresolved: [], skipped: [] } }
 *          | { ok: false, error: string }}
 */
export async function autoResolveConflicts(engine, opts = {}) {
  const repoRoot = opts.repoRoot || process.cwd();
  const write = opts.write || ((p, c) => writeFileSync(p, c));
  const empty = { attempted: 0, resolved: [], unresolved: [], skipped: [] };

  const conf = await engine.conflicts();
  if (!conf.ok) return conf;
  if (!conf.data.hasConflicts) return ok(empty);

  const all = conf.data.files || [];
  const scrmlFiles = all.filter((f) => f.endsWith(".scrml"));
  const skipped = all.filter((f) => !f.endsWith(".scrml"));
  if (scrmlFiles.length === 0) return ok({ ...empty, skipped });

  // Recover the two sides + their common ancestor.
  const parentsRes = await engine.parents("@");
  if (!parentsRes.ok) return parentsRes;
  const parents = parentsRes.data || [];
  if (parents.length !== 2) {
    // Octopus merges and non-merge conflicted states are out of scope; leaving
    // them to the human is correct, not a failure.
    return ok({ ...empty, skipped: all });
  }
  const [revA, revB] = parents;

  const baseRes = await engine.mergeBase(revA, revB);
  if (!baseRes.ok) return baseRes;
  const baseRev = baseRes.data;

  const resolved = [];
  const unresolved = [];

  for (const path of scrmlFiles) {
    const sides = {};
    let readFailed = null;
    for (const [k, rev] of [["base", baseRev], ["sideA", revA], ["sideB", revB]]) {
      const r = await engine.fileAt(rev, path);
      if (!r.ok) { readFailed = r.error; break; }
      sides[k] = r.data;
    }
    if (readFailed) {
      // A file added on one side has no base revision — not mergeable at the
      // entity level, and not an error worth aborting the whole pass for.
      unresolved.push({ path, verdict: VERDICT.STRUCTURAL_CONFLICT, reason: readFailed });
      continue;
    }

    const res = mergeScrmlFile({ ...sides, path, deps: opts.deps });
    if (!res.ok) {
      unresolved.push({ path, verdict: VERDICT.STRUCTURAL_CONFLICT, reason: res.error });
      continue;
    }

    const { verdict, merged, decisions, diagnostics, reason } = res.data;

    // §4.3.4 SHALL: log every outcome, accepted or refused.
    appendMergeLog(repoRoot, { path, verdict, decisions, diagnostics, reason });

    if (isAccepted(verdict) && typeof merged === "string") {
      try {
        write(join(repoRoot, path), merged);
      } catch (e) {
        unresolved.push({ path, verdict, reason: `could not write resolution: ${e.message}` });
        continue;
      }
      resolved.push({ path, verdict, decisions });
    } else {
      unresolved.push({ path, verdict, diagnostics, reason });
    }
  }

  return ok({ attempted: scrmlFiles.length, resolved, unresolved, skipped });
}

/**
 * Human-facing summary of an auto-resolution pass.
 * Returns null when there is nothing worth printing.
 */
export function formatAutoResolve(data) {
  if (!data || data.attempted === 0) return null;

  const lines = [];
  if (data.resolved.length > 0) {
    lines.push(`Auto-resolved ${data.resolved.length} .scrml conflict(s) — compiler-validated:`);
    for (const r of data.resolved) {
      const note = r.verdict === "clean" ? "" : "  (review advised)";
      lines.push(`  ${r.path}${note}`);
      if (r.decisions?.length) lines.push(`    combined: ${r.decisions.join(", ")}`);
    }
  }
  if (data.unresolved.length > 0) {
    if (lines.length) lines.push("");
    lines.push(`Left for you to resolve (${data.unresolved.length}):`);
    for (const u of data.unresolved) {
      lines.push(`  ${u.path}`);
      if (u.verdict === VERDICT.SEMANTIC_CONFLICT) {
        // The headline capability: this is a break git would have shipped.
        lines.push("    the merge would introduce type errors neither side had:");
        for (const d of u.diagnostics || []) lines.push(`      ${d.message || d}`);
      } else if (u.reason) {
        lines.push(`    ${u.reason}`);
      }
    }
  }
  if (data.resolved.length > 0) {
    lines.push("");
    lines.push("Review with: giti status --merge-log");
  }
  return lines.join("\n");
}
