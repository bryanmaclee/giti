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

import { existsSync } from "node:fs";
import { resolve, join } from "node:path";

import { getEngine } from "../engine/index.js";
import { parseStatus } from "./status.js";
import { loadPrivateManifest, partitionByScope } from "../private/scope.js";

/**
 * Resolve the scrmlTS compiler CLI entry point.
 *
 * Lookup order:
 *   1. $SCRMLTS_PATH env var (points at scrmlTS root)
 *   2. sibling checkout at <giti repo>/../scrmlTS
 *
 * Returns { ok: true, path } or { ok: false, error }.
 * `path` is the absolute path to the compiler CLI.
 */
export function resolveCompilerPath({ cwd = process.cwd(), env = process.env, fs = { existsSync } } = {}) {
  const candidates = [];
  if (env.SCRMLTS_PATH) candidates.push(resolve(env.SCRMLTS_PATH));
  candidates.push(resolve(cwd, "..", "scrmlTS"));

  for (const root of candidates) {
    const cli = join(root, "compiler", "src", "cli.js");
    if (fs.existsSync(cli)) {
      return { ok: true, path: cli, root };
    }
  }

  return {
    ok: false,
    error:
      "Could not find the scrmlTS compiler.\n" +
      "Set $SCRMLTS_PATH to your scrmlTS checkout, or place scrmlTS next to giti:\n" +
      "  scrmlMaster/\n" +
      "    giti/\n" +
      "    scrmlTS/",
  };
}

/**
 * Find .scrml files under cwd using Bun.Glob.
 *
 * Excludes:
 *   - `docs/**`         spec illustrations and other prose-y .scrml that
 *                       isn't meant to compile (e.g. docs/spec-types/*.scrml
 *                       use future state-machine syntax not yet supported).
 *   - `node_modules/**` package source we don't own.
 *   - `dist/**`         compiled output (won't have .scrml but cheap to skip).
 *
 * Returns an array of repo-relative paths (sorted for determinism).
 */
export async function findScrmlFiles({ cwd = process.cwd(), glob = new Bun.Glob("**/*.scrml") } = {}) {
  const files = [];
  for await (const f of glob.scan({ cwd, onlyFiles: true })) {
    if (f.startsWith("docs/")) continue;
    if (f.startsWith("node_modules/")) continue;
    if (f.startsWith("dist/")) continue;
    files.push(f);
  }
  files.sort();
  return files;
}

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

  // Step 0a: Refuse to land if the diff touches any private-scoped path.
  // Spec §12.3 normative #5: "giti land SHALL reject a landing whose diff
  // touches any private-scoped path. Landings are public by definition."
  const statusResult = await engine.status();
  if (statusResult.ok && statusResult.data.raw) {
    const parsed = parseStatus(statusResult.data.raw);
    const globs = loadPrivateManifest(process.cwd());
    const { private: privChanged } = partitionByScope(parsed.changed, globs);
    if (privChanged.length > 0) {
      process.stderr.write("Cannot land: your changes touch private paths.\n\n");
      for (const f of privChanged) {
        process.stderr.write(`  ${f.path}  (${f.kind}, private)\n`);
      }
      process.stderr.write(
        "\nLandings are public. Move these changes off your public line of\n" +
        "work first (they belong on the private bookmark), or unmark them\n" +
        "with 'giti private remove <pattern>' if they should be public.\n"
      );
      process.exit(1);
    }
  }

  // Step 0b: Check for conflicts before doing anything
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
  if (compilerResult.data?.skipped) {
    process.stdout.write("  Compiler: skipped (no .scrml files)\n");
  } else {
    const n = compilerResult.data?.fileCount;
    process.stdout.write(`  Compiler: pass${n ? ` (${n} file${n === 1 ? "" : "s"})` : ""}\n`);
  }

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
 *
 * Behavior:
 *   - Resolves the scrmlTS compiler via resolveCompilerPath()
 *   - Globs .scrml files under cwd
 *   - Skips the compiler gate (pass) if there are no .scrml files
 *   - Invokes `bun run <compiler-cli> compile <files...>` and reports stderr on failure
 *
 * Returns { ok: true, data: { skipped?: true, fileCount } } or { ok: false, error }.
 *
 * Exported as `runCompiler` for reuse by the landing dashboard server fn.
 */
export async function runCompiler() {
  return runCompilerDefault();
}

async function runCompilerDefault() {
  const compiler = resolveCompilerPath();
  if (!compiler.ok) {
    return { ok: false, error: compiler.error };
  }

  const files = await findScrmlFiles();
  if (files.length === 0) {
    return { ok: true, data: { skipped: true, fileCount: 0 } };
  }

  try {
    const proc = Bun.spawn(["bun", "run", compiler.path, "compile", ...files], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });
    const stderr = await new Response(proc.stderr).text();
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const msg = (stderr.trim() || stdout.trim()) || `compiler exited with code ${exitCode}`;
      return { ok: false, error: msg };
    }
    return { ok: true, data: { fileCount: files.length } };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Run the project's test suite.
 *
 * Exported as `runTests` for reuse by the landing dashboard server fn.
 */
export async function runTests() {
  return runTestsDefault();
}

async function runTestsDefault() {
  try {
    const proc = Bun.spawn(["bun", "test"], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    const exitCode = await proc.exited;
    // bun test writes its summary to stderr, not stdout.
    const combined = stdout + stderr;
    if (exitCode !== 0) {
      return { ok: false, error: (stderr.trim() || stdout.trim()) };
    }
    const countMatch = combined.match(/(\d+) pass/);
    const count = countMatch ? countMatch[1] : "?";
    return { ok: true, data: { count } };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
