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

const USAGE = `Usage: giti private <subcommand> [args]

Subcommands:
  add <pattern>     Mark paths matching <pattern> as private.
  remove <pattern>  Unmark a previously added pattern.
  list              Show the current private patterns.

Private paths stay local to your private remote. They do not push to
remotes scoped 'public' and they are rejected by 'giti land'.
See giti-spec-v1.md §12 for the full model.
`;

export async function private_(args, opts) {
  const repoRoot = opts?.cwd || process.cwd();
  const sub = args[0];

  if (!sub || sub === "--help" || sub === "-h") {
    process.stdout.write(USAGE);
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
