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
  autoSplitSave,
  splitMessages,
} from "../private/save-routing.js";

// generateMessage authored in scrml at ../lib/save-message.scrml,
// parseSaveFlags in ../lib/cli-args.scrml (S10 slice 10 dogfood).
import { generateMessage } from "../lib/save-message.js";
import { parseSaveFlags } from "../lib/cli-args.js";
export { generateMessage, parseSaveFlags };

export async function save(args, opts) {
  const engine = opts?.engine || getEngine();
  const cwd = opts?.cwd || process.cwd();
  const { split: autoSplit, messageArgs } = parseSaveFlags(args);
  let message = messageArgs.join(" ") || null;

  // Get status to check for changes and generate auto-message
  const status = await engine.status();
  if (!status.ok) {
    process.stderr.write(`giti: ${status.error}\n`);
    process.exit(1);
  }

  // Classify the working-copy changes by scope (spec §12.2).
  const classification = classifyFromStatus(status.data.raw || "", cwd);

  if (classification.scope === "mixed") {
    if (!autoSplit) {
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
        "\nOptions:\n" +
        "  giti save --split [msg]  Split into two commits automatically.\n" +
        "  (stash one side, save, save the other)  Split manually.\n" +
        "  giti private remove <pattern>  Unmark a pattern if it should be public.\n"
      );
      process.exit(1);
    }

    // --split: auto-split into two commits.
    const { publicMessage, privateMessage } = splitMessages(
      message,
      generateMessage(classification.publicFiles),
      generateMessage(classification.privateFiles)
    );
    const plan = {
      publicFiles: classification.publicFiles,
      privateFiles: classification.privateFiles,
      publicMessage,
      privateMessage,
    };
    const result = await autoSplitSave(engine, plan);
    if (!result.ok) {
      process.stderr.write(
        `giti save --split failed at the '${result.stage}' step: ${result.error}\n`
      );
      process.exit(1);
    }

    process.stdout.write(`Saved 2 commits:\n`);
    process.stdout.write(`  public : ${publicMessage}\n`);
    process.stdout.write(`  private: ${privateMessage}\n`);

    for (const move of result.bookmarkMoves) {
      if (!move.ok) {
        process.stderr.write(
          `giti: note: could not advance bookmark '${move.name}' (${move.error})\n`
        );
      }
    }
    return;
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
