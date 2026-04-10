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
import { mkdtempSync, writeFileSync, rmSync } from "fs";
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
