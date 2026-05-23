/**
 * giti check
 *
 * Dry-run for `giti land`. Validates that current work would pass the
 * landing pipeline (compiler + tests) without creating a landing.
 *
 * Spec ref: giti-spec-v1.md §9.6 (GAP-6)
 *
 * Flags:
 *   --quick   compiler only, skip tests
 *   --diff    list .scrml files changed in working copy (no compile/test)
 *
 * Exit codes: 0 on pass, 1 on failure (per spec §9.6 normative #4).
 */

import { runCompiler, runTests } from "./land.js";
import { getEngine } from "../engine/index.js";
import { parseStatus } from "./status.js";

let _runCompiler = runCompiler;
let _runTests = runTests;
let _getEngine = getEngine;

check.setRunners = function setRunners({ runCompiler, runTests, getEngine } = {}) {
  if (runCompiler) _runCompiler = runCompiler;
  if (runTests) _runTests = runTests;
  if (getEngine) _getEngine = getEngine;
};

check.resetRunners = function resetRunners() {
  _runCompiler = runCompiler;
  _runTests = runTests;
  _getEngine = getEngine;
};

export async function check(args) {
  const quick = args.includes("--quick");
  const diff = args.includes("--diff");

  if (diff) {
    return await checkDiff();
  }

  process.stdout.write("Checking your work...\n");

  const compilerResult = await _runCompiler();
  if (!compilerResult.ok) {
    process.stderr.write("Check failed: the compiler found errors.\n\n");
    process.stderr.write(compilerResult.error + "\n\n");
    process.stderr.write("Fix the errors above and run giti check again.\n");
    process.exit(1);
  }
  if (compilerResult.data?.skipped) {
    process.stdout.write("  Compiler: skipped (no .scrml files)\n");
  } else {
    const n = compilerResult.data?.fileCount;
    process.stdout.write(`  Compiler: pass${n ? ` (${n} file${n === 1 ? "" : "s"})` : ""}\n`);
  }

  if (quick) {
    process.stdout.write("\nCheck passed (compiler only — tests skipped).\n");
    return;
  }

  const testResult = await _runTests();
  if (!testResult.ok) {
    process.stderr.write("Check failed: tests failed.\n\n");
    process.stderr.write(testResult.error + "\n\n");
    process.stderr.write("Fix the failing tests and run giti check again.\n");
    process.exit(1);
  }
  process.stdout.write(`  Tests: pass (${testResult.data.count})\n`);

  process.stdout.write("\nCheck passed.\n");
}

async function checkDiff() {
  const engine = _getEngine();
  const statusRes = await engine.status();
  if (!statusRes.ok) {
    process.stderr.write(`giti check --diff: ${statusRes.error}\n`);
    process.exit(1);
  }
  const { changed } = parseStatus(statusRes.data.raw || "");
  const scrml = changed.filter((c) => c.path.endsWith(".scrml"));
  if (scrml.length === 0) {
    process.stdout.write("No .scrml files changed.\n");
    return;
  }
  for (const f of scrml) {
    process.stdout.write(`  ${f.kind.padEnd(8)} ${f.path}\n`);
  }
}
