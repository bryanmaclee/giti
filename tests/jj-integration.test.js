/**
 * giti jj-cli engine — real jj integration tests
 *
 * These tests require jj installed in PATH. They create real repos
 * in temp dirs and exercise the engine against actual jj output.
 *
 * Skip if jj is not available.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { JjCliEngine } from "../src/engine/jj-cli.js";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { execSync } from "child_process";

// Check if jj is available
let jjAvailable = false;
try {
  execSync("jj version", { stdio: "pipe" });
  jjAvailable = true;
} catch { /* jj not installed */ }

const describeIf = jjAvailable ? describe : describe.skip;

describeIf("jj-cli real integration", () => {
  let testDir;
  let engine;

  beforeAll(() => {
    testDir = mkdtempSync(join(tmpdir(), "giti-test-"));
    engine = new JjCliEngine(testDir);
  });

  afterAll(() => {
    try { rmSync(testDir, { recursive: true, force: true }); } catch {}
  });

  test("init creates a jj repo", async () => {
    const result = await engine.init(testDir);
    expect(result.ok).toBe(true);
    expect(result.data.path).toBe(testDir);
  });

  test("status works on fresh repo", async () => {
    const result = await engine.status();
    expect(result.ok).toBe(true);
    expect(result.data.raw).toBeDefined();
  });

  test("save with message", async () => {
    writeFileSync(join(testDir, "hello.txt"), "hello world\n");
    const result = await engine.save("test save");
    expect(result.ok).toBe(true);
    expect(result.data.description).toBe("test save");
    expect(result.data.changeId).toBeTruthy();
  });

  test("history shows saved change", async () => {
    const result = await engine.history(5);
    expect(result.ok).toBe(true);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    const descriptions = result.data.map(e => e.description);
    expect(descriptions).toContain("test save");
  });

  test("diff returns output", async () => {
    writeFileSync(join(testDir, "new-file.txt"), "new content\n");
    const result = await engine.diff();
    expect(result.ok).toBe(true);
    // Should show the new file in diff
    expect(result.data).toContain("new-file.txt");
  });

  test("conflicts reports no conflicts on clean repo", async () => {
    const result = await engine.conflicts();
    expect(result.ok).toBe(true);
    expect(result.data.hasConflicts).toBe(false);
    expect(result.data.files).toEqual([]);
  });

  test("undo reverts last operation", async () => {
    const result = await engine.undo();
    expect(result.ok).toBe(true);
    expect(result.data.undone).toBe(true);
  });
});

/**
 * AST-merge input primitives against a REAL conflicted repo (§4.3).
 *
 * This suite exists because the previous `conflicts()` implementation parsed a
 * `C <path>` status format jj does not emit, and its unit mock encoded that
 * same fiction — so the bug was invisible to the whole suite. Every assertion
 * here runs against output jj actually produced, which is the only thing that
 * can catch that class. Uses its own repo (the shared one above is mutated by
 * the undo test).
 */
describeIf("AST-merge input primitives (real conflict)", () => {
  let dir;
  let engine;
  let baseRev, sideARev, sideBRev;

  const jj = (args) => execSync(`jj ${args}`, { cwd: dir, stdio: "pipe" }).toString();

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "giti-conflict-"));
    engine = new JjCliEngine(dir);
    jj("git init --colocate .");
    jj('config set --repo user.name "giti-test"');
    jj('config set --repo user.email "giti-test@example.com"');

    // base -> two divergent sides editing the SAME line (a guaranteed conflict)
    writeFileSync(join(dir, "f.txt"), "line1\nSHARED\nline3\n");
    jj('describe -m base');
    baseRev = jj("log -r @ --no-graph -T 'change_id.short()'").trim();

    jj("new");
    writeFileSync(join(dir, "f.txt"), "line1\nAAA\nline3\n");
    jj('describe -m sideA');
    sideARev = jj("log -r @ --no-graph -T 'change_id.short()'").trim();

    jj(`new ${baseRev}`);
    writeFileSync(join(dir, "f.txt"), "line1\nBBB\nline3\n");
    jj('describe -m sideB');
    sideBRev = jj("log -r @ --no-graph -T 'change_id.short()'").trim();

    // Merge the two sides -> conflicted working copy
    jj(`new ${sideARev} ${sideBRev} -m merged`);
  });

  afterAll(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  });

  test("conflicts() reports the conflicted path from real jj output", async () => {
    const result = await engine.conflicts();
    expect(result.ok).toBe(true);
    expect(result.data.hasConflicts).toBe(true);
    // The assertion the old `C <path>` parse could never satisfy.
    expect(result.data.files).toEqual(["f.txt"]);
  });

  test("parents() returns both sides of the conflicted merge", async () => {
    const result = await engine.parents("@");
    expect(result.ok).toBe(true);
    expect(result.data.length).toBe(2);
    expect(result.data.sort()).toEqual([sideARev, sideBRev].sort());
  });

  test("mergeBase() recovers the common ancestor", async () => {
    const result = await engine.mergeBase(sideARev, sideBRev);
    expect(result.ok).toBe(true);
    expect(result.data).toBe(baseRev);
  });

  test("fileAt() yields clean whole-file sides (no conflict markers)", async () => {
    const base = await engine.fileAt(baseRev, "f.txt");
    const a = await engine.fileAt(sideARev, "f.txt");
    const b = await engine.fileAt(sideBRev, "f.txt");

    expect(base.data).toBe("line1\nSHARED\nline3\n");
    expect(a.data).toBe("line1\nAAA\nline3\n");
    expect(b.data).toBe("line1\nBBB\nline3\n");

    // The whole point: these are parseable sources, not jj's marker format.
    for (const r of [base, a, b]) {
      expect(r.data).not.toContain("<<<<<<<");
      expect(r.data).not.toContain("%%%%%%%");
    }
  });

  test("the working-copy file IS materialized with markers (contrast)", () => {
    const wc = readFileSync(join(dir, "f.txt"), "utf8");
    expect(wc).toContain("<<<<<<<");
    // Documents why we fetch by revision instead of parsing this.
    expect(wc).toContain("conflict");
  });
});
