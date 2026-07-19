/**
 * giti merge <name>
 *
 * Bring another line of work into yours.
 *
 * When the merge leaves conflicts, giti attempts AST-level auto-resolution on
 * conflicted `.scrml` files: an entity-level merge, then the scrml compiler
 * validates the candidate and REFUSES any merge that would introduce type
 * errors neither side had (§4.4 v3). That last part is the whole point — a
 * text merge cannot see it, and will hand you a file that does not compile.
 *
 * Spec ref: giti-spec-v1.md §2.3 (merge), §4.3 (AST merge), §4.4 (validation)
 */

import { getEngine } from "../engine/index.js";
import {
  autoResolveConflicts, formatAutoResolve,
  validateMergeResult, formatValidation,
} from "../merge/auto-resolve.js";

export async function merge(args) {
  const engine = getEngine();

  if (args.length === 0) {
    process.stderr.write("giti merge: specify which line of work to merge.\n");
    process.stderr.write("Usage: giti merge <name>\n");
    process.exit(1);
  }

  const name = args[0];
  const result = await engine.merge(name);

  if (!result.ok) {
    process.stderr.write(`giti: ${result.error}\n`);
    process.exit(1);
  }

  process.stdout.write(`Merged: ${name}\n`);

  // Auto-resolution is best-effort: a failure here must not make a SUCCESSFUL
  // merge look failed. Report it and leave the conflicts for the human.
  const auto = await autoResolveConflicts(engine);
  if (!auto.ok) {
    process.stderr.write(`giti: auto-resolution unavailable — ${auto.error}\n`);
    return;
  }

  const summary = formatAutoResolve(auto.data);
  if (summary) process.stdout.write("\n" + summary + "\n");

  // Validate EVERY merged .scrml, including files the engine auto-merged with
  // no conflict at all — that silent case is the one a text merge cannot see.
  const validation = await validateMergeResult(engine);
  if (validation.ok) {
    const vSummary = formatValidation(validation.data);
    if (vSummary) process.stderr.write("\n" + vSummary + "\n");
    if (validation.data.broken.length > 0) process.exit(1);
  }

  // A refused merge is the tool doing its job, but the user still has work to
  // do — exit non-zero so scripts and CI notice.
  if (auto.data.unresolved.length > 0) process.exit(1);
}
