/**
 * giti remote <subcommand> — manage remote repositories and their scope.
 *
 * Subcommands:
 *   giti remote add <name> <url> [--public | --private]
 *   giti remote remove <name>
 *   giti remote set-scope <name> <public|private> [--unsafe]
 *   giti remote list
 *
 * Remote scope (spec §12.3) determines what gets pushed:
 *   - public: only the public-stream (default)
 *   - private: public + private streams
 */

import {
  addRemote,
  removeRemote,
  listRemotes,
  setRemoteScope,
} from "../private/remotes.js";

const USAGE = `Usage: giti remote <subcommand> [args]

Subcommands:
  add <name> <url> [--public | --private]  Register a remote (default: --public).
  remove <name>                             Unregister a remote.
  set-scope <name> public | private [--unsafe]
                                            Change a remote's scope.
  list                                      Show all configured remotes.

A remote's scope controls what gets pushed:
  public   — only your public line of work syncs to this remote.
  private  — your private overlay syncs here too (use for your own machines).
`;

export async function remote(args, opts) {
  const repoRoot = opts?.cwd || process.cwd();
  const sub = args[0];

  if (!sub || sub === "--help" || sub === "-h") {
    process.stdout.write(USAGE);
    return;
  }

  if (sub === "list") {
    const remotes = listRemotes(repoRoot);
    if (remotes.length === 0) {
      process.stdout.write("No remotes configured.\n");
      return;
    }
    // Column-aligned: name<TAB>scope<TAB>url
    const nameW = Math.max(...remotes.map((r) => r.name.length), 4);
    for (const r of remotes) {
      const pad = " ".repeat(Math.max(1, nameW - r.name.length + 2));
      const scopeTag = r.scope === "private" ? "[private]" : "[public] ";
      process.stdout.write(`${r.name}${pad}${scopeTag}  ${r.url}\n`);
    }
    return;
  }

  if (sub === "add") {
    const name = args[1];
    const url = args[2];
    const rest = args.slice(3);
    if (!name || !url) {
      process.stderr.write("giti remote add: expected <name> <url>\n");
      process.exit(1);
    }
    const scope = rest.includes("--private") ? "private" : "public";
    const result = addRemote(repoRoot, name, url, scope);
    if (result.added) {
      const tag = scope === "private" ? "private" : "public";
      process.stdout.write(`Added remote '${name}' (${tag}): ${url}\n`);
      return;
    }
    process.stderr.write(`giti remote add: ${name} (${result.reason})\n`);
    process.exit(1);
  }

  if (sub === "remove") {
    const name = args[1];
    if (!name) {
      process.stderr.write("giti remote remove: name required\n");
      process.exit(1);
    }
    const result = removeRemote(repoRoot, name);
    if (result.removed) {
      process.stdout.write(`Removed remote '${name}'.\n`);
      return;
    }
    process.stderr.write(`giti remote remove: ${name} (${result.reason})\n`);
    process.exit(1);
  }

  if (sub === "set-scope") {
    const name = args[1];
    const scope = args[2];
    const rest = args.slice(3);
    if (!name || !scope) {
      process.stderr.write("giti remote set-scope: expected <name> <public|private>\n");
      process.exit(1);
    }
    const unsafe = rest.includes("--unsafe");
    const result = setRemoteScope(repoRoot, name, scope, { unsafe });
    if (result.changed) {
      process.stdout.write(`Remote '${name}' is now ${scope}.\n`);
      return;
    }
    process.stderr.write(`giti remote set-scope: ${name} (${result.reason})\n`);
    process.exit(1);
  }

  process.stderr.write(`giti remote: unknown subcommand '${sub}'\n`);
  process.stderr.write(USAGE);
  process.exit(1);
}
