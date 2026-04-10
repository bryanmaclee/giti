/**
 * Engine factory — returns the active VCS engine.
 *
 * v1: JjCliEngine (jj subprocess)
 * Future: JjWasmEngine (jj-lib via WASM, pending OQ-1)
 */

import { JjCliEngine } from "./jj-cli.js";

let _engine = null;

export function getEngine(repoPath) {
  if (!_engine) {
    _engine = new JjCliEngine(repoPath);
  }
  return _engine;
}
