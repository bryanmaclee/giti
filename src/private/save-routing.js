/**
 * Save-time routing: decide which bookmarks advance after a save, based on
 * whether the saved changes were public, private, or mixed.
 *
 * Spec §12.2: "main — the public stream. All commits touching only public-
 * scoped paths. _private — the private stream. Contains both its own commits
 * (on private-scoped paths) and merge commits that reference public-stream
 * positions."
 *
 * v1 rule set (slice 3, no auto-split):
 *   - all public → advance both `main` and `_private` (they track together)
 *   - all private → advance `_private`, leave `main` behind
 *   - mixed → REFUSE; the caller must split the save before committing
 *   - empty (nothing changed) → no-op
 */

import { parseStatus } from "../commands/status.js";
import { loadPrivateManifest, partitionByScope } from "./scope.js";

export const PRIVATE_BOOKMARK = "_private";
export const PUBLIC_BOOKMARK = "main";

/**
 * Classify a working-copy status into a routing decision.
 *
 * @param {Array<{kind, path}>} changed
 * @param {string[]} globs
 * @returns {{ scope: 'public'|'private'|'mixed'|'empty',
 *             publicFiles: Array, privateFiles: Array }}
 */
export function classifyChanges(changed, globs) {
  if (!changed || changed.length === 0) {
    return { scope: "empty", publicFiles: [], privateFiles: [] };
  }
  const { public: publicFiles, private: privateFiles } = partitionByScope(changed, globs);
  if (privateFiles.length === 0) return { scope: "public", publicFiles, privateFiles };
  if (publicFiles.length === 0) return { scope: "private", publicFiles, privateFiles };
  return { scope: "mixed", publicFiles, privateFiles };
}

/**
 * Same as classifyChanges but reads from raw jj status output + repo root.
 */
export function classifyFromStatus(rawStatus, repoRoot) {
  const parsed = parseStatus(rawStatus || "");
  const globs = loadPrivateManifest(repoRoot);
  return {
    ...classifyChanges(parsed.changed, globs),
    parsed,
  };
}

/**
 * Plan: given a classification, which bookmarks should advance to @-
 * (the just-saved change) after `engine.save` returns?
 *
 * Returns an array of bookmark names. Empty if none should move.
 */
export function planBookmarkMoves(scope) {
  if (scope === "public") return [PUBLIC_BOOKMARK, PRIVATE_BOOKMARK];
  if (scope === "private") return [PRIVATE_BOOKMARK];
  return []; // "mixed" and "empty" → no moves
}

/**
 * Apply bookmark moves via the engine. Non-fatal: a failure to move one
 * bookmark does not prevent the others from being moved. Collects the
 * per-bookmark results.
 *
 * @param {{setBookmark: Function}} engine
 * @param {string[]} bookmarks
 * @param {string} target - revset for where to point them, typically "@-"
 */
export async function advanceBookmarks(engine, bookmarks, target = "@-") {
  const results = [];
  for (const name of bookmarks) {
    const r = await engine.setBookmark(name, target);
    results.push({ name, ok: r.ok, error: r.ok ? null : r.error });
  }
  return results;
}
