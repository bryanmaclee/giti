/**
 * giti status
 *
 * Show the current state of your work — what's changed, what's saved,
 * any conflicts. Human-friendly output per spec §10.1.
 *
 * Spec ref: giti-spec-v1.md §4.1 (conflict display), §9.2 (status)
 */

import { getEngine } from "../engine/index.js";

/**
 * Parse jj status output into structured data.
 *
 * jj status output typically looks like:
 *   Working copy changes:
 *   M src/main.js
 *   A src/new.js
 *   D src/old.js
 *   C src/conflict.js
 *   Working copy : abc123 (no description set)
 *   Parent commit: def456 "some message"
 *
 * Or with a bookmark:
 *   Working copy : abc123 feature-x
 */
export function parseStatus(raw) {
  const lines = raw.split("\n");
  const changed = [];
  const conflicts = [];
  let bookmark = null;

  for (const line of lines) {
    // Changed files: "M path", "A path", "D path"
    const fileMatch = line.match(/^([MAD])\s+(.+)$/);
    if (fileMatch) {
      const kind = fileMatch[1] === "M" ? "modified"
        : fileMatch[1] === "A" ? "added"
        : "deleted";
      changed.push({ kind, path: fileMatch[2].trim() });
      continue;
    }

    // Conflicted files: "C path"
    const conflictMatch = line.match(/^C\s+(.+)$/);
    if (conflictMatch) {
      conflicts.push(conflictMatch[1].trim());
      continue;
    }

    // Bookmark detection from Working copy line
    // e.g. "Working copy : abc123 feature-x"
    const bookmarkMatch = line.match(/^Working copy\s*:\s*\S+\s+(.+)/);
    if (bookmarkMatch) {
      const rest = bookmarkMatch[1].trim();
      // Ignore "(no description set)" and similar parenthetical notes
      if (rest && !rest.startsWith("(")) {
        bookmark = rest;
      }
    }
  }

  // Also detect conflict message
  const hasConflictMessage = /unresolved conflict/i.test(raw);

  return { changed, conflicts, bookmark, hasConflictMessage };
}

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
