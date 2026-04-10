/**
 * giti sync
 *
 * Synchronize with the remote. Pushes your saves, pulls others' saves.
 * The jj engine handles all the complexity.
 *
 * Spec ref: giti-spec-v1.md §3.4 (git compatibility)
 */

import { getEngine } from "../engine/index.js";

export async function sync(args) {
  const engine = getEngine();

  process.stdout.write("Syncing...\n");

  // Pull first (fetch remote changes)
  const fetchResult = await engine._rawSync("fetch");
  if (!fetchResult.ok) {
    process.stderr.write(`giti: pull failed: ${fetchResult.error}\n`);
    process.exit(1);
  }

  // Push (send local changes)
  const pushResult = await engine._rawSync("push");
  if (!pushResult.ok) {
    // Push failure is non-fatal — might have nothing to push
    if (!pushResult.error.includes("Nothing changed")) {
      process.stderr.write(`giti: push note: ${pushResult.error}\n`);
    }
  }

  process.stdout.write("Synced.\n");
}
