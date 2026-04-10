/**
 * giti undo
 *
 * Undo the last operation. Every giti operation is undoable.
 * No silent data destruction — ever.
 *
 * Spec ref: giti-spec-v1.md §2.4
 */

import { getEngine } from "../engine/index.js";

export async function undo(args) {
  const engine = getEngine();
  const result = await engine.undo();

  if (!result.ok) {
    process.stderr.write(`giti: ${result.error}\n`);
    process.exit(1);
  }

  process.stdout.write("Undone.\n");
}
