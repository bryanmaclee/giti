/**
 * giti private <subcommand> — manage private path scopes (spec §12).
 *
 * Subcommands:
 *   giti private add <pattern>     mark paths matching pattern as private
 *   giti private remove <pattern>  unmark a previously added pattern
 *   giti private list              show all current private patterns
 */

import {
  addPrivatePattern,
  removePrivatePattern,
  loadPrivateManifest,
  MANIFEST_PATH,
} from "../private/scope.js";
import { classifyFromStatus } from "../private/save-routing.js";
import { getEngine } from "../engine/index.js";

const USAGE = `Usage: giti private <subcommand> [args]

Subcommands:
  add <pattern>     Mark paths matching <pattern> as private.
  remove <pattern>  Unmark a previously added pattern.
  list              Show the current private patterns.
  status            Show current changes annotated by scope.

Private paths stay local to your private remote. They do not push to
remotes scoped 'public' and they are rejected by 'giti land'.
See giti-spec-v1.md §12 for the full model.
`;

export async function private_(args, opts) {
  const repoRoot = opts?.cwd || process.cwd();
  const engine = opts?.engine || getEngine();
  const sub = args[0];

  if (!sub || sub === "--help" || sub === "-h") {
    process.stdout.write(USAGE);
    return;
  }

  if (sub === "status") {
    const statusResult = await engine.status();
    if (!statusResult.ok) {
      process.stderr.write(`giti private status: ${statusResult.error}\n`);
      process.exit(1);
    }
    const classification = classifyFromStatus(statusResult.data.raw || "", repoRoot);
    if (classification.scope === "empty") {
      process.stdout.write("No changes.\n");
      return;
    }

    if (classification.publicFiles.length > 0) {
      process.stdout.write("Public changes:\n");
      for (const f of classification.publicFiles) {
        process.stdout.write(`  ${f.kind.padEnd(8)} ${f.path}\n`);
      }
    }
    if (classification.privateFiles.length > 0) {
      if (classification.publicFiles.length > 0) process.stdout.write("\n");
      process.stdout.write("Private changes:\n");
      for (const f of classification.privateFiles) {
        process.stdout.write(`  ${f.kind.padEnd(8)} ${f.path}\n`);
      }
    }

    process.stdout.write("\n");
    if (classification.scope === "mixed") {
      process.stdout.write(
        "Mixed. 'giti save' will refuse; use 'giti save --split [msg]' to split.\n"
      );
    } else if (classification.scope === "private") {
      process.stdout.write("'giti save' will advance the private bookmark only.\n");
    } else {
      process.stdout.write("'giti save' will advance both main and private bookmarks.\n");
    }
    return;
  }

  if (sub === "list") {
    const globs = loadPrivateManifest(repoRoot);
    // Never display the implicit self-pattern; it's automatic.
    const userGlobs = globs.filter((g) => g !== MANIFEST_PATH);
    if (userGlobs.length === 0) {
      process.stdout.write("No private paths configured.\n");
      process.stdout.write(
        `(The manifest at ${MANIFEST_PATH} is always private automatically.)\n`
      );
      return;
    }
    for (const g of userGlobs) {
      process.stdout.write(g + "\n");
    }
    return;
  }

  if (sub === "add") {
    const pattern = args[1];
    if (!pattern) {
      process.stderr.write("giti private add: pattern required\n");
      process.exit(1);
    }
    const result = addPrivatePattern(repoRoot, pattern);
    if (result.added) {
      process.stdout.write(`Added private pattern: ${pattern}\n`);
      return;
    }
    const reason = result.reason || "not added";
    process.stderr.write(`giti private add: ${pattern} (${reason})\n`);
    // Idempotent: an already-present pattern is not a hard error.
    if (reason === "already present") return;
    process.exit(1);
  }

  if (sub === "remove") {
    const pattern = args[1];
    if (!pattern) {
      process.stderr.write("giti private remove: pattern required\n");
      process.exit(1);
    }
    const result = removePrivatePattern(repoRoot, pattern);
    if (result.removed) {
      process.stdout.write(`Removed private pattern: ${pattern}\n`);
      process.stdout.write(
        "Note: any existing content at that path remains on the private\n" +
        "bookmark. It will not automatically appear in a public save.\n"
      );
      return;
    }
    const reason = result.reason || "not removed";
    process.stderr.write(`giti private remove: ${pattern} (${reason})\n`);
    process.exit(1);
  }

  process.stderr.write(`giti private: unknown subcommand '${sub}'\n`);
  process.stderr.write(USAGE);
  process.exit(1);
}
