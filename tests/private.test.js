/**
 * Tests for private path scoping (spec §12).
 *
 * Covers:
 *   - Manifest I/O: empty, roundtrip, ignores blanks/comments
 *   - Path matching: exact, directory, single-star, double-star, char-class
 *   - Partitioning a file list
 *   - add / remove pattern logic
 *   - `giti private` CLI subcommand behavior
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  loadPrivateManifest,
  savePrivateManifest,
  matchGlob,
  isPrivatePath,
  partitionByScope,
  addPrivatePattern,
  removePrivatePattern,
  normalizeRelPath,
  MANIFEST_PATH,
} from "../src/private/scope.js";

import { private_ } from "../src/commands/private.js";

// ---------------------------------------------------------------------------
// Harness: scratch repo
// ---------------------------------------------------------------------------

let repoRoot;

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), "giti-private-"));
});

afterEach(() => {
  if (repoRoot && existsSync(repoRoot)) {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Manifest I/O
// ---------------------------------------------------------------------------

describe("loadPrivateManifest", () => {
  test("returns only the implicit self-pattern when manifest is absent", () => {
    const globs = loadPrivateManifest(repoRoot);
    expect(globs).toEqual([MANIFEST_PATH]);
  });

  test("reads globs from manifest and prepends the implicit self-pattern", () => {
    mkdirSync(join(repoRoot, ".giti"), { recursive: true });
    writeFileSync(
      join(repoRoot, MANIFEST_PATH),
      "user-voice.md\nhand-off.md\n.claude/\n"
    );
    const globs = loadPrivateManifest(repoRoot);
    expect(globs[0]).toBe(MANIFEST_PATH);
    expect(globs).toContain("user-voice.md");
    expect(globs).toContain("hand-off.md");
    expect(globs).toContain(".claude/");
  });

  test("ignores blank lines and comments", () => {
    mkdirSync(join(repoRoot, ".giti"), { recursive: true });
    writeFileSync(
      join(repoRoot, MANIFEST_PATH),
      "# a comment\n\nfoo.md\n  \n# another\nbar/\n"
    );
    const globs = loadPrivateManifest(repoRoot);
    expect(globs.filter((g) => g !== MANIFEST_PATH)).toEqual(["foo.md", "bar/"]);
  });

  test("does not duplicate the implicit self-pattern even if present in file", () => {
    mkdirSync(join(repoRoot, ".giti"), { recursive: true });
    writeFileSync(
      join(repoRoot, MANIFEST_PATH),
      `${MANIFEST_PATH}\nfoo.md\n`
    );
    const globs = loadPrivateManifest(repoRoot);
    const selfCount = globs.filter((g) => g === MANIFEST_PATH).length;
    expect(selfCount).toBe(1);
  });
});

describe("savePrivateManifest", () => {
  test("creates the .giti directory on first write", () => {
    expect(existsSync(join(repoRoot, ".giti"))).toBe(false);
    savePrivateManifest(repoRoot, ["foo.md"]);
    expect(existsSync(join(repoRoot, ".giti"))).toBe(true);
    expect(existsSync(join(repoRoot, MANIFEST_PATH))).toBe(true);
  });

  test("writes globs with a header comment", () => {
    savePrivateManifest(repoRoot, ["foo.md", "bar/"]);
    const raw = readFileSync(join(repoRoot, MANIFEST_PATH), "utf8");
    expect(raw).toContain("# giti private paths");
    expect(raw).toContain("foo.md");
    expect(raw).toContain("bar/");
  });

  test("roundtrips via load", () => {
    savePrivateManifest(repoRoot, ["foo.md", "**/*.secret", "bar/"]);
    const globs = loadPrivateManifest(repoRoot);
    expect(globs).toContain("foo.md");
    expect(globs).toContain("**/*.secret");
    expect(globs).toContain("bar/");
  });

  test("deduplicates on write", () => {
    savePrivateManifest(repoRoot, ["foo.md", "foo.md", "bar/"]);
    const raw = readFileSync(join(repoRoot, MANIFEST_PATH), "utf8");
    const matches = raw.match(/^foo\.md$/gm) || [];
    expect(matches.length).toBe(1);
  });

  test("never writes the implicit self-pattern", () => {
    savePrivateManifest(repoRoot, [MANIFEST_PATH, "foo.md"]);
    const raw = readFileSync(join(repoRoot, MANIFEST_PATH), "utf8");
    expect(raw).not.toContain(MANIFEST_PATH);
    expect(raw).toContain("foo.md");
  });
});

// ---------------------------------------------------------------------------
// Path normalization
// ---------------------------------------------------------------------------

describe("normalizeRelPath", () => {
  test("strips leading ./ and /", () => {
    expect(normalizeRelPath("./foo/bar.md")).toBe("foo/bar.md");
    expect(normalizeRelPath("/foo/bar.md")).toBe("foo/bar.md");
  });

  test("passes through already-normalized paths", () => {
    expect(normalizeRelPath("foo/bar.md")).toBe("foo/bar.md");
  });

  test("empty becomes empty", () => {
    expect(normalizeRelPath("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Glob matching
// ---------------------------------------------------------------------------

describe("matchGlob", () => {
  test("literal file name matches exact path", () => {
    expect(matchGlob("hand-off.md", "hand-off.md")).toBe(true);
    expect(matchGlob("user-voice.md", "hand-off.md")).toBe(false);
  });

  test("literal directory matches files inside it", () => {
    expect(matchGlob("handOffs/hand-off-1.md", "handOffs")).toBe(true);
    expect(matchGlob("handOffs/read/msg.md", "handOffs")).toBe(true);
  });

  test("trailing slash makes directory pattern explicit", () => {
    expect(matchGlob(".claude/agents/foo.md", ".claude/")).toBe(true);
    expect(matchGlob(".claude", ".claude/")).toBe(true);
    expect(matchGlob(".claudenot", ".claude/")).toBe(false);
  });

  test("single-star does not cross directory boundaries", () => {
    expect(matchGlob("foo.md", "*.md")).toBe(true);
    expect(matchGlob("dir/foo.md", "*.md")).toBe(false);
    expect(matchGlob("a.md", "*.md")).toBe(true);
  });

  test("double-star crosses directory boundaries", () => {
    expect(matchGlob("a/b/c/secret.key", "**/*.key")).toBe(true);
    expect(matchGlob("secret.key", "**/*.key")).toBe(true);
    expect(matchGlob("a/b/secret.key", "**/secret.key")).toBe(true);
  });

  test("character class", () => {
    expect(matchGlob("log1.txt", "log[0-9].txt")).toBe(true);
    expect(matchGlob("logA.txt", "log[0-9].txt")).toBe(false);
  });

  test("question mark matches single char", () => {
    expect(matchGlob("a.md", "?.md")).toBe(true);
    expect(matchGlob("ab.md", "?.md")).toBe(false);
  });

  test("empty glob never matches", () => {
    expect(matchGlob("foo", "")).toBe(false);
    expect(matchGlob("foo", "   ")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isPrivatePath + partition
// ---------------------------------------------------------------------------

describe("isPrivatePath", () => {
  test("matches against any glob in the list", () => {
    const globs = [".giti/private", "user-voice.md", "handOffs/", "**/*.secret"];
    expect(isPrivatePath("user-voice.md", globs)).toBe(true);
    expect(isPrivatePath("handOffs/hand-off-1.md", globs)).toBe(true);
    expect(isPrivatePath("config/api.secret", globs)).toBe(true);
    expect(isPrivatePath("src/save.js", globs)).toBe(false);
  });

  test("manifest itself is private", () => {
    const globs = loadPrivateManifest(repoRoot);
    expect(isPrivatePath(".giti/private", globs)).toBe(true);
  });

  test("empty path is not private", () => {
    expect(isPrivatePath("", [".giti/private", "foo"])).toBe(false);
  });
});

describe("partitionByScope", () => {
  test("splits a changed-file list cleanly", () => {
    const files = [
      { kind: "modified", path: "src/save.js" },
      { kind: "modified", path: "user-voice.md" },
      { kind: "added", path: "handOffs/hand-off-6.md" },
      { kind: "modified", path: "README.md" },
    ];
    const globs = [".giti/private", "user-voice.md", "handOffs/"];
    const part = partitionByScope(files, globs);
    expect(part.private.map((f) => f.path)).toEqual([
      "user-voice.md",
      "handOffs/hand-off-6.md",
    ]);
    expect(part.public.map((f) => f.path)).toEqual([
      "src/save.js",
      "README.md",
    ]);
  });

  test("empty input yields empty buckets", () => {
    const part = partitionByScope([], [".giti/private"]);
    expect(part.public).toEqual([]);
    expect(part.private).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// addPrivatePattern / removePrivatePattern
// ---------------------------------------------------------------------------

describe("addPrivatePattern", () => {
  test("creates manifest on first add", () => {
    const result = addPrivatePattern(repoRoot, "user-voice.md");
    expect(result.added).toBe(true);
    expect(existsSync(join(repoRoot, MANIFEST_PATH))).toBe(true);
    expect(result.globs).toContain("user-voice.md");
  });

  test("is idempotent — already-present pattern returns added:false", () => {
    addPrivatePattern(repoRoot, "foo.md");
    const result = addPrivatePattern(repoRoot, "foo.md");
    expect(result.added).toBe(false);
    expect(result.reason).toBe("already present");
  });

  test("empty pattern is rejected", () => {
    const result = addPrivatePattern(repoRoot, "   ");
    expect(result.added).toBe(false);
  });

  test("trims whitespace before storing", () => {
    const result = addPrivatePattern(repoRoot, "  foo.md  ");
    expect(result.added).toBe(true);
    expect(result.globs).toContain("foo.md");
    expect(result.globs).not.toContain("  foo.md  ");
  });
});

describe("removePrivatePattern", () => {
  test("removes an existing pattern", () => {
    addPrivatePattern(repoRoot, "foo.md");
    const result = removePrivatePattern(repoRoot, "foo.md");
    expect(result.removed).toBe(true);
    expect(result.globs).not.toContain("foo.md");
  });

  test("returns removed:false when pattern is absent", () => {
    const result = removePrivatePattern(repoRoot, "never-added.md");
    expect(result.removed).toBe(false);
    expect(result.reason).toBe("not in manifest");
  });

  test("refuses to remove the implicit manifest-self pattern", () => {
    const result = removePrivatePattern(repoRoot, MANIFEST_PATH);
    expect(result.removed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CLI subcommand: captures stdout/stderr from private_()
// ---------------------------------------------------------------------------

describe("giti private CLI", () => {
  let stdoutChunks;
  let stderrChunks;
  let origStdoutWrite;
  let origStderrWrite;
  let origExit;
  let exitCode;

  beforeEach(() => {
    stdoutChunks = [];
    stderrChunks = [];
    origStdoutWrite = process.stdout.write.bind(process.stdout);
    origStderrWrite = process.stderr.write.bind(process.stderr);
    origExit = process.exit;
    exitCode = null;
    process.stdout.write = (chunk) => {
      stdoutChunks.push(typeof chunk === "string" ? chunk : chunk.toString());
      return true;
    };
    process.stderr.write = (chunk) => {
      stderrChunks.push(typeof chunk === "string" ? chunk : chunk.toString());
      return true;
    };
    process.exit = (code) => {
      exitCode = code;
      throw new Error(`__exit__${code}`);
    };
  });

  afterEach(() => {
    process.stdout.write = origStdoutWrite;
    process.stderr.write = origStderrWrite;
    process.exit = origExit;
  });

  function stdout() { return stdoutChunks.join(""); }
  function stderr() { return stderrChunks.join(""); }

  test("list on empty manifest reports no private paths", async () => {
    await private_(["list"], { cwd: repoRoot });
    expect(stdout()).toContain("No private paths configured");
  });

  test("add followed by list shows the pattern", async () => {
    await private_(["add", "user-voice.md"], { cwd: repoRoot });
    stdoutChunks.length = 0;
    await private_(["list"], { cwd: repoRoot });
    expect(stdout()).toContain("user-voice.md");
  });

  test("add without a pattern exits with code 1", async () => {
    try {
      await private_(["add"], { cwd: repoRoot });
    } catch (e) { /* swallow exit */ }
    expect(exitCode).toBe(1);
    expect(stderr()).toContain("pattern required");
  });

  test("add-then-remove leaves an empty manifest", async () => {
    await private_(["add", "foo.md"], { cwd: repoRoot });
    stdoutChunks.length = 0;
    await private_(["remove", "foo.md"], { cwd: repoRoot });
    expect(stdout()).toContain("Removed private pattern");
    stdoutChunks.length = 0;
    await private_(["list"], { cwd: repoRoot });
    expect(stdout()).toContain("No private paths configured");
  });

  test("unknown subcommand prints usage and exits 1", async () => {
    try {
      await private_(["wat"], { cwd: repoRoot });
    } catch (e) { /* swallow exit */ }
    expect(exitCode).toBe(1);
    expect(stderr()).toContain("unknown subcommand");
  });

  test("no subcommand prints help (exit 0)", async () => {
    await private_([], { cwd: repoRoot });
    expect(stdout()).toContain("Usage: giti private");
    expect(exitCode).toBe(null);
  });

  test("idempotent add: second add does not exit 1", async () => {
    await private_(["add", "foo.md"], { cwd: repoRoot });
    stdoutChunks.length = 0;
    stderrChunks.length = 0;
    await private_(["add", "foo.md"], { cwd: repoRoot });
    expect(exitCode).toBe(null);
    expect(stderr()).toContain("already present");
  });

  test("remove of absent pattern exits 1", async () => {
    try {
      await private_(["remove", "never-there.md"], { cwd: repoRoot });
    } catch (e) { /* swallow exit */ }
    expect(exitCode).toBe(1);
    expect(stderr()).toContain("not in manifest");
  });
});
