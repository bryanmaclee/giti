/**
 * giti check — dry-run validation (GAP-6, spec §9.6)
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { check } from "../src/commands/check.js";

let stdoutChunks;
let stderrChunks;
let exitCode;
let stdoutSpy;
let stderrSpy;
let exitSpy;

beforeEach(() => {
  stdoutChunks = [];
  stderrChunks = [];
  exitCode = null;
  stdoutSpy = spyOn(process.stdout, "write").mockImplementation((s) => {
    stdoutChunks.push(s);
    return true;
  });
  stderrSpy = spyOn(process.stderr, "write").mockImplementation((s) => {
    stderrChunks.push(s);
    return true;
  });
  exitSpy = spyOn(process, "exit").mockImplementation((code) => {
    exitCode = code;
    throw new Error(`__exit_${code}__`);
  });
});

afterEach(() => {
  stdoutSpy.mockRestore();
  stderrSpy.mockRestore();
  exitSpy.mockRestore();
  check.resetRunners();
});

function stdout() {
  return stdoutChunks.join("");
}
function stderr() {
  return stderrChunks.join("");
}

function setRunners({ compiler, tests: testRunner, status: statusFn }) {
  check.setRunners({
    runCompiler: compiler && (async () => compiler),
    runTests: testRunner && (async () => testRunner),
    getEngine: statusFn && (() => ({ status: async () => statusFn })),
  });
}

describe("giti check (default: compiler + tests)", () => {
  test("passes when compiler ok + tests ok", async () => {
    setRunners({
      compiler: { ok: true, data: { fileCount: 3 } },
      tests: { ok: true, data: { count: "42" } },
    });
    await check([]);
    expect(stdout()).toContain("Compiler: pass (3 files)");
    expect(stdout()).toContain("Tests: pass (42)");
    expect(stdout()).toContain("Check passed.");
    expect(exitCode).toBeNull();
  });

  test("compiler skipped when no .scrml files", async () => {
    setRunners({
      compiler: { ok: true, data: { skipped: true, fileCount: 0 } },
      tests: { ok: true, data: { count: "42" } },
    });
    await check([]);
    expect(stdout()).toContain("Compiler: skipped (no .scrml files)");
    expect(stdout()).toContain("Tests: pass (42)");
  });

  test("compiler fail → exits 1, error on stderr", async () => {
    setRunners({
      compiler: { ok: false, error: "boom: parse error at line 5" },
      tests: { ok: true, data: { count: "42" } },
    });
    await expect(check([])).rejects.toThrow("__exit_1__");
    expect(stderr()).toContain("Check failed: the compiler found errors");
    expect(stderr()).toContain("boom: parse error at line 5");
    expect(stderr()).toContain("Fix the errors above and run giti check again");
    expect(exitCode).toBe(1);
  });

  test("compiler fail → tests NOT run", async () => {
    let testsCalled = false;
    check.setRunners({
      runCompiler: async () => ({ ok: false, error: "compile boom" }),
      runTests: async () => {
        testsCalled = true;
        return { ok: true, data: { count: "0" } };
      },
    });
    await expect(check([])).rejects.toThrow("__exit_1__");
    expect(testsCalled).toBe(false);
  });

  test("tests fail → exits 1, error on stderr", async () => {
    setRunners({
      compiler: { ok: true, data: { fileCount: 3 } },
      tests: { ok: false, error: "FAIL: src/foo.test.js — expected 1 to be 2" },
    });
    await expect(check([])).rejects.toThrow("__exit_1__");
    expect(stderr()).toContain("Check failed: tests failed");
    expect(stderr()).toContain("FAIL: src/foo.test.js");
    expect(exitCode).toBe(1);
  });

  test("singular file count", async () => {
    setRunners({
      compiler: { ok: true, data: { fileCount: 1 } },
      tests: { ok: true, data: { count: "1" } },
    });
    await check([]);
    expect(stdout()).toContain("Compiler: pass (1 file)");
  });
});

describe("giti check --quick (compiler only)", () => {
  test("compiler ok → exits 0 without running tests", async () => {
    let testsCalled = false;
    check.setRunners({
      runCompiler: async () => ({ ok: true, data: { fileCount: 2 } }),
      runTests: async () => {
        testsCalled = true;
        return { ok: true, data: { count: "9" } };
      },
    });
    await check(["--quick"]);
    expect(testsCalled).toBe(false);
    expect(stdout()).toContain("Compiler: pass (2 files)");
    expect(stdout()).toContain("Check passed (compiler only");
    expect(exitCode).toBeNull();
  });

  test("compiler fail → exits 1 (same as default)", async () => {
    setRunners({
      compiler: { ok: false, error: "compile fail" },
    });
    await expect(check(["--quick"])).rejects.toThrow("__exit_1__");
    expect(stderr()).toContain("compile fail");
    expect(exitCode).toBe(1);
  });
});

describe("giti check --diff (list .scrml changes)", () => {
  test("lists .scrml files changed in working copy", async () => {
    setRunners({
      status: {
        ok: true,
        data: {
          raw: [
            "M ui/status.scrml",
            "A ui/new.scrml",
            "M README.md",
            "D src/old.js",
            "M ui/diff.scrml",
          ].join("\n"),
        },
      },
    });
    await check(["--diff"]);
    const out = stdout();
    expect(out).toContain("ui/status.scrml");
    expect(out).toContain("ui/new.scrml");
    expect(out).toContain("ui/diff.scrml");
    expect(out).not.toContain("README.md");
    expect(out).not.toContain("src/old.js");
    expect(exitCode).toBeNull();
  });

  test("kind label rendered (modified/added/deleted)", async () => {
    setRunners({
      status: {
        ok: true,
        data: {
          raw: ["M ui/a.scrml", "A ui/b.scrml", "D ui/c.scrml"].join("\n"),
        },
      },
    });
    await check(["--diff"]);
    expect(stdout()).toContain("modified");
    expect(stdout()).toContain("added");
    expect(stdout()).toContain("deleted");
  });

  test("no .scrml changes → friendly message", async () => {
    setRunners({
      status: {
        ok: true,
        data: { raw: "M README.md\nM package.json\n" },
      },
    });
    await check(["--diff"]);
    expect(stdout()).toContain("No .scrml files changed");
    expect(exitCode).toBeNull();
  });

  test("--diff does NOT run compiler or tests", async () => {
    let compilerCalled = false;
    let testsCalled = false;
    check.setRunners({
      runCompiler: async () => {
        compilerCalled = true;
        return { ok: true, data: { fileCount: 99 } };
      },
      runTests: async () => {
        testsCalled = true;
        return { ok: true, data: { count: "99" } };
      },
      getEngine: () => ({ status: async () => ({ ok: true, data: { raw: "" } }) }),
    });
    await check(["--diff"]);
    expect(compilerCalled).toBe(false);
    expect(testsCalled).toBe(false);
  });

  test("engine status error → exits 1", async () => {
    setRunners({
      status: { ok: false, error: "jj is not installed" },
    });
    await expect(check(["--diff"])).rejects.toThrow("__exit_1__");
    expect(stderr()).toContain("jj is not installed");
    expect(exitCode).toBe(1);
  });
});
