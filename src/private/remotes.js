/**
 * Remote scope configuration — spec §12.3.
 *
 * All logic now lives in ../lib/remotes.scrml (S10 slice 15 dogfood).
 * This file is a thin re-export shim for back-compat with existing
 * import paths.
 *
 * Regen scrml output with:
 *   bun run ../scrml/compiler/src/cli.js compile src/lib/remotes.scrml \
 *     -o src/lib --mode library
 */

export {
  REMOTES_PATH,
  SCOPES,
  loadRemoteConfig,
  saveRemoteConfig,
  getRemote,
  listRemotes,
  addRemote,
  removeRemote,
  setRemoteScope,
} from "../lib/remotes.js";
