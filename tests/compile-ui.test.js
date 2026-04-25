/**
 * Tests for src/server/compile-ui.js — covers the post-compile step
 * (`copySharedCss`) that copies hand-written CSS into dist/ui/ so that
 * each compiled page's `@import url('theme.css')` resolves at runtime.
 *
 * (Pre-S8 these tests covered an HTML <link>-injection workaround for
 * GITI-011. With GITI-011 fixed in scrmlTS, the inject step was removed
 * — pages now use native @import. Only the copy step remains.)
 */

import { describe, test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { copySharedCss } from "../src/server/compile-ui.js";

function mkPair() {
  const root = mkdtempSync(join(tmpdir(), "giti-copy-css-"));
  const uiAbs = join(root, "ui");
  const distAbs = join(root, "dist");
  mkdirSync(uiAbs);
  mkdirSync(distAbs);
  return { root, uiAbs, distAbs };
}

describe("copySharedCss", () => {
  test("copies shared CSS into dist (no matching .scrml)", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "theme.css"), ":root { --x: 1px; }");

    const shared = copySharedCss({ uiAbs, distAbs });

    expect(shared).toEqual(["theme.css"]);
    expect(existsSync(join(distAbs, "theme.css"))).toBe(true);
    expect(readFileSync(join(distAbs, "theme.css"), "utf8")).toBe(":root { --x: 1px; }");

    rmSync(root, { recursive: true });
  });

  test("does NOT copy per-page CSS (matching .scrml stem)", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "status.scrml"), "/* source */");
    writeFileSync(join(uiAbs, "status.css"), ".per-page {}");

    const shared = copySharedCss({ uiAbs, distAbs });

    expect(shared).toEqual([]);
    expect(existsSync(join(distAbs, "status.css"))).toBe(false);

    rmSync(root, { recursive: true });
  });

  test("copies multiple shared CSS files (sorted, deterministic)", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "theme.css"), "");
    writeFileSync(join(uiAbs, "reset.css"), "");
    writeFileSync(join(uiAbs, "tokens.css"), "");

    const shared = copySharedCss({ uiAbs, distAbs });

    expect(shared).toEqual(["reset.css", "theme.css", "tokens.css"]);
    for (const f of shared) {
      expect(existsSync(join(distAbs, f))).toBe(true);
    }

    rmSync(root, { recursive: true });
  });

  test("mixed: shared and per-page CSS together", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "theme.css"), "");                  // shared
    writeFileSync(join(uiAbs, "status.scrml"), "");
    writeFileSync(join(uiAbs, "status.css"), "");                 // per-page (skipped)
    writeFileSync(join(uiAbs, "history.scrml"), "");
    writeFileSync(join(uiAbs, "history.css"), "");                // per-page (skipped)

    const shared = copySharedCss({ uiAbs, distAbs });

    expect(shared).toEqual(["theme.css"]);
    expect(existsSync(join(distAbs, "theme.css"))).toBe(true);
    expect(existsSync(join(distAbs, "status.css"))).toBe(false);
    expect(existsSync(join(distAbs, "history.css"))).toBe(false);

    rmSync(root, { recursive: true });
  });

  test("returns [] when no shared CSS exists", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "status.scrml"), "");
    writeFileSync(join(uiAbs, "status.css"), ""); // per-page only

    const shared = copySharedCss({ uiAbs, distAbs });

    expect(shared).toEqual([]);
    expect(readdirOrEmpty(distAbs)).toEqual([]);

    rmSync(root, { recursive: true });
  });

  test("idempotent: copying twice yields the same result", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "theme.css"), "body{}");

    const r1 = copySharedCss({ uiAbs, distAbs });
    const r2 = copySharedCss({ uiAbs, distAbs });

    expect(r2).toEqual(r1);
    expect(readFileSync(join(distAbs, "theme.css"), "utf8")).toBe("body{}");

    rmSync(root, { recursive: true });
  });

  test("returns [] when uiAbs missing", () => {
    const { root, distAbs } = mkPair();
    const shared = copySharedCss({
      uiAbs: join(root, "no-such-ui"),
      distAbs,
    });
    expect(shared).toEqual([]);
    rmSync(root, { recursive: true });
  });

  test("returns [] when distAbs missing", () => {
    const { root, uiAbs } = mkPair();
    writeFileSync(join(uiAbs, "theme.css"), "");
    const shared = copySharedCss({
      uiAbs,
      distAbs: join(root, "no-such-dist"),
    });
    expect(shared).toEqual([]);
    rmSync(root, { recursive: true });
  });

  test("ignores non-css files in ui/", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "theme.css"), "");
    writeFileSync(join(uiAbs, "README.md"), "hi");
    writeFileSync(join(uiAbs, "config.json"), "{}");

    const shared = copySharedCss({ uiAbs, distAbs });

    expect(shared).toEqual(["theme.css"]);
    expect(existsSync(join(distAbs, "README.md"))).toBe(false);
    expect(existsSync(join(distAbs, "config.json"))).toBe(false);

    rmSync(root, { recursive: true });
  });
});

function readdirOrEmpty(dir) {
  try {
    return require("node:fs").readdirSync(dir);
  } catch {
    return [];
  }
}
