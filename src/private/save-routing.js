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

/**
 * Auto-split a mixed working copy into a public commit and a private commit.
 *
 * Workflow:
 *   1. `jj split <publicPaths> -m "<publicMessage>"` — split-out public
 *      content into a new commit; @ becomes the remainder (private).
 *   2. Redescribe @ with `<privateMessage>` so the remainder's commit
 *      message reflects its private content (jj would otherwise inherit
 *      the pre-split description).
 *   3. `jj new` — create a fresh working change above the private commit.
 *   4. Advance bookmarks:
 *        main     → @-- (the public commit, two back from the new WC)
 *        _private → @-  (the private commit, one back from the new WC)
 *
 * The caller is responsible for having already classified the working
 * copy as `mixed` and supplied both file lists.
 *
 * @param {object} engine
 * @param {{ publicFiles: Array, privateFiles: Array,
 *           publicMessage: string, privateMessage: string }} plan
 * @returns {{ ok: boolean, stage?: string, error?: string,
 *              bookmarkMoves?: Array }}
 */
export async function autoSplitSave(engine, plan) {
  const publicPaths = plan.publicFiles.map((f) => f.path);
  if (publicPaths.length === 0) {
    return { ok: false, stage: "precondition", error: "no public paths to split" };
  }
  if ((plan.privateFiles || []).length === 0) {
    return { ok: false, stage: "precondition", error: "no private paths to split" };
  }

  // 1. Split out the public subset.
  const splitResult = await engine.split({
    paths: publicPaths,
    message: plan.publicMessage,
  });
  if (!splitResult.ok) return { ok: false, stage: "split", error: splitResult.error };

  // 2. Redescribe the remainder (now @) with the private message.
  if (typeof engine._rawDescribe === "function") {
    const descResult = await engine._rawDescribe("@", plan.privateMessage);
    if (!descResult.ok) return { ok: false, stage: "describe", error: descResult.error };
  }

  // 3. Fresh working change above the private commit.
  if (typeof engine.newChange === "function") {
    const newResult = await engine.newChange();
    if (!newResult.ok) return { ok: false, stage: "new", error: newResult.error };
  }

  // 4. Advance bookmarks to their respective commits.
  //    After split + describe + new:
  //      @   = empty WC
  //      @-  = private commit (remainder)
  //      @-- = public commit (split-out)
  const bookmarkMoves = [];
  const mainMove = await engine.setBookmark(PUBLIC_BOOKMARK, "@--");
  bookmarkMoves.push({ name: PUBLIC_BOOKMARK, ok: mainMove.ok, error: mainMove.ok ? null : mainMove.error });
  const privMove = await engine.setBookmark(PRIVATE_BOOKMARK, "@-");
  bookmarkMoves.push({ name: PRIVATE_BOOKMARK, ok: privMove.ok, error: privMove.ok ? null : privMove.error });

  return { ok: true, bookmarkMoves };
}

/**
 * Derive a pair of (publicMsg, privateMsg) commit messages from a single
 * user-supplied message plus per-bucket auto-generated descriptions.
 *
 * If the user provided a message, tag each scope: "<msg> [public]" /
 * "<msg> [private]". Otherwise, callers should use generateMessage() to
 * auto-describe each bucket.
 */
export function splitMessages(userMessage, autoPublic, autoPrivate) {
  if (userMessage && userMessage.trim()) {
    return {
      publicMessage: `${userMessage.trim()} [public]`,
      privateMessage: `${userMessage.trim()} [private]`,
    };
  }
  return {
    publicMessage: autoPublic,
    privateMessage: autoPrivate,
  };
}
