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
import { loadPrivateManifest } from "./scope.js";

// Bookmark name constants authored in scrml at ../lib/bookmarks.scrml
// (S10 slice 11). Re-exported here for back-compat with existing
// import paths.
import { PRIVATE_BOOKMARK, PUBLIC_BOOKMARK } from "../lib/bookmarks.js";
export { PRIVATE_BOOKMARK, PUBLIC_BOOKMARK };

// classifyChanges authored in scrml at ../lib/save-routing-pure.scrml
// (S10 slice 13 dogfood).
import { classifyChanges } from "../lib/save-routing-pure.js";
export { classifyChanges };

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

// planBookmarkMoves authored in scrml at ../lib/save-routing-pure.scrml.
import { planBookmarkMoves } from "../lib/save-routing-pure.js";
export { planBookmarkMoves };

// advanceBookmarks + autoSplitSave authored in scrml at
// ../lib/save-routing-async.scrml (S10 slice 17).
import { advanceBookmarks, autoSplitSave } from "../lib/save-routing-async.js";
export { advanceBookmarks, autoSplitSave };

// splitMessages authored in scrml at ../lib/save-routing-pure.scrml.
import { splitMessages } from "../lib/save-routing-pure.js";
export { splitMessages };
