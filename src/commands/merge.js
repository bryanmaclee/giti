/**
 * giti merge <name>
 *
 * Bring another line of work into yours.
 *
 * Spec ref: giti-spec-v1.md §2.3
 */

import { getEngine } from "../engine/index.js";

export async function merge(args) {
  const engine = getEngine();

  if (args.length === 0) {
    process.stderr.write("giti merge: specify which line of work to merge.\n");
    process.stderr.write("Usage: giti merge <name>\n");
    process.exit(1);
  }

  const name = args[0];
  const result = await engine.merge(name);

  if (!result.ok) {
    process.stderr.write(`giti: ${result.error}\n`);
    process.exit(1);
  }

  process.stdout.write(`Merged: ${name}\n`);
}
