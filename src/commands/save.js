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

export async function save(args) {
  const engine = getEngine();
  let message = args.join(" ") || null;

  // Get status to check for changes and generate auto-message
  const status = await engine.status();
  if (!status.ok) {
    process.stderr.write(`giti: ${status.error}\n`);
    process.exit(1);
  }

  // Auto-generate message from changed files if none provided
  if (!message && status.data.raw) {
    const parsed = parseStatus(status.data.raw);
    message = generateMessage(parsed.changed);
  }

  const result = await engine.save(message);
  if (!result.ok) {
    process.stderr.write(`giti: ${result.error}\n`);
    process.exit(1);
  }

  process.stdout.write(`Saved: ${result.data.description}\n`);
}
