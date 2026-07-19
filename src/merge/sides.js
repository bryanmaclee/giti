/**
 * Recovering the three sides of a conflicted file.
 *
 * Shared by the auto-resolution pass (`giti merge`) and the inspection /
 * resolution surface (`giti resolve`).
 *
 * jj materializes a conflicted working-copy file with its own marker format.
 * We never parse that: the merge context gives us revisions, and revisions give
 * us clean whole files. See engine.fileAt().
 *
 * Spec ref: giti-spec-v1.md §4.1 (conflict-as-data)
 */

import { ok, err } from "../lib/result.js";

/**
 * jj materializes a conflicted file with a `<<<<<<< conflict N of M` header.
 * Anchored at line start with seven angle brackets AND the word `conflict`, so
 * ordinary source text cannot trip it.
 */
const JJ_CONFLICT_MARKER = /^<{7}\s+conflict/m;

export function hasConflictMarkers(text) {
  return JJ_CONFLICT_MARKER.test(text || "");
}

/**
 * Resolve the current merge context: both parents and their common ancestor.
 *
 * Returns `{ ok: true, data: { isMerge: false } }` when the working copy is not
 * a two-parent merge — that is a normal state, not an error. Octopus merges
 * report isMerge:false too; they are out of scope for entity merging.
 *
 * @returns {{ ok: true, data: { isMerge: boolean, baseRev?, revA?, revB? } }
 *          | { ok: false, error: string }}
 */
export async function getMergeContext(engine) {
  const parentsRes = await engine.parents("@");
  if (!parentsRes.ok) return parentsRes;

  const parents = parentsRes.data || [];
  if (parents.length !== 2) return ok({ isMerge: false });

  const [revA, revB] = parents;
  const baseRes = await engine.mergeBase(revA, revB);
  if (!baseRes.ok) return baseRes;

  return ok({ isMerge: true, baseRev: baseRes.data, revA, revB });
}

/**
 * Fetch base / ours / theirs content for one path.
 *
 * `revA` is the first parent — for `giti merge <name>` that is the side you
 * were already on, so it is "ours"; `revB` is the incoming side, "theirs".
 *
 * A file added on only one side has no base revision; that is reported as a
 * failure so callers can treat it as unmergeable rather than silently diffing
 * against nothing.
 */
export async function getConflictSides(engine, path, ctx) {
  const out = {};
  for (const [k, rev] of [["base", ctx.baseRev], ["ours", ctx.revA], ["theirs", ctx.revB]]) {
    const r = await engine.fileAt(rev, path);
    if (!r.ok) return err(`${path}: no content at ${k} revision (${rev}) — ${r.error}`);

    // A side can itself be conflicted — §4.1.1 lets you keep working (and
    // merging) on top of an unresolved conflict, so this is a normal state,
    // not a corrupt repo. Its materialized content is NOT a parseable source,
    // so say that plainly instead of handing markers to the compiler and
    // surfacing an unrelated tag-matching error.
    if (hasConflictMarkers(r.data)) {
      return err(
        `${path}: the '${k}' side (${rev}) is itself unresolved — ` +
        `resolve that conflict first, then merge again`,
      );
    }
    out[k] = r.data;
  }
  return ok(out);
}
