/**
 * giti Engine Interface
 *
 * All VCS operations go through this interface. The engine is invisible
 * to the user — they never see "jj", "git", or any implementation detail.
 *
 * v1: jj CLI subprocess (simplest possible integration)
 * v1.1: jj-lib via WASM (OQ-1 resolution)
 *
 * Every method returns { ok: true, data } or { ok: false, error }.
 */

/**
 * @typedef {Object} SaveResult
 * @property {string} changeId - The change identifier
 * @property {string} description - The save message
 * @property {string[]} files - Files included in the save
 */

/**
 * @typedef {Object} BranchInfo
 * @property {string} name - Branch/bookmark name
 * @property {string} changeId - Current change ID
 * @property {boolean} active - Whether this is the current branch
 */

/**
 * @typedef {Object} HistoryEntry
 * @property {string} changeId - Change identifier
 * @property {string} description - Save message
 * @property {string} author - Who made the change
 * @property {string} timestamp - When it was made
 * @property {string[]} files - Files changed
 */

export class EngineInterface {
  /** Initialize a new repository */
  async init(path) { throw new Error("not implemented"); }

  /** Save current work with a message */
  async save(message) { throw new Error("not implemented"); }

  /** List all lines of work (branches/bookmarks) */
  async listBranches() { throw new Error("not implemented"); }

  /** Switch to a different line of work */
  async switchTo(name) { throw new Error("not implemented"); }

  /** Create a new line of work */
  async createBranch(name) { throw new Error("not implemented"); }

  /** Merge another line of work into current */
  async merge(name) { throw new Error("not implemented"); }

  /** Undo the last operation */
  async undo() { throw new Error("not implemented"); }

  /** Get history of changes */
  async history(limit) { throw new Error("not implemented"); }

  /** Get current status (modified files, current branch) */
  async status() { throw new Error("not implemented"); }

  /** Move a bookmark (create if missing). target is a revset like "@-" or "bookmarks(foo)". */
  async setBookmark(name, target) { throw new Error("not implemented"); }

  /** Whether a local bookmark exists. */
  async bookmarkExists(name) { throw new Error("not implemented"); }

  /**
   * List files changed in a revset range.
   * Returns { ok: true, data: Array<{kind: 'modified'|'added'|'deleted', path: string}> }.
   * `range` is a jj-style revset range like "bookmarks(main)..@-".
   */
  async changedFilesInRange(range) { throw new Error("not implemented"); }

  /**
   * Push specific bookmarks to a named remote.
   * opts: { remoteName?: string, bookmarks?: string[] }
   * - remoteName undefined → use jj's default remote
   * - bookmarks empty or undefined → push jj's default set (tracked bookmarks)
   */
  async push(opts) { throw new Error("not implemented"); }

  /**
   * Fetch refs from a named remote.
   * opts: { remoteName?: string }
   */
  async fetch(opts) { throw new Error("not implemented"); }

  /**
   * Split a change by path. The named paths become the first (split-out)
   * commit; the remainder becomes the second.
   *
   * opts: { paths: string[], message?: string, revision?: string }
   *   - revision defaults to "@"
   *   - message is the description for the split-out commit
   */
  async split(opts) { throw new Error("not implemented"); }

  /**
   * Create a new change above the current one (advances @).
   * Equivalent to `jj new` with no args.
   */
  async newChange() { throw new Error("not implemented"); }

  /**
   * List files tracked at the working-copy revision.
   * Returns { ok: true, data: string[] } — repo-relative paths, sorted.
   */
  async files() { throw new Error("not implemented"); }
}
