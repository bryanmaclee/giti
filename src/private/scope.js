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
import { dirname, join } from "node:path";

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

// Pure glob-matching helpers authored in scrml at ../lib/scope-match.scrml
// (S10 slice 8 dogfood). Library-mode compile output is the .js sibling;
// regen with:
//   bun run ../scrmlTS/compiler/src/cli.js compile src/lib/scope-match.scrml \
//     -o src/lib --mode library
export {
  normalizeRelPath,
  matchGlob,
  isPrivatePath,
  partitionByScope,
} from "../lib/scope-match.js";

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

