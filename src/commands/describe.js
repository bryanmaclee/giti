/**
 * giti describe <hash> [message]
 *
 * Update the description of a previous save.
 *
 * Spec ref: giti-spec-v1.md §3.2 (jj describe exposed as giti describe)
 */

import { getEngine } from "../engine/index.js";

export async function describe(args) {
  const engine = getEngine();

  if (args.length === 0) {
    process.stderr.write("Usage: giti describe <hash> [message]\n");
    process.stderr.write("Updates the description of a previous save.\n");
    process.exit(1);
  }

  const target = args[0];
  const message = args.slice(1).join(" ");

  if (!message) {
    process.stderr.write("giti describe: provide a message.\n");
    process.stderr.write("Usage: giti describe <hash> \"new message\"\n");
    process.exit(1);
  }

  // Use the engine's raw jj describe command
  const result = await engine._rawDescribe
    ? await engine._rawDescribe(target, message)
    : { ok: false, error: "describe not supported by this engine" };

  if (!result.ok) {
    process.stderr.write(`giti: ${result.error}\n`);
    process.exit(1);
  }

  process.stdout.write(`Updated: ${target.slice(0, 8)} "${message}"\n`);
}
