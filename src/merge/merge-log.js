/**
 * Merge log — the audit record for auto-resolved merges.
 *
 * Spec §4.3.4 is normative and uses SHALL:
 *   "Auto-resolved merges SHALL be logged and visible in `giti status
 *    --merge-log` for review."
 *
 * And §4.4.4 sets the reason:
 *   "A compiler-approved merge DOES NOT replace human review for design
 *    intent. A developer MAY flag any merge (even a compiler-clean one) for
 *    human review before landing."
 *
 * So this is not bookkeeping — it is the mechanism that keeps an automatic
 * resolution reviewable. Anything the driver resolved without asking gets an
 * entry, including the CLEAN ones. Semantic and structural conflicts are logged
 * too: they were surfaced to a human, and the record of what the tool refused
 * is as useful as what it accepted.
 *
 * Store: `.giti/merge-log.json`, alongside `.giti/private` and
 * `.giti/remotes.json`.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

export const MERGE_LOG_PATH = ".giti/merge-log.json";
const FORMAT_VERSION = 1;

function logPath(repoRoot) {
  return join(repoRoot || process.cwd(), MERGE_LOG_PATH);
}

/**
 * Read the merge log. A missing or unreadable log is an EMPTY log, never an
 * error: an audit record failing to parse must not block a merge.
 * @returns {{ version: number, entries: object[] }}
 */
export function readMergeLog(repoRoot) {
  const file = logPath(repoRoot);
  if (!existsSync(file)) return { version: FORMAT_VERSION, entries: [] };
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const entries = Array.isArray(parsed?.entries) ? parsed.entries : [];
    return { version: parsed?.version ?? FORMAT_VERSION, entries };
  } catch {
    return { version: FORMAT_VERSION, entries: [] };
  }
}

/**
 * Append one entry. Returns { ok: true, data: { count } } or { ok: false, error }.
 *
 * @param {string} repoRoot
 * @param {object} entry { path, verdict, decisions?, diagnostics?, reason?, timestamp? }
 */
export function appendMergeLog(repoRoot, entry) {
  const file = logPath(repoRoot);
  const log = readMergeLog(repoRoot);
  const record = {
    timestamp: entry.timestamp || new Date().toISOString(),
    path: entry.path,
    verdict: entry.verdict,
    decisions: entry.decisions || [],
    diagnostics: entry.diagnostics || [],
  };
  if (entry.reason) record.reason = entry.reason;
  log.entries.push(record);
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ version: FORMAT_VERSION, entries: log.entries }, null, 2) + "\n");
    return { ok: true, data: { count: log.entries.length } };
  } catch (e) {
    return { ok: false, error: `could not write ${MERGE_LOG_PATH}: ${e.message}` };
  }
}

/**
 * Render the log for `giti status --merge-log`. Newest last, matching the
 * reading order of a terminal scrollback.
 */
export function formatMergeLog(entries) {
  if (!entries || entries.length === 0) {
    return "No auto-resolved merges recorded.";
  }

  const MARK = {
    "clean": "auto-accepted",
    "accept-with-review": "accepted, review advised",
    "semantic-conflict": "REFUSED — merge introduced type errors",
    "structural-conflict": "REFUSED — could not merge structurally",
  };

  const lines = ["Merge log — auto-resolved merges (spec §4.3.4)", ""];
  for (const e of entries) {
    const when = (e.timestamp || "").replace("T", " ").replace(/\..*$/, "");
    lines.push(`  ${when}  ${e.path}`);
    lines.push(`    ${MARK[e.verdict] || e.verdict}`);
    if (e.decisions?.length) {
      lines.push(`    combined: ${e.decisions.join(", ")}`);
    }
    for (const d of e.diagnostics || []) {
      lines.push(`    ${d.message || d}`);
    }
    if (e.reason && !e.diagnostics?.length) {
      lines.push(`    ${e.reason}`);
    }
    lines.push("");
  }
  lines.push("A compiler-approved merge is not a substitute for human review (§4.4.4).");
  return lines.join("\n");
}
