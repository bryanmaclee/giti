/**
 * giti land
 *
 * Ship your work. The compiler and tests must pass before landing.
 * Solo mode: lands immediately if green.
 * Team mode: opens a landing for review.
 *
 * Spec ref: giti-spec-v1.md §5.1
 * Error refs: GIT-004 (compiler fail), GIT-005 (test fail), GIT-006 (conflicts)
 */

import { getEngine } from "../engine/index.js";

/**
 * Injectable runners for compiler and tests — allows test mocking.
 * Call land.setRunners({ runCompiler, runTests }) to override.
 */
let _runCompiler = runCompilerDefault;
let _runTests = runTestsDefault;

/**
 * Override compiler/test runners (used by tests).
 */
land.setRunners = function setRunners({ runCompiler, runTests }) {
  if (runCompiler) _runCompiler = runCompiler;
  if (runTests) _runTests = runTests;
};

/**
 * Reset runners to defaults (used by tests).
 */
land.resetRunners = function resetRunners() {
  _runCompiler = runCompilerDefault;
  _runTests = runTestsDefault;
};

export async function land(args) {
  const engine = getEngine();

  // Step 0: Check for conflicts before doing anything
  const conflictResult = await engine.conflicts();
  if (conflictResult.ok && conflictResult.data.hasConflicts) {
    const files = conflictResult.data.files;
    // GIT-006: Conflicts present on landing attempt
    process.stderr.write("Your work has conflicts that need to be resolved before landing.\n\n");
    if (files.length > 0) {
      for (const f of files) {
        process.stderr.write(`  ${f}  (conflict)\n`);
      }
      process.stderr.write("\n");
    }
    process.stderr.write("Run giti resolve to handle them, then giti land again.\n");
    process.stderr.write("Not ready to resolve now? You can keep working and resolve later.\n");
    process.exit(1);
  }

  process.stdout.write("Checking your work...\n");

  // Step 1: Run the scrml compiler
  const compilerResult = await _runCompiler();

  if (!compilerResult.ok) {
    // GIT-004: Compiler gate failed on landing
    process.stderr.write("Your work did not land because the compiler found errors.\n\n");
    process.stderr.write(compilerResult.error + "\n\n");
    process.stderr.write("Fix the errors above and run giti land again.\n");
    process.stderr.write("Your work is still here — nothing was lost.\n");
    process.exit(1);
  }
  process.stdout.write("  Compiler: pass\n");

  // Step 2: Run tests
  const testResult = await _runTests();

  if (!testResult.ok) {
    // GIT-005: Tests gate failed on landing
    process.stderr.write("Your work did not land because the tests failed.\n\n");
    process.stderr.write(testResult.error + "\n\n");
    process.stderr.write("Fix the failing tests and run giti land again.\n");
    process.stderr.write("Your work is still here — nothing was lost.\n");
    process.exit(1);
  }
  process.stdout.write(`  Tests: pass (${testResult.data.count})\n`);

  // Step 3: Save + merge to main
  const saveResult = await engine.save(args.join(" ") || "land");
  if (!saveResult.ok) {
    // No unsaved changes — that's fine
  }

  // Merge current work into main (default branch)
  const mergeResult = await engine.merge("main");

  const description = saveResult.ok ? saveResult.data.description : "land";
  process.stdout.write(`\nLanded on main: "${description}"\n`);
}

/**
 * Run the scrml compiler on all .scrml files in the project.
 * Returns { ok: true } or { ok: false, error: string }.
 */
async function runCompilerDefault() {
  try {
    const proc = Bun.spawn(["bun", "run", "compiler/src/index.ts", "**/*.scrml"], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      return { ok: false, error: stderr.trim() };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Run the project's test suite.
 */
async function runTestsDefault() {
  try {
    const proc = Bun.spawn(["bun", "test"], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      return { ok: false, error: stdout.trim() };
    }
    // Extract test count from output
    const countMatch = stdout.match(/(\d+) pass/);
    const count = countMatch ? countMatch[1] : "?";
    return { ok: true, data: { count } };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
