/**
 * giti land — compiler gate helpers
 */

import { describe, test, expect } from "bun:test";
import { resolveCompilerPath, findScrmlFiles } from "../src/commands/land.js";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function fakeFs(existingPaths) {
  return { existsSync: (p) => existingPaths.has(p) };
}

describe("resolveCompilerPath", () => {
  test("prefers SCRMLTS_PATH env var when set", () => {
    const result = resolveCompilerPath({
      cwd: "/repos/giti",
      env: { SCRMLTS_PATH: "/custom/scrmlTS" },
      fs: fakeFs(new Set(["/custom/scrmlTS/compiler/src/cli.js"])),
    });
    expect(result.ok).toBe(true);
    expect(result.path).toBe("/custom/scrmlTS/compiler/src/cli.js");
  });

  test("falls back to sibling ../scrmlTS", () => {
    const result = resolveCompilerPath({
      cwd: "/repos/giti",
      env: {},
      fs: fakeFs(new Set(["/repos/scrmlTS/compiler/src/cli.js"])),
    });
    expect(result.ok).toBe(true);
    expect(result.path).toBe("/repos/scrmlTS/compiler/src/cli.js");
  });

  test("errors with install instructions when nothing found", () => {
    const result = resolveCompilerPath({
      cwd: "/repos/giti",
      env: {},
      fs: fakeFs(new Set()),
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("SCRMLTS_PATH");
  });

  test("env var takes precedence over sibling", () => {
    const result = resolveCompilerPath({
      cwd: "/repos/giti",
      env: { SCRMLTS_PATH: "/custom/scrmlTS" },
      fs: fakeFs(new Set([
        "/custom/scrmlTS/compiler/src/cli.js",
        "/repos/scrmlTS/compiler/src/cli.js",
      ])),
    });
    expect(result.path).toBe("/custom/scrmlTS/compiler/src/cli.js");
  });
});

describe("findScrmlFiles", () => {
  let dir;

  test("returns empty array when no .scrml files exist", async () => {
    dir = mkdtempSync(join(tmpdir(), "giti-land-"));
    writeFileSync(join(dir, "README.md"), "hi");
    const files = await findScrmlFiles({ cwd: dir });
    expect(files).toEqual([]);
    rmSync(dir, { recursive: true });
  });

  test("finds .scrml files in nested dirs", async () => {
    dir = mkdtempSync(join(tmpdir(), "giti-land-"));
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "a.scrml"), "");
    writeFileSync(join(dir, "src", "b.scrml"), "");
    writeFileSync(join(dir, "src", "ignore.js"), "");
    const files = await findScrmlFiles({ cwd: dir });
    expect(files).toEqual(["a.scrml", "src/b.scrml"]);
    rmSync(dir, { recursive: true });
  });

  test("excludes docs/ (spec illustrations don't compile)", async () => {
    dir = mkdtempSync(join(tmpdir(), "giti-land-"));
    mkdirSync(join(dir, "ui"), { recursive: true });
    mkdirSync(join(dir, "docs", "spec-types"), { recursive: true });
    writeFileSync(join(dir, "ui", "page.scrml"), "");
    writeFileSync(join(dir, "docs", "spec-types", "branch.scrml"), "");
    writeFileSync(join(dir, "docs", "notes.scrml"), "");
    const files = await findScrmlFiles({ cwd: dir });
    expect(files).toEqual(["ui/page.scrml"]);
    rmSync(dir, { recursive: true });
  });

  test("excludes node_modules/", async () => {
    dir = mkdtempSync(join(tmpdir(), "giti-land-"));
    mkdirSync(join(dir, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(dir, "a.scrml"), "");
    writeFileSync(join(dir, "node_modules", "pkg", "skip.scrml"), "");
    const files = await findScrmlFiles({ cwd: dir });
    expect(files).toEqual(["a.scrml"]);
    rmSync(dir, { recursive: true });
  });

  test("excludes dist/", async () => {
    dir = mkdtempSync(join(tmpdir(), "giti-land-"));
    mkdirSync(join(dir, "dist", "ui"), { recursive: true });
    writeFileSync(join(dir, "page.scrml"), "");
    writeFileSync(join(dir, "dist", "ui", "compiled.scrml"), "");
    const files = await findScrmlFiles({ cwd: dir });
    expect(files).toEqual(["page.scrml"]);
    rmSync(dir, { recursive: true });
  });
});
