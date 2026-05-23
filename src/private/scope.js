/**
 * Private path scoping — spec §12.
 *
 * The private manifest is a file at `.giti/private` (relative to repo root)
 * containing glob patterns, one per line.
 *
 * All logic now lives in ../lib/scope-manifest.scrml (manifest I/O,
 * S10 slice 16) and ../lib/scope-match.scrml (pure glob matching,
 * S10 slice 8). This file is a thin re-export shim.
 */

export {
  MANIFEST_PATH,
  MANIFEST_FILE_NAME,
  loadPrivateManifest,
  savePrivateManifest,
  addPrivatePattern,
  removePrivatePattern,
} from "../lib/scope-manifest.js";

export {
  normalizeRelPath,
  matchGlob,
  isPrivatePath,
  partitionByScope,
} from "../lib/scope-match.js";
