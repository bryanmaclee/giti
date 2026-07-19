/**
 * giti resolve [file] [--accept-ours | --accept-theirs | --keep-both]
 *
 * Inspect and resolve conflicts.
 *
 * With no action flag this is READ-ONLY: it shows every conflict in the
 * structured format §4.1.3 mandates (base / your diff / their content — not
 * git's `<<<<<<<` markers) along with the options available for that file.
 * Non-destructive by default matters here, because §4.1.5 is explicit that
 * conflicts are resolvable at any time and nothing is gated on doing it now.
 *
 * Action flags:
 *   --accept-ours    keep the side you were already on          (spec §9.5)
 *   --accept-theirs  keep the incoming side                     (spec §9.5)
 *   --keep-both      AST-merge the two sides, compiler-validated
 *
 * `--keep-both` is the CLI rendering of option [1] "Keep both" in the §4.1
 * worked example, and it is the one a text-based VCS cannot offer: it merges
 * at the entity level and then REFUSES if combining the sides would introduce
 * type errors neither side had (§4.4 v3).
 *
 * Spec ref: giti-spec-v1.md §9.5, §4.1, §4.3, §4.4
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { getEngine } from "../engine/index.js";
import { getMergeContext, getConflictSides } from "../merge/sides.js";
import { buildConflictView, formatConflictView } from "../merge/conflict-view.js";
import { mergeScrmlFile, isAccepted, VERDICT } from "../merge/scrml-merge.js";
import { appendMergeLog } from "../merge/merge-log.js";

const ACTIONS = ["--accept-ours", "--accept-theirs", "--keep-both"];

export function parseResolveArgs(args) {
  const list = args || [];
  const flags = list.filter((a) => a.startsWith("--"));
  const files = list.filter((a) => !a.startsWith("--"));

  const unknown = flags.filter((f) => !ACTIONS.includes(f));
  if (unknown.length > 0) return { error: `unknown option: ${unknown[0]}` };

  const chosen = flags.filter((f) => ACTIONS.includes(f));
  if (chosen.length > 1) {
    return { error: `pick one of ${ACTIONS.join(", ")} — not several` };
  }
  if (files.length > 1) return { error: "specify at most one file" };

  return { action: chosen[0] || null, file: files[0] || null };
}

/** Options offered for a file, per spec §4.1's worked example. */
function actionsFor(path) {
  const opts = [];
  if (path.endsWith(".scrml")) {
    opts.push("Keep both — AST-merge, compiler-validated   (giti resolve <file> --keep-both)");
  }
  opts.push("Keep yours                                  (giti resolve <file> --accept-ours)");
  opts.push("Keep theirs                                 (giti resolve <file> --accept-theirs)");
  opts.push("Edit manually, then: giti save");
  return opts;
}

export async function resolve(args) {
  const parsed = parseResolveArgs(args);
  if (parsed.error) {
    process.stderr.write(`giti resolve: ${parsed.error}\n`);
    process.exit(1);
  }

  const engine = getEngine();

  const conf = await engine.conflicts();
  if (!conf.ok) {
    process.stderr.write(`giti: ${conf.error}\n`);
    process.exit(1);
  }
  if (!conf.data.hasConflicts) {
    process.stdout.write("No conflicts to resolve.\n");
    return;
  }

  let files = conf.data.files;
  if (parsed.file) {
    if (!files.includes(parsed.file)) {
      process.stderr.write(`giti resolve: ${parsed.file} is not conflicted.\n`);
      process.stderr.write(`Conflicted: ${files.join(", ")}\n`);
      process.exit(1);
    }
    files = [parsed.file];
  }

  const ctx = await getMergeContext(engine);
  if (!ctx.ok) {
    process.stderr.write(`giti: ${ctx.error}\n`);
    process.exit(1);
  }
  if (!ctx.data.isMerge) {
    process.stderr.write(
      "giti resolve: the working copy is not a two-parent merge, so there are no\n" +
      "'ours' and 'theirs' sides to choose between. Resolve these by editing.\n",
    );
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const failures = [];

  // ---- read-only inspection (the default) --------------------------------
  if (!parsed.action) {
    const out = [`You have ${files.length} conflict${files.length === 1 ? "" : "s"}.`, ""];
    for (const path of files) {
      const sides = await getConflictSides(engine, path, ctx.data);
      if (!sides.ok) { out.push(`  ${path}`, `    ${sides.error}`, ""); continue; }
      out.push(formatConflictView(buildConflictView(path, sides.data), actionsFor(path)), "");
    }
    out.push("Conflicts do not block you — keep working and resolve before landing (§4.1.5).");
    process.stdout.write(out.join("\n") + "\n");
    return;
  }

  // ---- acting -------------------------------------------------------------
  for (const path of files) {
    const sides = await getConflictSides(engine, path, ctx.data);
    if (!sides.ok) { failures.push({ path, reason: sides.error }); continue; }

    if (parsed.action === "--accept-ours" || parsed.action === "--accept-theirs") {
      const which = parsed.action === "--accept-ours" ? "ours" : "theirs";
      try {
        writeFileSync(join(repoRoot, path), sides.data[which]);
      } catch (e) {
        failures.push({ path, reason: `could not write: ${e.message}` });
        continue;
      }
      appendMergeLog(repoRoot, {
        path,
        verdict: VERDICT.CLEAN,
        decisions: [`resolved by ${parsed.action}`],
      });
      process.stdout.write(`Resolved ${path} — kept ${which}.\n`);
      continue;
    }

    // --keep-both
    if (!path.endsWith(".scrml")) {
      failures.push({ path, reason: "--keep-both needs the scrml AST merger; this is not a .scrml file" });
      continue;
    }

    const res = mergeScrmlFile({
      base: sides.data.base, sideA: sides.data.ours, sideB: sides.data.theirs, path,
    });
    if (!res.ok) { failures.push({ path, reason: res.error }); continue; }

    const { verdict, merged, decisions, diagnostics, reason } = res.data;
    appendMergeLog(repoRoot, { path, verdict, decisions, diagnostics, reason });

    if (!isAccepted(verdict) || typeof merged !== "string") {
      const detail = verdict === VERDICT.SEMANTIC_CONFLICT
        ? ["combining both sides would introduce type errors neither side had:"]
            .concat((diagnostics || []).map((d) => `  ${d.message || d}`))
            .join("\n      ")
        : reason || "the two sides could not be merged structurally";
      failures.push({ path, reason: detail });
      continue;
    }

    try {
      writeFileSync(join(repoRoot, path), merged);
    } catch (e) {
      failures.push({ path, reason: `could not write: ${e.message}` });
      continue;
    }
    const note = verdict === VERDICT.CLEAN ? "" : " (review advised)";
    process.stdout.write(`Resolved ${path} — kept both${note}.\n`);
    if (decisions?.length) process.stdout.write(`  combined: ${decisions.join(", ")}\n`);
  }

  if (failures.length > 0) {
    process.stderr.write(`\nCould not resolve ${failures.length} file(s):\n`);
    for (const f of failures) process.stderr.write(`  ${f.path}\n      ${f.reason}\n`);
    process.exit(1);
  }

  process.stdout.write("\nReview with: giti status --merge-log\n");
}
