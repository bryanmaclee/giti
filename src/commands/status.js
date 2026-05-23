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
//   bun run ../scrmlTS/compiler/src/cli.js compile src/lib/parse-status.scrml \
//     -o src/lib --mode library
import { parseStatus } from "../lib/parse-status.js";
export { parseStatus };

/**
 * Format parsed status into human-friendly output.
 */
export function formatStatus({ changed, conflicts, bookmark, hasConflictMessage }) {
  const parts = [];

  // Conflict display (highest priority)
  const hasConflicts = conflicts.length > 0 || hasConflictMessage;
  if (hasConflicts) {
    const count = conflicts.length || "some";
    parts.push(`\u26a0 Conflicts in ${count} file${conflicts.length !== 1 ? "s" : ""}:`);
    for (const f of conflicts) {
      parts.push(`  ${f}`);
    }
    parts.push("");
    parts.push("Resolve these files then run `giti save`.");
    parts.push("");
  }

  // Changed files
  if (changed.length > 0) {
    parts.push("You have unsaved changes:");
    for (const f of changed) {
      const label = f.kind === "added" ? "new"
        : f.kind === "deleted" ? "deleted"
        : "modified";
      parts.push(`  ${label}: ${f.path}`);
    }
    parts.push("");
  }

  // Bookmark / working context
  if (bookmark) {
    parts.push(`You're working on: ${bookmark}`);
  }

  // Clean state
  if (!hasConflicts && changed.length === 0) {
    parts.push("Everything is clean.");
  }

  return parts.join("\n");
}

export async function status(args) {
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
