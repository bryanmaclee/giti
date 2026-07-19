/**
 * giti status
 *
 * Show the current state of your work — what's changed, what's saved,
 * any conflicts. Human-friendly output per spec §10.1.
 *
 * Spec ref: giti-spec-v1.md §4.1 (conflict display), §9.2 (status)
 */

import { getEngine } from "../engine/index.js";
// parseStatus authored in scrml at ../lib/parse-status.scrml (S10 slice 7
// dogfood). Library-mode compile output is the .js sibling; regen with:
//   bun run ../scrml/compiler/src/cli.js compile src/lib/parse-status.scrml \
//     -o src/lib --mode library
import { parseStatus } from "../lib/parse-status.js";
export { parseStatus };

// formatStatus authored in scrml at ../lib/format-status.scrml.
import { formatStatus } from "../lib/format-status.js";
export { formatStatus };

export async function status(args) {
  // --merge-log: the §4.3.4 review surface for auto-resolved merges. Reads a
  // local record only, so it works without touching the engine.
  if ((args || []).includes("--merge-log")) {
    const { readMergeLog, formatMergeLog } = await import("../merge/merge-log.js");
    const log = readMergeLog(process.cwd());
    process.stdout.write(formatMergeLog(log.entries) + "\n");
    return;
  }

  const engine = getEngine();
  const result = await engine.status();

  if (!result.ok) {
    process.stderr.write(`giti: ${result.error}\n`);
    process.exit(1);
  }

  if (!result.data.raw || result.data.raw.trim() === "") {
    process.stdout.write("Everything is clean.\n");
    return;
  }

  const parsed = parseStatus(result.data.raw);
  const output = formatStatus(parsed);
  process.stdout.write(output + "\n");
}
