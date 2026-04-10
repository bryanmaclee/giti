/**
 * giti init
 *
 * Initialize a new giti repository.
 *
 * Spec ref: giti-spec-v1.md §3
 */

import { getEngine } from "../engine/index.js";

export async function init(args) {
  const engine = getEngine();
  const path = args[0] || process.cwd();
  const result = await engine.init(path);

  if (!result.ok) {
    process.stderr.write(`giti: ${result.error}\n`);
    process.exit(1);
  }

  process.stdout.write(`Initialized giti repository in ${result.data.path}\n`);
}
