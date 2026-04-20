/**
 * Private path scoping — spec §12.
 *
 * The private manifest is a file at `.giti/private` (relative to repo root)
 * containing glob patterns, one per line. Blank lines and lines beginning
 * with `#` are ignored. A path matching any pattern is private.
 *
 * The manifest itself is always treated as private — callers do not need
 * to list it explicitly.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, sep, posix } from "node:path";

export const MANIFEST_PATH = ".giti/private";
export const MANIFEST_FILE_NAME = "private";

/**
 * Read the private manifest. Returns an array of glob patterns, always
 * including the manifest's own path so the manifest never leaks public.
 *
 * @param {string} repoRoot
 * @returns {string[]}
 */
export function loadPrivateManifest(repoRoot) {
  const abs = join(repoRoot, MANIFEST_PATH);
  const globs = [MANIFEST_PATH];

  if (!existsSync(abs)) {
    return globs;
  }

  const raw = readFileSync(abs, "utf8");
  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line === MANIFEST_PATH) continue;
    globs.push(line);
  }
  return globs;
}

/**
 * Persist the manifest globs back to disk. The implicit manifest-self
 * pattern is not written; it is added back on every load.
 *
 * @param {string} repoRoot
 * @param {string[]} globs
 */
export function savePrivateManifest(repoRoot, globs) {
  const abs = join(repoRoot, MANIFEST_PATH);
  const dir = dirname(abs);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const filtered = globs
    .map((g) => g.trim())
    .filter((g) => g && !g.startsWith("#") && g !== MANIFEST_PATH);

  const unique = Array.from(new Set(filtered));
  const body = unique.length === 0 ? "" : unique.join("\n") + "\n";

  const header =
    "# giti private paths (spec §12)\n" +
    "# One glob per line. Matching files stay on the _private bookmark\n" +
    "# and are never pushed to remotes scoped 'public'.\n" +
    "\n";

  writeFileSync(abs, header + body, "utf8");
}

/**
 * Normalize a repo-relative path to forward-slash form for glob matching.
 *
 * @param {string} p
 * @returns {string}
 */
export function normalizeRelPath(p) {
  if (!p) return "";
  let out = p.replace(new RegExp(sep === "\\" ? "\\\\" : sep, "g"), "/");
  while (out.startsWith("./")) out = out.slice(2);
  while (out.startsWith("/")) out = out.slice(1);
  return out;
}

/**
 * Match a repo-relative path against a single glob.
 *
 * Supported: `*`, `**`, `?`, character classes `[abc]`. Patterns are anchored
 * at the repo root; they do NOT automatically match nested occurrences
 * (use `**` prefix for that). A trailing `/` or a bare directory name like
 * `foo/` matches any path inside that directory.
 *
 * @param {string} relPath
 * @param {string} glob
 * @returns {boolean}
 */
export function matchGlob(relPath, glob) {
  const p = normalizeRelPath(relPath);
  let g = glob.trim();
  if (!g) return false;

  // Directory pattern: `dir/` or `dir` with no glob metachar means everything under it.
  const hasMeta = /[*?\[]/.test(g);
  if (g.endsWith("/")) {
    const prefix = g.slice(0, -1);
    return p === prefix || p.startsWith(prefix + "/");
  }
  if (!hasMeta) {
    // Plain path: exact match OR directory-prefix match for safety.
    if (p === g) return true;
    return p.startsWith(g + "/");
  }

  // Compile glob to regex.
  const re = globToRegExp(g);
  return re.test(p);
}

/**
 * Decide whether a path is private according to the manifest globs.
 *
 * @param {string} relPath
 * @param {string[]} globs
 * @returns {boolean}
 */
export function isPrivatePath(relPath, globs) {
  if (!relPath) return false;
  for (const g of globs) {
    if (matchGlob(relPath, g)) return true;
  }
  return false;
}

/**
 * Partition a list of file change records (as produced by parseStatus)
 * into public and private lists.
 *
 * @param {Array<{path: string, kind?: string}>} files
 * @param {string[]} globs
 * @returns {{ public: typeof files, private: typeof files }}
 */
export function partitionByScope(files, globs) {
  const pub = [];
  const priv = [];
  for (const f of files) {
    if (isPrivatePath(f.path, globs)) priv.push(f);
    else pub.push(f);
  }
  return { public: pub, private: priv };
}

/**
 * Add a pattern to the manifest.
 * Returns { added: boolean, globs: string[] }.
 *
 * @param {string} repoRoot
 * @param {string} pattern
 */
export function addPrivatePattern(repoRoot, pattern) {
  const trimmed = (pattern || "").trim();
  if (!trimmed) return { added: false, reason: "empty pattern", globs: loadPrivateManifest(repoRoot) };

  const globs = loadPrivateManifest(repoRoot);
  if (globs.includes(trimmed)) {
    return { added: false, reason: "already present", globs };
  }
  const updated = [...globs, trimmed];
  savePrivateManifest(repoRoot, updated);
  return { added: true, globs: loadPrivateManifest(repoRoot) };
}

/**
 * Remove a pattern from the manifest.
 * Returns { removed: boolean, globs: string[] }.
 *
 * @param {string} repoRoot
 * @param {string} pattern
 */
export function removePrivatePattern(repoRoot, pattern) {
  const trimmed = (pattern || "").trim();
  if (!trimmed) return { removed: false, reason: "empty pattern", globs: loadPrivateManifest(repoRoot) };
  if (trimmed === MANIFEST_PATH) {
    return { removed: false, reason: "cannot unmark the manifest itself", globs: loadPrivateManifest(repoRoot) };
  }

  const globs = loadPrivateManifest(repoRoot);
  if (!globs.includes(trimmed)) {
    return { removed: false, reason: "not in manifest", globs };
  }
  const updated = globs.filter((g) => g !== trimmed);
  savePrivateManifest(repoRoot, updated);
  return { removed: true, globs: loadPrivateManifest(repoRoot) };
}

/**
 * Compile a glob pattern to a RegExp anchored at the start and end.
 * Shared between matchGlob and future callers.
 *
 * @param {string} glob
 * @returns {RegExp}
 */
function globToRegExp(glob) {
  let re = "^";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // `**` matches any sequence including `/`.
        re += ".*";
        i++;
        // Consume a following `/` so `**/foo` matches `foo` too.
        if (glob[i + 1] === "/") i++;
      } else {
        // Single `*` matches any sequence except `/`.
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if (c === "[") {
      const close = glob.indexOf("]", i + 1);
      if (close === -1) {
        re += "\\[";
      } else {
        re += glob.slice(i, close + 1);
        i = close;
      }
    } else if (/[.+^$(){}|\\]/.test(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  re += "$";
  return new RegExp(re);
}

export { globToRegExp };
