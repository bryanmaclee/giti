/**
 * jj CLI Engine — v1.1 implementation
 *
 * Wraps jj CLI commands as subprocess calls. This is the simplest
 * possible integration — no WASM, no FFI, just `jj` in PATH.
 *
 * v1.1 additions:
 *   - Friendly error messages for common jj failures
 *   - conflicts() method — structured conflict detection
 *   - diff() method — raw diff output
 *   - land() method — merge a bookmark into main
 *   - Injectable _spawn for testability
 *
 * Requires: jj installed and in PATH
 * Spec ref: giti-spec-v1.md §3.2 (engine is invisible)
 */

import { EngineInterface } from "./interface.js";

function ok(data) { return { ok: true, data }; }
function err(error) { return { ok: false, error }; }

/**
 * Map common jj stderr patterns to friendly messages.
 * Returns the friendly message if matched, otherwise the raw stderr.
 */
function friendlyError(stderr) {
  const raw = stderr.trim();
  if (!raw) return "An unknown error occurred.";

  // GIT-002: Not a giti repository
  if (/not a jj repo/i.test(raw) || /no jj repo/i.test(raw) ||
      /there is no jj repo/i.test(raw) || /not in a git repository/i.test(raw)) {
    return "This directory is not a giti project.\nTo create a new project here: giti init\nTo work with an existing project: navigate to its directory first.";
  }

  // Conflict during rebase/merge
  if (/conflict/i.test(raw) && /resolved/i.test(raw) === false) {
    return `Merge conflict detected. Run 'giti status' to see conflicted files, then resolve them and save again.`;
  }

  // GIT-001: Nothing changed
  if (/no changes/i.test(raw) || /nothing changed/i.test(raw)) {
    return "Nothing to save. Your work is already captured.";
  }

  // Bookmark already exists
  if (/bookmark.*already exists/i.test(raw)) {
    const match = raw.match(/bookmark\s+"?([^\s"]+)"?/i);
    const name = match ? match[1] : "that name";
    return `A bookmark named '${name}' already exists. Pick a different name or delete the existing one first.`;
  }

  // Bookmark not found
  if (/no such bookmark/i.test(raw) || /bookmark.*not found/i.test(raw)) {
    return "That bookmark does not exist. Run 'giti branches' to see available bookmarks.";
  }

  // GIT-003: Revision not found
  if (/no such revision/i.test(raw) || /revset.*resolved to no revisions/i.test(raw)) {
    return "No context called that name found.\nCheck giti history to see what's available.\nIf you're looking for a remote branch, run giti sync first to get the latest.";
  }

  // Working copy is dirty / uncommitted
  if (/working copy.*uncommitted/i.test(raw)) {
    return "You have uncommitted changes. Save your work first before switching.";
  }

  // GIT-010: Remote auth failure
  if (/authentication/i.test(raw) || /permission denied/i.test(raw)) {
    return "Could not connect to the remote repository. Check your credentials.\nIf you recently changed your password or access token, update it with:\n  giti auth update";
  }

  // GIT-009: No remote configured
  if (/no remote/i.test(raw) || /no git remote/i.test(raw)) {
    return "No remote repository is configured for this project.\nTo add one: giti remote add <url>";
  }

  // GIT-011: Nothing to undo
  if (/nothing to undo/i.test(raw) || /no operations/i.test(raw) || /operation log.*empty/i.test(raw)) {
    return "Nothing to undo. This is the beginning of your project's history.";
  }

  // GIT-012: Merge into self
  if (/merge.*into itself/i.test(raw) || /same revision/i.test(raw)) {
    return "Cannot merge a context into itself.\nYou are already there. Switch to a different context first.";
  }

  // GIT-008: Disk full
  if (/no space left/i.test(raw) || /disk full/i.test(raw) || /ENOSPC/i.test(raw)) {
    return "Could not save your work. Your disk is out of space.\nFree up disk space and run giti save again.\nYour current changes are still in your working directory.";
  }

  // Generic: return as-is but cap length
  if (raw.length > 300) {
    return raw.slice(0, 297) + "...";
  }

  return raw;
}

/**
 * Run a jj subprocess command.
 * @param {string[]} args - arguments to pass to jj
 * @param {string} cwd - working directory
 * @param {function} spawn - Bun.spawn or injectable mock
 */
async function run(args, cwd, spawn) {
  const spawnFn = spawn || Bun.spawn;
  try {
    const proc = spawnFn(["jj", ...args], {
      cwd: cwd || process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      return err(friendlyError(stderr));
    }
    return ok(stdout.trim());
  } catch (e) {
    if (e.code === "ENOENT") {
      return err(
        "jj is not installed or not in PATH. " +
        "Install it from https://martinvonz.github.io/jj/ and make sure 'jj' is available in your terminal."
      );
    }
    return err(e.message);
  }
}

export class JjCliEngine extends EngineInterface {
  /**
   * @param {string} [repoPath] - path to the jj repository
   * @param {object} [opts] - options
   * @param {function} [opts.spawn] - injectable spawn function for testing
   */
  constructor(repoPath, opts) {
    super();
    this.repoPath = repoPath || process.cwd();
    this._spawn = opts?.spawn || null;
  }

  /** @private */
  _run(args, cwd) {
    return run(args, cwd || this.repoPath, this._spawn);
  }

  async init(path) {
    const target = path || this.repoPath;
    // jj >= 0.40: `jj init` removed; use `jj git init`
    const result = await this._run(["git", "init"], target);
    if (!result.ok) return result;
    return ok({ path: target });
  }

  async save(message) {
    const descResult = await this._run(
      ["describe", "-m", message || "save"]
    );
    if (!descResult.ok) return descResult;

    const newResult = await this._run(["new"]);
    if (!newResult.ok) return newResult;

    const logResult = await this._run(
      ["log", "--no-graph", "-r", "@-", "-T", 'change_id.short() ++ "\\n"']
    );

    return ok({
      changeId: logResult.ok ? logResult.data.split("\n")[0] : "unknown",
      description: message || "save",
    });
  }

  async listBranches() {
    // jj >= 0.19: `--all` renamed to `--all-remotes`
    const result = await this._run(["bookmark", "list", "--all-remotes"]);
    if (!result.ok) return result;

    const branches = result.data
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name, ...rest] = line.split(":");
        return {
          name: name.trim(),
          info: rest.join(":").trim(),
          active: line.includes("(active)"),
        };
      });

    return ok(branches);
  }

  async switchTo(name) {
    const result = await this._run(["edit", `bookmarks(${name})`]);
    if (!result.ok) {
      return await this._run(["edit", name]);
    }
    return ok({ name });
  }

  async createBranch(name) {
    const result = await this._run(["bookmark", "create", name]);
    if (!result.ok) return result;
    return ok({ name });
  }

  async merge(name) {
    // jj >= 0.17: `jj merge` removed. Use `jj new` with multiple parents
    // to create a merge commit: `jj new @ bookmarks(name)`
    const result = await this._run(
      ["new", "@", `bookmarks(${name})`]
    );
    if (!result.ok) return result;
    return ok({ merged: name });
  }

  async undo() {
    const result = await this._run(["undo"]);
    if (!result.ok) return result;
    return ok({ undone: true });
  }

  async history(limit = 10) {
    const result = await this._run(
      // jj template: .ago() removed in newer versions. Use .local().format() instead.
      ["log", "--no-graph", "-n", String(limit), "-T",
        'change_id.short() ++ " | " ++ description.first_line() ++ " | " ++ author.name() ++ " | " ++ committer.timestamp().local().format("%Y-%m-%d %H:%M") ++ "\\n"']
    );
    if (!result.ok) return result;

    const entries = result.data
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [changeId, description, author, timestamp] = line.split(" | ");
        return {
          changeId: (changeId || "").trim(),
          description: (description || "").trim(),
          author: (author || "").trim(),
          timestamp: (timestamp || "").trim(),
        };
      });

    return ok(entries);
  }

  async status() {
    const result = await this._run(["status"]);
    if (!result.ok) return result;
    return ok({ raw: result.data });
  }

  /**
   * Detect conflicts in the working copy.
   * Parses `jj status` output for conflict markers.
   * @returns {{ ok: true, data: { hasConflicts: boolean, files: string[] } } | { ok: false, error: string }}
   */
  async conflicts() {
    const result = await this._run(["status"]);
    if (!result.ok) return result;

    const raw = result.data;
    const files = [];

    // jj status shows conflicted files with "C" prefix in the file listing,
    // or a "There are unresolved conflicts" message
    for (const line of raw.split("\n")) {
      // Lines like: "C path/to/file.txt" indicate conflicts
      const conflictMatch = line.match(/^C\s+(.+)$/);
      if (conflictMatch) {
        files.push(conflictMatch[1].trim());
      }
    }

    // Also check for the explicit conflict message
    const hasConflictMessage = /unresolved conflict/i.test(raw);
    const hasConflicts = files.length > 0 || hasConflictMessage;

    return ok({ hasConflicts, files });
  }

  /**
   * Get a diff of current changes, optionally against a target revision.
   * @param {string} [target] - revision or bookmark to diff against
   * @returns {{ ok: true, data: string } | { ok: false, error: string }}
   */
  async diff(target) {
    const args = ["diff"];
    if (target) {
      args.push("--from", target);
    }
    const result = await this._run(args);
    if (!result.ok) return result;
    return ok(result.data);
  }

  /**
   * Land a bookmark onto main. Moves the main bookmark to the target bookmark's
   * change, effectively "merging" it.
   *
   * Workflow: bookmark set main --to <bookmark>
   * Then optionally delete the landed bookmark.
   *
   * @param {string} bookmark - the bookmark to land
   * @param {object} [opts]
   * @param {string} [opts.target="main"] - the target bookmark to land onto
   * @param {boolean} [opts.cleanup=true] - delete the source bookmark after landing
   * @returns {{ ok: true, data: { landed: string, onto: string } } | { ok: false, error: string }}
   */
  async land(bookmark, opts) {
    const target = opts?.target || "main";
    const cleanup = opts?.cleanup !== false;

    // Move the target bookmark to point at the landing bookmark's revision
    const moveResult = await this._run(
      ["bookmark", "set", target, "--to", `bookmarks(${bookmark})`]
    );
    if (!moveResult.ok) return moveResult;

    // Optionally clean up the source bookmark
    if (cleanup && bookmark !== target) {
      await this._run(["bookmark", "delete", bookmark]);
      // Ignore delete failure — non-critical
    }

    return ok({ landed: bookmark, onto: target });
  }

  async _rawDescribe(target, message) {
    return await this._run(["describe", target, "-m", message]);
  }

  async _rawSync(direction) {
    if (direction === "fetch") {
      return await this._run(["git", "fetch"]);
    }
    if (direction === "push") {
      return await this._run(["git", "push"]);
    }
    return err(`unknown sync direction: ${direction}`);
  }
}

/**
 * Exported for testing — allows tests to exercise error mapping directly.
 */
export { friendlyError };
