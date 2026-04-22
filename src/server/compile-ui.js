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

  // Copy hand-written static CSS from ui/ into dist/ui/ so every scrml
  // page can share a theme without duplicating chrome. Per-file CSS the
  // compiler already emits (status.css, history.css, …) stays as-is;
  // only copy files whose stem has no matching .scrml source.
  const sharedCss = [];
  for (const name of readdirSync(uiAbs)) {
    if (!name.endsWith(".css")) continue;
    const stem = name.slice(0, -".css".length);
    if (existsSync(join(uiAbs, `${stem}.scrml`))) continue;
    copyFileSync(join(uiAbs, name), join(distAbs, name));
    sharedCss.push(name);
  }

  // Inject each shared CSS as a <link> into every compiled HTML's <head>
  // so pages pick up the theme without needing `@import` (scrml's CSS
  // parser mangles at-rules — workaround via HTML linkage instead).
  // Injected BEFORE the compiler-emitted per-page link so per-page rules
  // cascade on top.
  if (sharedCss.length > 0) {
    for (const name of readdirSync(distAbs)) {
      if (!name.endsWith(".html")) continue;
      const p = join(distAbs, name);
      const html = readFileSync(p, "utf8");
      const links = sharedCss.map((c) => `  <link rel="stylesheet" href="${c}">`).join("\n");
      // Insert before the scrml-emitted `<link rel="stylesheet" href="{stem}.css">`.
      const injected = html.replace(
        /(  <link rel="stylesheet"[^>]*>)/,
        `${links}\n$1`,
      );
      if (injected !== html) writeFileSync(p, injected);
    }
  }

  return { ok: true, distDir: distAbs, stdout: stdout.trim() };
}
