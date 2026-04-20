/**
 * giti sync [--remote NAME] [--push] [--pull]
 *
 * Synchronize with a remote. Defaults to pull-then-push against the first
 * configured remote.
 *
 * Spec refs: giti-spec-v1.md §3.4 (git compatibility), §12.3 (push filter).
 */

import { getEngine } from "../engine/index.js";
import { parseStatus } from "./status.js";
import { loadPrivateManifest, partitionByScope } from "../private/scope.js";
import { listRemotes, getRemote } from "../private/remotes.js";
import { PUBLIC_BOOKMARK, PRIVATE_BOOKMARK } from "../private/save-routing.js";

/**
 * Parse CLI args for sync.
 * Returns { remote: string|null, push: bool, pull: bool }.
 * If neither --push nor --pull is given, both are true (default full sync).
 */
export function parseSyncArgs(args) {
  let remote = null;
  let push = false;
  let pull = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--remote") {
      remote = args[i + 1] || null;
      i++;
    } else if (a.startsWith("--remote=")) {
      remote = a.slice("--remote=".length);
    } else if (a === "--push") {
      push = true;
    } else if (a === "--pull") {
      pull = true;
    }
  }

  if (!push && !pull) { push = true; pull = true; }
  return { remote, push, pull };
}

/**
 * Compute which bookmarks to push, given a resolved target remote.
 *
 *   - no target remote    → empty (let engine default)
 *   - public remote       → [main]
 *   - private remote      → [main, _private]
 *
 * Spec §12.3 normative #1/#2.
 */
export function bookmarksForPush(targetRemote) {
  if (!targetRemote) return [];
  if (targetRemote.scope === "private") return [PUBLIC_BOOKMARK, PRIVATE_BOOKMARK];
  return [PUBLIC_BOOKMARK];
}

/**
 * Resolve the target remote:
 *   1. If --remote NAME was given: look it up; error if missing.
 *   2. Else if there are no remotes configured: return null (legacy
 *      behavior — delegate to engine which uses jj's default).
 *   3. Else if exactly one remote exists: use it.
 *   4. Else: ambiguous — require --remote.
 *
 * Returns { ok, remote?, error? }. `remote` is the config object or null.
 */
export function resolveTargetRemote(repoRoot, requested) {
  if (requested) {
    const r = getRemote(repoRoot, requested);
    if (!r) {
      return {
        ok: false,
        error:
          `No remote named '${requested}'. ` +
          `Run 'giti remote list' to see configured remotes.`,
      };
    }
    return { ok: true, remote: r };
  }

  const remotes = listRemotes(repoRoot);
  if (remotes.length === 0) return { ok: true, remote: null };
  if (remotes.length === 1) return { ok: true, remote: remotes[0] };
  return {
    ok: false,
    error:
      `Multiple remotes configured. Pick one with --remote <name>. ` +
      `(${remotes.map((r) => r.name).join(", ")})`,
  };
}

/**
 * Scope-aware push safety (spec §12.3 #4): refuse to push to a public remote
 * if outgoing content touches any private path.
 *
 * Check order:
 *   1. Working-copy changes via status (catches unsaved private edits).
 *   2. Commit range via changedFilesInRange, if the engine supports it,
 *      comparing the local public stream against what the remote already has.
 *
 * Either hit blocks the push; we return the union of offending files so the
 * user gets one complete message.
 *
 * Returns { allowed: bool, reason?, files? }.
 */
export async function checkPushSafety(engine, repoRoot, targetRemote) {
  if (!targetRemote) return { allowed: true };
  if (targetRemote.scope !== "public") return { allowed: true };

  const globs = loadPrivateManifest(repoRoot);
  const offending = [];

  // Check 1: working-copy uncommitted changes.
  const statusResult = await engine.status();
  if (statusResult.ok && statusResult.data.raw) {
    const parsed = parseStatus(statusResult.data.raw);
    const { private: wcPriv } = partitionByScope(parsed.changed, globs);
    for (const f of wcPriv) offending.push({ ...f, source: "working-copy" });
  }

  // Check 2: commit-range (main vs its remote tracker), if engine supports it.
  // Skip gracefully when the engine method isn't present or the revset
  // doesn't resolve (e.g., remote never synced yet).
  if (typeof engine.changedFilesInRange === "function") {
    const range = `${targetRemote.name}/main..main`;
    const rangeResult = await engine.changedFilesInRange(range);
    if (rangeResult.ok) {
      const { private: rangePriv } = partitionByScope(rangeResult.data, globs);
      for (const f of rangePriv) offending.push({ ...f, source: "commit" });
    }
    // Errors here are non-fatal: "no remote tracking yet" is normal for first push.
  }

  if (offending.length === 0) return { allowed: true };

  // Deduplicate by path, preferring the "commit" source as more descriptive.
  const byPath = new Map();
  for (const f of offending) {
    if (!byPath.has(f.path) || f.source === "commit") byPath.set(f.path, f);
  }

  return {
    allowed: false,
    reason: "private-paths-in-push",
    files: Array.from(byPath.values()),
  };
}

export async function sync(args, opts) {
  const cwd = opts?.cwd || process.cwd();
  const engine = opts?.engine || getEngine();
  const parsed = parseSyncArgs(args);

  const target = resolveTargetRemote(cwd, parsed.remote);
  if (!target.ok) {
    process.stderr.write(`giti sync: ${target.error}\n`);
    process.exit(1);
  }

  const scopeTag = target.remote
    ? `[${target.remote.scope}] ${target.remote.name}`
    : "default";
  process.stdout.write(`Syncing (${scopeTag})...\n`);

  const remoteName = target.remote ? target.remote.name : undefined;

  // Pull first (fetch remote changes) unless --push was given alone.
  if (parsed.pull) {
    const fetchResult = typeof engine.fetch === "function"
      ? await engine.fetch({ remoteName })
      : await engine._rawSync("fetch");
    if (!fetchResult.ok) {
      process.stderr.write(`giti: pull failed: ${fetchResult.error}\n`);
      process.exit(1);
    }
  }

  // Push with scope-aware safety + scope-aware bookmark targeting.
  if (parsed.push) {
    const safety = await checkPushSafety(engine, cwd, target.remote);
    if (!safety.allowed) {
      process.stderr.write(
        `Cannot push: outgoing content includes private paths,\n` +
        `and '${target.remote.name}' is a public remote.\n\n`
      );
      for (const f of safety.files) {
        const where = f.source === "commit" ? "committed" : "unsaved";
        process.stderr.write(`  ${f.path}  (${f.kind}, ${where}, private)\n`);
      }
      process.stderr.write(
        "\nMove these to your private remote, unmark the pattern with\n" +
        "'giti private remove <pattern>', or push to a private remote with\n" +
        "'giti sync --remote <private-remote-name>'.\n"
      );
      process.exit(1);
    }

    const bookmarks = bookmarksForPush(target.remote);
    const pushResult = typeof engine.push === "function"
      ? await engine.push({ remoteName, bookmarks })
      : await engine._rawSync("push");
    if (!pushResult.ok) {
      // Push failure is non-fatal — might have nothing to push.
      if (!pushResult.error.includes("Nothing changed")) {
        process.stderr.write(`giti: push note: ${pushResult.error}\n`);
      }
    }
  }

  process.stdout.write("Synced.\n");
}
