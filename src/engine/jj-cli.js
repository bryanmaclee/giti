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
import { friendlyError } from "../lib/friendly-error.js";

// ok/err Result-tuple builders authored in scrml at ../lib/result.scrml
// (S10 slice 21 dogfood).
import { ok, err } from "../lib/result.js";

// friendlyError now authored in scrml at ../lib/friendly-error.scrml
// (S10 slice 12 dogfood). Re-imported at the top of this file.

/**
 * Run a jj subprocess command.
 * @param {string[]} args - arguments to pass to jj
 * @param {string} cwd - working directory
 * @param {function} spawn - Bun.spawn or injectable mock
 */
async function run(args, cwd, spawn, opts) {
  const spawnFn = spawn || Bun.spawn;
  // `raw: true` returns stdout verbatim. Every other caller wants the trimmed
  // form; file content does not (a dropped trailing newline is a real diff).
  const raw = opts && opts.raw;
  // `rawError: true` returns jj's stderr untransformed. friendlyError() is a
  // PRESENTATION concern — a caller that needs to CLASSIFY an error must read
  // the original text, or it ends up matching on prose that may not preserve
  // the original meaning.
  const rawError = opts && opts.rawError;
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
      return err(rawError ? stderr.trim() : friendlyError(stderr));
    }
    return ok(raw ? stdout : stdout.trim());
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
   *
   * Uses `jj resolve --list`, which emits one line per conflicted path:
   *   `path/to/file.scrml    2-sided conflict`
   * and exits non-zero with "No conflicts found" when the tree is clean.
   *
   * S20: this previously parsed `jj status` for a `C <path>` file prefix.
   * jj 0.41 does not emit that — it prints conflicted paths under a
   * `Warning: There are unresolved conflicts at these paths:` header with no
   * status letter. The result was that `files` was ALWAYS empty against real
   * jj while `hasConflicts` stayed true (rescued by the message regex), so
   * giti could tell THAT a conflict existed but never WHICH file. The unit
   * test passed because its mock encoded the `C ` format jj doesn't produce
   * (mock drift); the integration test only covered the clean case.
   *
   * @returns {{ ok: true, data: { hasConflicts: boolean, files: string[] } } | { ok: false, error: string }}
   */
  async conflicts() {
    // rawError: we must classify "No conflicts found" vs a genuine failure on
    // jj's own text, not on the friendly rewrite of it.
    const result = await run(
      ["resolve", "--list"], this.repoPath, this._spawn, { rawError: true }
    );

    // `jj resolve --list` exits non-zero when there is nothing to resolve.
    // That is the clean case, not a failure.
    if (!result.ok) {
      if (/no conflicts?\b/i.test(result.error || "")) {
        return ok({ hasConflicts: false, files: [] });
      }
      // Genuine failure — present it in the friendly register.
      return err(friendlyError(result.error || ""));
    }

    const files = [];
    for (const line of (result.data || "").split("\n")) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      // "path/to/file.scrml    2-sided conflict" — path is everything up to
      // the run of whitespace preceding the trailing "N-sided conflict"
      // descriptor. Paths may contain single spaces, so anchor on the tail.
      const m = trimmed.match(/^(.*?)\s{2,}\d+-sided conflict$/);
      files.push(m ? m[1].trim() : trimmed);
    }

    return ok({ hasConflicts: files.length > 0, files });
  }

  /**
   * Read a file's full content at a specific revision.
   *
   * This is how the AST-merge driver obtains clean base/sideA/sideB inputs:
   * jj materializes conflicts in the working copy as a human-facing marker
   * format, but the entity-level merger needs three WHOLE parseable files.
   * Fetching by revision sidesteps parsing that display format entirely.
   *
   * @param {string} rev - revision / change id
   * @param {string} path - repo-relative file path
   * @returns {{ ok: true, data: string } | { ok: false, error: string }}
   */
  async fileAt(rev, path) {
    if (!rev) return err("fileAt: a revision is required");
    if (!path) return err("fileAt: a file path is required");
    // raw: file content is returned verbatim, trailing newline included.
    return run(["file", "show", "-r", rev, path], this.repoPath, this._spawn, { raw: true });
  }

  /**
   * Find the merge base (common ancestor) of two revisions.
   * @returns {{ ok: true, data: string } | { ok: false, error: string }}
   */
  async mergeBase(revA, revB) {
    if (!revA || !revB) return err("mergeBase: two revisions are required");
    const result = await this._run([
      "log", "--no-graph", "-T", 'change_id.short() ++ "\n"',
      "-r", `heads(::${revA} & ::${revB})`,
    ]);
    if (!result.ok) return result;
    const first = (result.data || "").split("\n").map((l) => l.trim()).filter(Boolean)[0];
    if (!first) return err(`no common ancestor between ${revA} and ${revB}`);
    return ok(first);
  }

  /**
   * List the parent revisions of `rev` (defaults to the working copy).
   * A conflicted merge commit has two or more.
   * @returns {{ ok: true, data: string[] } | { ok: false, error: string }}
   */
  async parents(rev) {
    const target = rev || "@";
    const result = await this._run([
      "log", "--no-graph", "-T", 'change_id.short() ++ "\n"',
      "-r", `${target}-`,
    ]);
    if (!result.ok) return result;
    const revs = (result.data || "").split("\n").map((l) => l.trim()).filter(Boolean);
    return ok(revs);
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
   * Get the diff that a specific change introduces (what changed in that
   * revision, parent → self). Complements diff() which is working-copy-
   * against-parent.
   *
   * @param {string} changeId - jj change id (full or short)
   * @returns {{ ok: true, data: string } | { ok: false, error: string }}
   */
  async diffChange(changeId) {
    if (!changeId) return { ok: false, error: "changeId is required" };
    const result = await this._run(["diff", "-r", changeId]);
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

  /**
   * Move a bookmark to point at `target`. Creates the bookmark if it does not exist.
   * `target` is a revset string (e.g. "@-", "bookmarks(main)", a change id).
   */
  async setBookmark(name, target) {
    if (!name) return err("bookmark name required");
    const targetSpec = target || "@-";

    const setResult = await this._run(
      ["bookmark", "set", name, "--to", targetSpec, "--allow-backwards"]
    );
    if (setResult.ok) return ok({ name, target: targetSpec });

    // Fall back to `bookmark create` if the set failed because the bookmark
    // does not exist yet. `friendlyError` turns "no such bookmark" into a
    // canned sentence — detect via the raw word.
    const createResult = await this._run(
      ["bookmark", "create", name, "--revision", targetSpec]
    );
    if (createResult.ok) return ok({ name, target: targetSpec, created: true });
    return createResult;
  }

  /**
   * Returns true iff a LOCAL bookmark with this name exists.
   * Uses `jj bookmark list <name>`. Exits non-zero with "no such bookmark"
   * style error when absent — we translate that to { ok: true, data: false }.
   */
  async bookmarkExists(name) {
    if (!name) return ok(false);
    const result = await this._run(["bookmark", "list", name]);
    if (!result.ok) {
      // friendlyError may have mapped the message; treat any error as "absent".
      return ok(false);
    }
    // `bookmark list NAME` prints nothing when absent in newer jj versions,
    // or a line starting with "NAME:" when present.
    return ok(result.data.trim().length > 0);
  }

  /**
   * List files changed within a revset range, returning parsed status-style
   * entries: { kind: 'modified'|'added'|'deleted', path }.
   *
   * Uses `jj diff --summary -r <range>`. The summary format prints lines like:
   *   M path/to/file
   *   A path/to/new
   *   D path/to/gone
   */
  async changedFilesInRange(range) {
    if (!range) return err("range required");
    const result = await this._run(["diff", "--summary", "-r", range]);
    if (!result.ok) return result;

    const files = [];
    for (const line of result.data.split("\n")) {
      const m = line.match(/^([MAD])\s+(.+)$/);
      if (!m) continue;
      const kind = m[1] === "M" ? "modified" : m[1] === "A" ? "added" : "deleted";
      files.push({ kind, path: m[2].trim() });
    }
    return ok(files);
  }

  async _rawDescribe(target, message) {
    return await this._run(["describe", target, "-m", message]);
  }

  async _rawSync(direction) {
    // Legacy path — kept for test compatibility. New call sites use
    // push({...}) / fetch({...}) below.
    if (direction === "fetch") {
      return await this._run(["git", "fetch"]);
    }
    if (direction === "push") {
      return await this._run(["git", "push"]);
    }
    return err(`unknown sync direction: ${direction}`);
  }

  /**
   * Push specific bookmarks to a remote.
   *
   * @param {{ remoteName?: string, bookmarks?: string[] }} opts
   *   - remoteName: target git remote (maps to `--remote <name>`)
   *   - bookmarks: explicit bookmark list (maps to `--bookmark <name>` repeated)
   *     When empty/undefined, jj's default push behavior runs (pushes tracked bookmarks).
   */
  async push(opts = {}) {
    const args = ["git", "push"];
    if (opts.remoteName) {
      args.push("--remote", opts.remoteName);
    }
    if (Array.isArray(opts.bookmarks) && opts.bookmarks.length > 0) {
      for (const b of opts.bookmarks) {
        args.push("--bookmark", b);
      }
      // Creating new remote-tracking bookmarks requires --allow-new.
      args.push("--allow-new");
    }
    return await this._run(args);
  }

  /**
   * Fetch refs from a remote (or all remotes if none specified).
   *
   * @param {{ remoteName?: string }} opts
   */
  async fetch(opts = {}) {
    const args = ["git", "fetch"];
    if (opts.remoteName) {
      args.push("--remote", opts.remoteName);
    }
    return await this._run(args);
  }

  /**
   * Split a change by path: `jj split -r <rev> -m <msg> path1 path2 ...`
   * The named paths become the first (split-out) commit; the remainder
   * becomes the second. Both inherit the pre-split commit's description
   * unless -m overrides the first.
   *
   * @param {{ paths: string[], message?: string, revision?: string }} opts
   */
  async split(opts = {}) {
    const paths = opts.paths || [];
    if (paths.length === 0) return err("split requires at least one path");

    const args = ["split", "-r", opts.revision || "@"];
    if (opts.message) {
      args.push("-m", opts.message);
    }
    for (const p of paths) args.push(p);
    return await this._run(args);
  }

  /**
   * `jj new` — creates a new empty change above @.
   */
  async newChange() {
    return await this._run(["new"]);
  }

  /**
   * Set up local-bookmark tracking of a remote-tracking bookmark.
   * Wraps `jj bookmark track <name>@<remoteName>`. After tracking, the local
   * bookmark mirrors the remote on each fetch (spec §12.5: bootstrap a
   * machine onto an existing private overlay).
   *
   * Idempotent on the jj side: tracking an already-tracked bookmark errors
   * with "already tracked"; the caller can match that and treat it as a no-op.
   */
  async trackRemoteBookmark(name, remoteName) {
    if (!name || !remoteName) return err("name and remoteName required");
    return await this._run(["bookmark", "track", `${name}@${remoteName}`]);
  }

  /**
   * Check whether a remote-tracking bookmark `<name>@<remoteName>` exists.
   *
   * Implementation: `jj bookmark list <name> --all-remotes` filters to the
   * given bookmark and prints an indented `  @<remoteName>: ...` line for
   * each remote that has a copy. Returns ok=true with data:bool, or ok:false
   * if the underlying call errored.
   */
  async remoteBookmarkExists(name, remoteName) {
    if (!name || !remoteName) return ok(false);
    const result = await this._run(["bookmark", "list", name, "--all-remotes"]);
    if (!result.ok) return ok(false);

    const needle = `@${remoteName}:`;
    for (const line of result.data.split("\n")) {
      if (line.trim().startsWith(needle)) return ok(true);
    }
    return ok(false);
  }

  /**
   * List tracked files at the working-copy revision.
   * Wraps `jj file list`. Returns { ok: true, data: string[] } sorted asc.
   */
  async files() {
    const result = await this._run(["file", "list"]);
    if (!result.ok) return result;
    const files = result.data
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    files.sort();
    return ok(files);
  }
}

/**
 * Exported for testing — allows tests to exercise error mapping directly.
 */
export { friendlyError };
