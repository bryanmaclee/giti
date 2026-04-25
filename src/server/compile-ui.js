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
  readFileSync, writeFileSync,
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

  const sharedCss = injectSharedCss({ uiAbs, distAbs });

  return { ok: true, distDir: distAbs, stdout: stdout.trim(), sharedCss };
}

/**
 * Copy hand-written static CSS from `uiAbs` into `distAbs`, then inject each
 * as a `<link>` in every compiled HTML's head. Workaround for GITI-011: the
 * scrml CSS parser mangles `@import url(...)`, so pages can't share a theme
 * via `@import` — we link the static CSS into the HTML instead.
 *
 * Rules:
 *  - A `*.css` in `uiAbs` is "shared" iff there is no matching `*.scrml`
 *    next to it (per-page CSS that the compiler emits is left alone).
 *  - Shared `<link>` is injected BEFORE the compiler-emitted per-page link
 *    so per-page rules cascade on top of the theme.
 *  - HTMLs that already have an injected matching `<link>` are not touched
 *    twice (idempotent on string equality of the injected substring).
 *
 * Returns the list of shared CSS filenames that were copied (in directory
 * iteration order).
 */
export function injectSharedCss({ uiAbs, distAbs }) {
  if (!existsSync(uiAbs) || !existsSync(distAbs)) return [];

  const sharedCss = [];
  for (const name of readdirSync(uiAbs)) {
    if (!name.endsWith(".css")) continue;
    const stem = name.slice(0, -".css".length);
    if (existsSync(join(uiAbs, `${stem}.scrml`))) continue;
    copyFileSync(join(uiAbs, name), join(distAbs, name));
    sharedCss.push(name);
  }

  if (sharedCss.length === 0) return sharedCss;

  for (const name of readdirSync(distAbs)) {
    if (!name.endsWith(".html")) continue;
    const p = join(distAbs, name);
    const html = readFileSync(p, "utf8");
    const missing = sharedCss.filter((c) => !html.includes(`href="${c}"`));
    if (missing.length === 0) continue;
    const links = missing.map((c) => `  <link rel="stylesheet" href="${c}">`).join("\n");
    const injected = html.replace(
      /(  <link rel="stylesheet"[^>]*>)/,
      `${links}\n$1`,
    );
    if (injected !== html) writeFileSync(p, injected);
  }

  return sharedCss;
}
