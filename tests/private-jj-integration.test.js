/**
 * Slice 6.2 — real-jj harness for the private flow.
 *
 * Earlier private-flow tests (private.test.js, save-routing.test.js,
 * auto-split.test.js) drive the routing logic and the save() command
 * against a *mocked* engine and a tmpdir-only manifest. They prove the
 * code branches correctly but never observe what jj itself does.
 *
 * This file fills that gap: each test creates a real jj repo in a temp
 * dir, drives `save()` through a real JjCliEngine, and inspects the
 * resulting bookmarks and history with `jj log`. The four routing cases
 * are covered (public-only, private-only, mixed-refused, mixed --split)
 * plus changedFilesInRange and `private check` against real tracked files.
 *
 * Skipped if jj is not in PATH.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { execSync } from "child_process";
import { mkdtempSync, rmSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { JjCliEngine } from "../src/engine/jj-cli.js";
import { save } from "../src/commands/save.js";
import { private_ } from "../src/commands/private.js";
import { addPrivatePattern } from "../src/private/scope.js";

let jjAvailable = false;
try { execSync("jj version", { stdio: "pipe" }); jjAvailable = true; } catch { /* jj absent */ }
const describeIf = jjAvailable ? describe : describe.skip;

async function bookmarkChangeId(engine, name) {
  const r = await engine._run([
    "log", "--no-graph", "-r", `bookmarks(${name})`,
    "-T", 'change_id.short() ++ "\\n"',
  ]);
  if (!r.ok) return null;
  return r.data.split("\n")[0].trim() || null;
}

async function bookmarkDesc(engine, name) {
  const r = await engine._run([
    "log", "--no-graph", "-r", `bookmarks(${name})`,
    "-T", 'description.first_line() ++ "\\n"',
  ]);
  if (!r.ok) return null;
  return r.data.split("\n")[0].trim();
}

describeIf("private flow against real jj repo (slice 6.2)", () => {
  let testDir, engine;
  let stdoutChunks, stderrChunks, origStdout, origStderr, origExit, exitCode;

  beforeEach(async () => {
    testDir = mkdtempSync(join(tmpdir(), "giti-priv-jj-"));
    engine = new JjCliEngine(testDir);
    const init = await engine.init(testDir);
    if (!init.ok) throw new Error(`jj init failed: ${init.error}`);

    stdoutChunks = []; stderrChunks = [];
    origStdout = process.stdout.write.bind(process.stdout);
    origStderr = process.stderr.write.bind(process.stderr);
    origExit = process.exit;
    exitCode = null;
    process.stdout.write = (c) => { stdoutChunks.push(c.toString()); return true; };
    process.stderr.write = (c) => { stderrChunks.push(c.toString()); return true; };
    process.exit = (code) => { exitCode = code; throw new Error(`__exit__${code}`); };
  });

  afterEach(() => {
    process.stdout.write = origStdout;
    process.stderr.write = origStderr;
    process.exit = origExit;
    if (testDir && existsSync(testDir)) {
      try { rmSync(testDir, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  });

  const stdout = () => stdoutChunks.join("");
  const stderr = () => stderrChunks.join("");

  test("public-only save creates main and _private at the same change", async () => {
    writeFileSync(join(testDir, "src.js"), "console.log('hi');\n");
    await save(["public change"], { cwd: testDir, engine });
    expect(exitCode).toBe(null);

    const mainId = await bookmarkChangeId(engine, "main");
    const privId = await bookmarkChangeId(engine, "_private");
    expect(mainId).toBeTruthy();
    expect(privId).toBeTruthy();
    expect(mainId).toBe(privId);
    expect(stdout()).toMatch(/Saved: public change/);
  });

  test("private-only save advances _private; main stays put", async () => {
    writeFileSync(join(testDir, "src.js"), "x\n");
    await save(["seed"], { cwd: testDir, engine });
    const mainBefore = await bookmarkChangeId(engine, "main");
    const privBefore = await bookmarkChangeId(engine, "_private");
    expect(mainBefore).toBe(privBefore);

    addPrivatePattern(testDir, "user-voice.md");
    writeFileSync(join(testDir, "user-voice.md"), "secret\n");

    stdoutChunks.length = 0; stderrChunks.length = 0;
    await save(["log"], { cwd: testDir, engine });
    expect(exitCode).toBe(null);

    const mainAfter = await bookmarkChangeId(engine, "main");
    const privAfter = await bookmarkChangeId(engine, "_private");
    expect(mainAfter).toBe(mainBefore);
    expect(privAfter).not.toBe(privBefore);
    expect(stdout()).toMatch(/Saved \[private\]: log/);
  });

  test("mixed save without --split is refused; bookmarks unchanged; WC intact", async () => {
    writeFileSync(join(testDir, "src.js"), "x\n");
    await save(["seed"], { cwd: testDir, engine });
    const mainBefore = await bookmarkChangeId(engine, "main");
    const privBefore = await bookmarkChangeId(engine, "_private");

    addPrivatePattern(testDir, "user-voice.md");
    writeFileSync(join(testDir, "src.js"), "y\n");
    writeFileSync(join(testDir, "user-voice.md"), "secret\n");

    stdoutChunks.length = 0; stderrChunks.length = 0;
    try { await save(["mix"], { cwd: testDir, engine }); } catch { /* exit */ }
    expect(exitCode).toBe(1);
    expect(stderr()).toMatch(/both public and private paths/);

    expect(await bookmarkChangeId(engine, "main")).toBe(mainBefore);
    expect(await bookmarkChangeId(engine, "_private")).toBe(privBefore);

    const status = await engine.status();
    expect(status.data.raw).toContain("src.js");
    expect(status.data.raw).toContain("user-voice.md");
  });

  test("mixed save --split: main on [public] commit, _private on [private] commit", async () => {
    writeFileSync(join(testDir, "seed.js"), "seed\n");
    await save(["seed"], { cwd: testDir, engine });

    addPrivatePattern(testDir, "user-voice.md");
    writeFileSync(join(testDir, "src.js"), "code\n");
    writeFileSync(join(testDir, "user-voice.md"), "secret\n");

    stdoutChunks.length = 0; stderrChunks.length = 0;
    await save(["fix login", "--split"], { cwd: testDir, engine });
    expect(exitCode).toBe(null);
    expect(stdout()).toMatch(/Saved 2 commits/);

    expect(await bookmarkDesc(engine, "main")).toBe("fix login [public]");
    expect(await bookmarkDesc(engine, "_private")).toBe("fix login [private]");

    const mainFiles = (await engine.changedFilesInRange("bookmarks(main)")).data.map((f) => f.path);
    expect(mainFiles).toContain("src.js");
    expect(mainFiles).not.toContain("user-voice.md");

    const privFiles = (await engine.changedFilesInRange("bookmarks(_private)")).data.map((f) => f.path);
    expect(privFiles).toContain("user-voice.md");
    expect(privFiles).not.toContain("src.js");
  });

  test("changedFilesInRange returns parsed entries against real history", async () => {
    writeFileSync(join(testDir, "a.js"), "a\n");
    await save(["c1"], { cwd: testDir, engine });
    writeFileSync(join(testDir, "b.js"), "b\n");
    await save(["c2"], { cwd: testDir, engine });

    const r = await engine.changedFilesInRange("bookmarks(main)");
    expect(r.ok).toBe(true);
    expect(r.data.map((f) => f.path)).toContain("b.js");
  });

  test("private check uses engine.files() against tracked files in a real repo", async () => {
    writeFileSync(join(testDir, "src.js"), "x\n");
    writeFileSync(join(testDir, "secrets.env"), "PASSWORD=hunter2\n");
    await save(["initial"], { cwd: testDir, engine });

    stdoutChunks.length = 0; stderrChunks.length = 0;
    await private_(["check", "secrets.env"], { cwd: testDir, engine });
    expect(exitCode).toBe(null);
    expect(stdout()).toMatch(/secrets\.env/);
    expect(stdout()).toMatch(/1 file would match/);
    expect(stdout()).not.toMatch(/src\.js/);
  });
});
