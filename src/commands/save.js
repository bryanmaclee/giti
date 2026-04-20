/**
 * giti save [message]
 *
 * Save your current work. Like hitting Ctrl+S but for your whole project.
 * If no message is given, giti generates one from what changed.
 *
 * Spec ref: giti-spec-v1.md §2.1
 */

import { getEngine } from "../engine/index.js";
import { parseStatus } from "./status.js";
import {
  classifyFromStatus,
  planBookmarkMoves,
  advanceBookmarks,
} from "../private/save-routing.js";

/**
 * Generate a save message from changed files when none is provided.
 * Returns a short human-readable description of what changed.
 */
export function generateMessage(changed) {
  if (!changed || changed.length === 0) {
    return "save";
  }

  if (changed.length === 1) {
    const f = changed[0];
    const filename = f.path.split("/").pop();
    const verb = f.kind === "added" ? "Add"
      : f.kind === "deleted" ? "Remove"
      : "Update";
    return `${verb} ${filename}`;
  }

  // Multiple files — summarize by count
  const added = changed.filter(f => f.kind === "added").length;
  const deleted = changed.filter(f => f.kind === "deleted").length;
  const modified = changed.filter(f => f.kind === "modified").length;

  const parts = [];
  if (added > 0) parts.push(`add ${added}`);
  if (modified > 0) parts.push(`update ${modified}`);
  if (deleted > 0) parts.push(`remove ${deleted}`);

  return `${parts.join(", ")} file${changed.length !== 1 ? "s" : ""}`;
}

export async function save(args, opts) {
  const engine = opts?.engine || getEngine();
  const cwd = opts?.cwd || process.cwd();
  let message = args.join(" ") || null;

  // Get status to check for changes and generate auto-message
  const status = await engine.status();
  if (!status.ok) {
    process.stderr.write(`giti: ${status.error}\n`);
    process.exit(1);
  }

  // Classify the working-copy changes by scope (spec §12.2).
  const classification = classifyFromStatus(status.data.raw || "", cwd);

  // Slice 3 refuses mixed commits; auto-splitting is deferred to slice 4.
  if (classification.scope === "mixed") {
    process.stderr.write(
      "Cannot save: this change touches both public and private paths.\n\n"
    );
    process.stderr.write("Private:\n");
    for (const f of classification.privateFiles) {
      process.stderr.write(`  ${f.path}  (${f.kind})\n`);
    }
    process.stderr.write("Public:\n");
    for (const f of classification.publicFiles) {
      process.stderr.write(`  ${f.path}  (${f.kind})\n`);
    }
    process.stderr.write(
      "\nSave them as separate commits (stash one side, save, then save the other),\n" +
      "or unmark paths with 'giti private remove <pattern>' if they should be public.\n"
    );
    process.exit(1);
  }

  // Auto-generate message from changed files if none provided.
  if (!message && status.data.raw) {
    message = generateMessage(classification.parsed.changed);
  }

  const result = await engine.save(message);
  if (!result.ok) {
    process.stderr.write(`giti: ${result.error}\n`);
    process.exit(1);
  }

  // Advance the right bookmarks (spec §12.2 two-stream model).
  const bookmarks = planBookmarkMoves(classification.scope);
  if (bookmarks.length > 0) {
    const moves = await advanceBookmarks(engine, bookmarks, "@-");
    const failures = moves.filter((m) => !m.ok);
    // Bookmark-move failure is reported but not fatal — the save itself succeeded.
    for (const fail of failures) {
      process.stderr.write(
        `giti: note: could not advance bookmark '${fail.name}' (${fail.error})\n`
      );
    }
  }

  const scopeTag =
    classification.scope === "private" ? " [private]"
    : classification.scope === "public" ? ""
    : "";
  process.stdout.write(`Saved${scopeTag}: ${result.data.description}\n`);
}
