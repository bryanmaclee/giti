/**
 * Remote scope configuration — spec §12.3.
 *
 * Each configured remote has a scope: "public" (default) or "private".
 * A public remote receives only public-stream commits. A private remote
 * receives both streams.
 *
 * Stored in `.giti/remotes.json` (machine-local, not version-controlled).
 * Schema:
 *   {
 *     "remotes": [
 *       { "name": "origin", "url": "https://...", "scope": "public" },
 *       { "name": "private", "url": "git@...", "scope": "private" }
 *     ]
 *   }
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export const REMOTES_PATH = ".giti/remotes.json";

export const SCOPES = ["public", "private"];

function emptyConfig() {
  return { remotes: [] };
}

export function loadRemoteConfig(repoRoot) {
  const abs = join(repoRoot, REMOTES_PATH);
  if (!existsSync(abs)) return emptyConfig();

  try {
    const raw = readFileSync(abs, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.remotes)) return emptyConfig();
    const remotes = parsed.remotes
      .filter((r) => r && typeof r.name === "string")
      .map((r) => ({
        name: r.name,
        url: typeof r.url === "string" ? r.url : "",
        scope: SCOPES.includes(r.scope) ? r.scope : "public",
      }));
    return { remotes };
  } catch {
    // Corrupt config: return empty rather than crash, so user can `giti remote add` to recover.
    return emptyConfig();
  }
}

export function saveRemoteConfig(repoRoot, cfg) {
  const abs = join(repoRoot, REMOTES_PATH);
  const dir = dirname(abs);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const normalized = {
    remotes: (cfg.remotes || []).map((r) => ({
      name: r.name,
      url: r.url || "",
      scope: SCOPES.includes(r.scope) ? r.scope : "public",
    })),
  };
  writeFileSync(abs, JSON.stringify(normalized, null, 2) + "\n", "utf8");
}

export function getRemote(repoRoot, name) {
  const cfg = loadRemoteConfig(repoRoot);
  return cfg.remotes.find((r) => r.name === name) || null;
}

export function listRemotes(repoRoot) {
  return loadRemoteConfig(repoRoot).remotes;
}

/**
 * Add a remote. Returns { added, reason?, remote? }.
 */
export function addRemote(repoRoot, name, url, scope) {
  if (!name || !name.trim()) return { added: false, reason: "name required" };
  if (!url || !url.trim()) return { added: false, reason: "url required" };
  const finalScope = SCOPES.includes(scope) ? scope : "public";

  const cfg = loadRemoteConfig(repoRoot);
  if (cfg.remotes.some((r) => r.name === name)) {
    return { added: false, reason: "already exists" };
  }

  const remote = { name, url, scope: finalScope };
  cfg.remotes.push(remote);
  saveRemoteConfig(repoRoot, cfg);
  return { added: true, remote };
}

/**
 * Remove a remote by name. Returns { removed, reason? }.
 */
export function removeRemote(repoRoot, name) {
  if (!name || !name.trim()) return { removed: false, reason: "name required" };
  const cfg = loadRemoteConfig(repoRoot);
  const before = cfg.remotes.length;
  cfg.remotes = cfg.remotes.filter((r) => r.name !== name);
  if (cfg.remotes.length === before) {
    return { removed: false, reason: "not found" };
  }
  saveRemoteConfig(repoRoot, cfg);
  return { removed: true };
}

/**
 * Change a remote's scope.
 *
 * Safety rail (spec §12.3 #6): changing from "private" to "public" requires
 * `opts.unsafe === true` because it exposes private content at the next push.
 * The reverse (public → private) is always safe.
 *
 * @param {string} repoRoot
 * @param {string} name
 * @param {"public"|"private"} scope
 * @param {{ unsafe?: boolean }} [opts]
 * @returns {{ changed: boolean, reason?: string, remote?: object }}
 */
export function setRemoteScope(repoRoot, name, scope, opts) {
  if (!SCOPES.includes(scope)) {
    return { changed: false, reason: `invalid scope; expected one of: ${SCOPES.join(", ")}` };
  }

  const cfg = loadRemoteConfig(repoRoot);
  const remote = cfg.remotes.find((r) => r.name === name);
  if (!remote) return { changed: false, reason: "not found" };

  if (remote.scope === scope) return { changed: false, reason: "already that scope" };

  // Spec §12.3 #6: demoting private → public requires --unsafe.
  if (remote.scope === "private" && scope === "public" && !(opts && opts.unsafe)) {
    return {
      changed: false,
      reason:
        "refusing to downgrade a private remote to public without --unsafe. " +
        "Private history will become visible at the next push.",
    };
  }

  remote.scope = scope;
  saveRemoteConfig(repoRoot, cfg);
  return { changed: true, remote };
}
