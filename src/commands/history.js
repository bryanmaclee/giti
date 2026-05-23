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

const SINCE_FETCH_CAP = 1000;

export function parseDuration(s) {
  if (typeof s !== "string") {
    return { ok: false, error: "duration is required" };
  }
  const m = s.match(/^(\d+)(m|h|d)$/);
  if (!m) {
    return {
      ok: false,
      error: `invalid duration '${s}'. Use forms like 30m, 2h, 1d, 7d.`,
    };
  }
  const n = parseInt(m[1], 10);
  if (n === 0) {
    return { ok: false, error: "duration must be positive (e.g. 30m, 2h, 1d)" };
  }
  const unitMs = { m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]];
  return { ok: true, ms: n * unitMs };
}

/**
 * Parse a "YYYY-MM-DD HH:MM" timestamp (as emitted by the jj engine
 * template using .local().format()) into epoch ms. Returns NaN on
 * unparseable input.
 */
export function parseTimestamp(s) {
  if (typeof s !== "string") return NaN;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!m) return NaN;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();
}

function extractSince(args) {
  const i = args.indexOf("--since");
  if (i === -1) return { since: null, rest: args };
  const value = args[i + 1];
  return {
    since: value,
    rest: args.slice(0, i).concat(args.slice(i + 2)),
  };
}

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
