/**
 * giti history
 *
 * Show what happened. Clean, human-readable log.
 *
 * Spec ref: giti-spec-v1.md §2.5
 */

import { getEngine } from "../engine/index.js";

export async function history(args) {
  const engine = getEngine();
  const limit = args[0] ? parseInt(args[0], 10) : 20;
  const result = await engine.history(limit);

  if (!result.ok) {
    process.stderr.write(`giti: ${result.error}\n`);
    process.exit(1);
  }

  if (result.data.length === 0) {
    process.stdout.write("No history yet. Use 'giti save' to save your work.\n");
    return;
  }

  for (const entry of result.data) {
    const desc = entry.description || "(no message)";
    const time = entry.timestamp || "";
    process.stdout.write(`  ${entry.changeId.slice(0, 8)}  ${desc}  ${time}\n`);
  }
}
