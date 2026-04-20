/**
 * giti link-private <url> [--name NAME]
 *
 * Attach a private remote to an existing clone. Bootstrap step for
 * multi-machine use: clone a public repo, then link your private overlay
 * so personal context (hand-offs, voice logs, private configs) syncs too.
 *
 * Spec ref: giti-spec-v1.md §12.5.
 */

import { addRemote, getRemote } from "../private/remotes.js";
import { getEngine } from "../engine/index.js";
import { PRIVATE_BOOKMARK } from "../private/save-routing.js";

const USAGE = `Usage: giti link-private <url> [--name NAME]

Attaches a private remote to this clone. Your private paths (see
'giti private list') will sync to this remote via 'giti sync'.

On first run this also creates the local '_private' bookmark (if missing)
at the current 'main' head, so your next private-only save has a home.

Options:
  --name NAME   Register under this remote name. Defaults to 'private'.
`;

export async function linkPrivate(args, opts) {
  const repoRoot = opts?.cwd || process.cwd();
  const engine = opts?.engine || getEngine();
  const url = args[0];

  if (!url || url === "--help" || url === "-h") {
    process.stdout.write(USAGE);
    if (!url) process.exit(1);
    return;
  }

  let name = "private";
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--name") {
      name = args[i + 1];
      if (!name) {
        process.stderr.write("giti link-private: --name requires a value\n");
        process.exit(1);
      }
      i++;
    }
  }

  // If a remote with that name already exists, report and exit.
  const existing = getRemote(repoRoot, name);
  if (existing) {
    process.stderr.write(
      `giti link-private: a remote named '${name}' already exists (${existing.scope}). ` +
      `Remove it first or pass --name <other>.\n`
    );
    process.exit(1);
  }

  const result = addRemote(repoRoot, name, url, "private");
  if (!result.added) {
    process.stderr.write(`giti link-private: ${result.reason}\n`);
    process.exit(1);
  }

  process.stdout.write(`Linked private remote '${name}': ${url}\n`);

  // Auto-create local _private bookmark at current main head (non-fatal).
  if (typeof engine.bookmarkExists === "function" &&
      typeof engine.setBookmark === "function") {
    const existsResult = await engine.bookmarkExists(PRIVATE_BOOKMARK);
    if (existsResult.ok && !existsResult.data) {
      const created = await engine.setBookmark(PRIVATE_BOOKMARK, "bookmarks(main)");
      if (created.ok) {
        process.stdout.write(`Created local bookmark '${PRIVATE_BOOKMARK}' at main.\n`);
      } else {
        process.stderr.write(
          `Note: could not create '${PRIVATE_BOOKMARK}' bookmark yet (${created.error}). ` +
          `It will be created on your first private save.\n`
        );
      }
    }
  }

  process.stdout.write(`Run 'giti sync --remote ${name}' to pull your private overlay.\n`);
}
