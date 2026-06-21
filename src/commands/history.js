/**
 * giti history
 *
 * Show what happened. Clean, human-readable log.
 *
 * Spec ref: giti-spec-v1.md §2.5
 * Flags:
 *   --since <duration>   only show saves within the time window (GAP-8)
 *                        durations: 30m, 2h, 1d, 7d (positive integer + m|h|d)
 */

import { getEngine } from "../engine/index.js";
// parseDuration / parseTimestamp authored in scrml at ../lib/duration.scrml
// (S10 dogfood experiment). Library-mode compile output is the .js
// sibling; regen with:
//   bun run ../scrml/compiler/src/cli.js compile src/lib/duration.scrml \
//     -o src/lib --mode library
import { parseDuration, parseTimestamp } from "../lib/duration.js";
export { parseDuration, parseTimestamp };

// extractSince also lives in scrml at ../lib/cli-args.scrml (S10 slice 9).
import { extractSince } from "../lib/cli-args.js";

const SINCE_FETCH_CAP = 1000;

export async function history(args, { now = Date.now, getEngine: _getEngine = getEngine } = {}) {
  const { since, rest } = extractSince(args);

  let fetchLimit;
  let windowMs = null;

  if (since !== null) {
    const parsed = parseDuration(since);
    if (!parsed.ok) {
      process.stderr.write(`giti history: ${parsed.error}\n`);
      process.exit(1);
    }
    windowMs = parsed.ms;
    fetchLimit = SINCE_FETCH_CAP;
  } else {
    fetchLimit = rest[0] ? parseInt(rest[0], 10) : 20;
  }

  const engine = _getEngine();
  const result = await engine.history(fetchLimit);

  if (!result.ok) {
    process.stderr.write(`giti: ${result.error}\n`);
    process.exit(1);
  }

  let entries = result.data;
  if (windowMs !== null) {
    const cutoff = now() - windowMs;
    entries = entries.filter((e) => {
      const t = parseTimestamp(e.timestamp);
      return Number.isFinite(t) && t >= cutoff;
    });
  }

  if (entries.length === 0) {
    if (windowMs !== null) {
      process.stdout.write(`No saves in the last ${since}.\n`);
    } else {
      process.stdout.write("No history yet. Use 'giti save' to save your work.\n");
    }
    return;
  }

  for (const entry of entries) {
    const desc = entry.description || "(no message)";
    const time = entry.timestamp || "";
    process.stdout.write(`  ${entry.changeId.slice(0, 8)}  ${desc}  ${time}\n`);
  }
}
