// Browser-paint verification for giti's 7 UI pages (GITI-028 close-out).
//
// Drives headless Chromium over `giti serve`, runs the REAL client JS (fetch +
// CSRF retry + reactive runtime + <match> dispatch + SSE/WS), waits for loaders
// to resolve, then inspects the PAINTED DOM and screenshots each page.
//
// This is a PA-check (stronger than server-side probes, weaker than human eyes
// on pixels). Run: bun run tests/manual/browser-paint.mjs [baseURL]
//
// Playwright is borrowed from ../scrml/node_modules; Chromium from the ms-playwright cache.

import { homedir } from "node:os";
import { mkdirSync, readdirSync } from "node:fs";

// Portable across machines (bryan / bryan-maclee): resolve playwright + chromium
// from $HOME and glob the installed chromium build instead of pinning a version.
const { chromium } = await import(`${homedir()}/scrmlMaster/scrml/node_modules/playwright/index.js`);
const PW_CACHE = `${homedir()}/.cache/ms-playwright`;
const CHROMIUM_DIR = readdirSync(PW_CACHE).find((d) => d.startsWith("chromium-"));
const EXEC = `${PW_CACHE}/${CHROMIUM_DIR}/chrome-linux64/chrome`;

const BASE = process.argv[2] || "http://127.0.0.1:3737";
const OUT = "/tmp/giti-paint";
mkdirSync(OUT, { recursive: true });

const PAGES = ["status", "history", "bookmarks", "diff", "land", "live", "feed"];
// Per-page "still on the skeleton" markers — if visible text is ONLY these, the loader never painted.
const SKELETON = ["loading", "waiting…", "waiting...", "loading…"];
// SSE pages hold an EventSource open, so `networkidle` NEVER fires (the request stays live) and
// `goto` times out even though the page renders. Settle on DOM parse + a paint window instead
// (S18 thread 5). WS-driven pages (live) DO reach networkidle, so they stay on the default path.
const SSE_PAGES = new Set(["feed"]);

const browser = await chromium.launch({ executablePath: EXEC, headless: true });
const results = [];

for (const name of PAGES) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => pageErrors.push(e.message));

  let text = "", title = "", err = null;
  try {
    // land's on-mount preflight runs the REAL gate (compile all .scrml + full `bun test`,
    // ~20s+), so its loader legitimately holds the connection well past a normal budget.
    const navTimeout = name === "land" ? 45000 : 15000;
    // SSE pages can't reach networkidle (open EventSource) — settle on DOM parse instead.
    const waitUntil = SSE_PAGES.has(name) ? "domcontentloaded" : "networkidle";
    await page.goto(`${BASE}/${name}.html`, { waitUntil, timeout: navTimeout });
    // give SSE/WS-driven pages time for the first event to connect + paint
    await page.waitForTimeout(SSE_PAGES.has(name) ? 3000 : name === "live" ? 2500 : 1200);
    title = await page.title();
    text = (await page.evaluate(() => document.querySelector(".app")?.innerText || document.body.innerText || "")).trim();
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  } catch (e) { err = e.message; }

  const lc = text.toLowerCase();
  const onlySkeleton = text.length > 0 && SKELETON.some((s) => lc.includes(s)) &&
    // crude: skeleton-dominant if the text is short AND contains a skeleton marker
    text.length < 40;
  const painted = !err && pageErrors.length === 0 && text.length > 0 && !onlySkeleton;

  results.push({ name, painted, title, pageErrors, consoleErrors, err, textLen: text.length, sample: text.replace(/\s+/g, " ").slice(0, 140) });
  await ctx.close();
}

await browser.close();

console.log("==================== BROWSER PAINT ====================");
let allOk = true;
for (const r of results) {
  const flag = r.painted ? "✅" : "❌";
  if (!r.painted) allOk = false;
  console.log(`\n${flag} ${r.name}  (title="${r.title}", textLen=${r.textLen})`);
  console.log(`   text: ${r.sample}`);
  if (r.err) console.log(`   NAV-ERR: ${r.err}`);
  if (r.pageErrors.length) console.log(`   PAGE-ERRORS: ${r.pageErrors.join(" | ")}`);
  if (r.consoleErrors.length) console.log(`   console.error: ${r.consoleErrors.slice(0, 3).join(" | ")}`);
}
console.log(`\n====== ${allOk ? "ALL 7 PAGES PAINTED ✅" : "SOME PAGES DID NOT PAINT ❌"} ======`);
console.log(`screenshots → ${OUT}/*.png`);
process.exit(allOk ? 0 : 1);
