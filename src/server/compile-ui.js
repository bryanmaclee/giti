/**
 * Compile the giti scrml UI at server startup.
 *
 * Strategy: shell out to the scrmlTS compiler CLI (resolved the same way
 * `giti land` does) and emit into `dist/ui/` next to the giti repo.
 *
 * Fail-fast: if the compiler is missing or any file fails to compile,
 * we throw so `giti serve` reports it loudly and the user can escalate
 * to scrmlTS (per pa.md "compiler bug escalation path").
 */

import {
  existsSync, mkdirSync, readdirSync, copyFileSync,
} from "node:fs";
import { resolve, join } from "node:path";

import { resolveCompilerPath } from "../commands/land.js";

export const DEFAULT_UI_DIR = "ui";
export const DEFAULT_DIST_DIR = join("dist", "ui");

/**
 * Compile every .scrml file under `uiDir` into `distDir`.
 * Returns { ok: true, distDir } or { ok: false, error }.
 */
export async function compileUi({
  cwd = process.cwd(),
  uiDir = DEFAULT_UI_DIR,
  distDir = DEFAULT_DIST_DIR,
} = {}) {
  const uiAbs = resolve(cwd, uiDir);
  const distAbs = resolve(cwd, distDir);

  if (!existsSync(uiAbs)) {
    return { ok: true, distDir: distAbs, skipped: true };
  }

  const compiler = resolveCompilerPath({ cwd });
  if (!compiler.ok) return compiler;

  mkdirSync(distAbs, { recursive: true });

  const proc = Bun.spawn(
    ["bun", "run", compiler.path, "compile", uiAbs, "-o", distAbs],
    { cwd, stdout: "pipe", stderr: "pipe" },
  );
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const msg = (stderr.trim() || stdout.trim()) || `compiler exited with ${exitCode}`;
    return { ok: false, error: msg };
  }

  const sharedCss = copySharedCss({ uiAbs, distAbs });

  return { ok: true, distDir: distAbs, stdout: stdout.trim(), sharedCss };
}

/**
 * Copy hand-written static CSS from `uiAbs` into `distAbs` so that each
 * page's `@import url('theme.css')` (or similar) resolves at runtime.
 *
 * "Shared" means a `*.css` in `uiAbs` with no matching `*.scrml` next to
 * it — per-page CSS the compiler emits is left alone.
 *
 * Returns the list of shared CSS filenames that were copied (sorted).
 */
export function copySharedCss({ uiAbs, distAbs }) {
  if (!existsSync(uiAbs) || !existsSync(distAbs)) return [];

  const sharedCss = [];
  for (const name of readdirSync(uiAbs).sort()) {
    if (!name.endsWith(".css")) continue;
    const stem = name.slice(0, -".css".length);
    if (existsSync(join(uiAbs, `${stem}.scrml`))) continue;
    copyFileSync(join(uiAbs, name), join(distAbs, name));
    sharedCss.push(name);
  }

  return sharedCss;
}
