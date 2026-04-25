/**
 * Tests for src/server/compile-ui.js — covers the post-compile step
 * (`injectSharedCss`) that copies hand-written CSS into dist/ui/ and
 * injects <link> tags into compiled HTML.
 *
 * Workaround context (GITI-011): scrml's CSS parser mangles `@import url(...)`,
 * so pages can't share a theme via @import. We compensate by linking the
 * shared CSS into the HTML <head> at server-startup compile time.
 */

import { describe, test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { injectSharedCss } from "../src/server/compile-ui.js";

function mkPair() {
  const root = mkdtempSync(join(tmpdir(), "giti-inject-"));
  const uiAbs = join(root, "ui");
  const distAbs = join(root, "dist");
  mkdirSync(uiAbs);
  mkdirSync(distAbs);
  return { root, uiAbs, distAbs };
}

function pageHtml(stem) {
  return [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    `  <link rel="stylesheet" href="${stem}.css">`,
    "</head>",
    "<body></body>",
    "</html>",
  ].join("\n");
}

describe("injectSharedCss", () => {
  test("copies shared CSS into dist (no matching .scrml)", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "theme.css"), ":root { --x: 1px; }");

    const shared = injectSharedCss({ uiAbs, distAbs });

    expect(shared).toEqual(["theme.css"]);
    expect(existsSync(join(distAbs, "theme.css"))).toBe(true);
    expect(readFileSync(join(distAbs, "theme.css"), "utf8")).toBe(":root { --x: 1px; }");

    rmSync(root, { recursive: true });
  });

  test("does NOT copy per-page CSS (matching .scrml stem)", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "status.scrml"), "/* source */");
    writeFileSync(join(uiAbs, "status.css"), ".per-page {}");

    const shared = injectSharedCss({ uiAbs, distAbs });

    expect(shared).toEqual([]);
    expect(existsSync(join(distAbs, "status.css"))).toBe(false);

    rmSync(root, { recursive: true });
  });

  test("injects <link> for shared CSS BEFORE the per-page <link>", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "theme.css"), "");
    writeFileSync(join(distAbs, "status.html"), pageHtml("status"));

    injectSharedCss({ uiAbs, distAbs });

    const out = readFileSync(join(distAbs, "status.html"), "utf8");
    const themeIdx = out.indexOf('href="theme.css"');
    const pageIdx = out.indexOf('href="status.css"');
    expect(themeIdx).toBeGreaterThan(0);
    expect(pageIdx).toBeGreaterThan(themeIdx);

    rmSync(root, { recursive: true });
  });

  test("injects into every compiled HTML page", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "theme.css"), "");
    writeFileSync(join(distAbs, "status.html"), pageHtml("status"));
    writeFileSync(join(distAbs, "history.html"), pageHtml("history"));
    writeFileSync(join(distAbs, "bookmarks.html"), pageHtml("bookmarks"));

    injectSharedCss({ uiAbs, distAbs });

    for (const name of ["status.html", "history.html", "bookmarks.html"]) {
      const html = readFileSync(join(distAbs, name), "utf8");
      expect(html).toContain('href="theme.css"');
    }

    rmSync(root, { recursive: true });
  });

  test("injects multiple shared CSS files in directory order", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "theme.css"), "");
    writeFileSync(join(uiAbs, "reset.css"), "");
    writeFileSync(join(distAbs, "status.html"), pageHtml("status"));

    const shared = injectSharedCss({ uiAbs, distAbs });

    expect(shared).toContain("theme.css");
    expect(shared).toContain("reset.css");
    expect(shared.length).toBe(2);

    const html = readFileSync(join(distAbs, "status.html"), "utf8");
    expect(html).toContain('href="theme.css"');
    expect(html).toContain('href="reset.css"');

    rmSync(root, { recursive: true });
  });

  test("noop when no shared CSS exists (HTML untouched)", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "status.scrml"), "");
    writeFileSync(join(uiAbs, "status.css"), ""); // per-page, skipped
    const original = pageHtml("status");
    writeFileSync(join(distAbs, "status.html"), original);

    const shared = injectSharedCss({ uiAbs, distAbs });

    expect(shared).toEqual([]);
    expect(readFileSync(join(distAbs, "status.html"), "utf8")).toBe(original);

    rmSync(root, { recursive: true });
  });

  test("idempotent: injecting twice doesn't duplicate the <link>", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "theme.css"), "");
    writeFileSync(join(distAbs, "status.html"), pageHtml("status"));

    injectSharedCss({ uiAbs, distAbs });
    const after1 = readFileSync(join(distAbs, "status.html"), "utf8");
    injectSharedCss({ uiAbs, distAbs });
    const after2 = readFileSync(join(distAbs, "status.html"), "utf8");

    expect(after2).toBe(after1);
    const matches = after2.match(/href="theme\.css"/g);
    expect(matches).toHaveLength(1);

    rmSync(root, { recursive: true });
  });

  test("ignores non-html and non-css files in dist", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "theme.css"), "");
    writeFileSync(join(distAbs, "status.html"), pageHtml("status"));
    writeFileSync(join(distAbs, "status.client.js"), "console.log('x')");
    writeFileSync(join(distAbs, "status.css"), ".x{}");

    injectSharedCss({ uiAbs, distAbs });

    expect(readFileSync(join(distAbs, "status.client.js"), "utf8")).toBe("console.log('x')");
    expect(readFileSync(join(distAbs, "status.css"), "utf8")).toBe(".x{}");

    rmSync(root, { recursive: true });
  });

  test("returns [] when uiAbs missing", () => {
    const { root, distAbs } = mkPair();
    const shared = injectSharedCss({
      uiAbs: join(root, "no-such-ui"),
      distAbs,
    });
    expect(shared).toEqual([]);
    rmSync(root, { recursive: true });
  });

  test("returns [] when distAbs missing", () => {
    const { root, uiAbs } = mkPair();
    writeFileSync(join(uiAbs, "theme.css"), "");
    const shared = injectSharedCss({
      uiAbs,
      distAbs: join(root, "no-such-dist"),
    });
    expect(shared).toEqual([]);
    rmSync(root, { recursive: true });
  });

  test("HTML without an existing <link> is left alone (no insertion point)", () => {
    const { root, uiAbs, distAbs } = mkPair();
    writeFileSync(join(uiAbs, "theme.css"), "");
    const noLink = "<!DOCTYPE html><html><head></head><body></body></html>";
    writeFileSync(join(distAbs, "status.html"), noLink);

    injectSharedCss({ uiAbs, distAbs });

    expect(readFileSync(join(distAbs, "status.html"), "utf8")).toBe(noLink);

    rmSync(root, { recursive: true });
  });
});
