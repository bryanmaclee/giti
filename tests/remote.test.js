/**
 * Tests for remote scope config + sync push filter (slice 2).
 *
 * Covers:
 *   - Remote config I/O (load/save/corrupt/empty)
 *   - addRemote / removeRemote / setRemoteScope (including private→public safety)
 *   - `giti remote` CLI subcommands
 *   - `giti link-private` command
 *   - sync helpers: parseSyncArgs, resolveTargetRemote, checkPushSafety
 *   - sync() end-to-end with a mocked engine (push refused on private change to public remote)
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  loadRemoteConfig,
  saveRemoteConfig,
  addRemote,
  removeRemote,
  listRemotes,
  getRemote,
  setRemoteScope,
  REMOTES_PATH,
} from "../src/private/remotes.js";

import { remote as remoteCmd } from "../src/commands/remote.js";
import { linkPrivate } from "../src/commands/link-private.js";
import {
  sync,
  parseSyncArgs,
  resolveTargetRemote,
  checkPushSafety,
} from "../src/commands/sync.js";

import { addPrivatePattern } from "../src/private/scope.js";

let repoRoot;
beforeEach(() => { repoRoot = mkdtempSync(join(tmpdir(), "giti-remote-")); });
afterEach(() => { if (existsSync(repoRoot)) rmSync(repoRoot, { recursive: true, force: true }); });

// ---------------------------------------------------------------------------
// Remote config I/O
// ---------------------------------------------------------------------------

describe("loadRemoteConfig", () => {
  test("returns empty when file missing", () => {
    const cfg = loadRemoteConfig(repoRoot);
    expect(cfg).toEqual({ remotes: [] });
  });

  test("parses a valid config file", () => {
    mkdirSync(join(repoRoot, ".giti"), { recursive: true });
    writeFileSync(
      join(repoRoot, REMOTES_PATH),
      JSON.stringify({ remotes: [{ name: "origin", url: "https://a.b", scope: "public" }] })
    );
    const cfg = loadRemoteConfig(repoRoot);
    expect(cfg.remotes).toHaveLength(1);
    expect(cfg.remotes[0].name).toBe("origin");
  });

  test("returns empty on corrupt JSON rather than throwing", () => {
    mkdirSync(join(repoRoot, ".giti"), { recursive: true });
    writeFileSync(join(repoRoot, REMOTES_PATH), "{not json");
    expect(loadRemoteConfig(repoRoot)).toEqual({ remotes: [] });
  });

  test("coerces unknown scope to 'public'", () => {
    mkdirSync(join(repoRoot, ".giti"), { recursive: true });
    writeFileSync(
      join(repoRoot, REMOTES_PATH),
      JSON.stringify({ remotes: [{ name: "x", url: "u", scope: "weird" }] })
    );
    const cfg = loadRemoteConfig(repoRoot);
    expect(cfg.remotes[0].scope).toBe("public");
  });
});

describe("saveRemoteConfig", () => {
  test("creates .giti directory on first write", () => {
    expect(existsSync(join(repoRoot, ".giti"))).toBe(false);
    saveRemoteConfig(repoRoot, { remotes: [{ name: "o", url: "u", scope: "public" }] });
    expect(existsSync(join(repoRoot, REMOTES_PATH))).toBe(true);
  });

  test("roundtrip through load", () => {
    saveRemoteConfig(repoRoot, { remotes: [{ name: "o", url: "u", scope: "private" }] });
    const cfg = loadRemoteConfig(repoRoot);
    expect(cfg.remotes[0]).toEqual({ name: "o", url: "u", scope: "private" });
  });
});

describe("addRemote", () => {
  test("first add succeeds", () => {
    const r = addRemote(repoRoot, "origin", "https://a.b", "public");
    expect(r.added).toBe(true);
    expect(r.remote).toEqual({ name: "origin", url: "https://a.b", scope: "public" });
  });

  test("rejects duplicate name", () => {
    addRemote(repoRoot, "origin", "https://a.b", "public");
    const r = addRemote(repoRoot, "origin", "https://c.d", "private");
    expect(r.added).toBe(false);
    expect(r.reason).toBe("already exists");
  });

  test("defaults invalid scope to public", () => {
    const r = addRemote(repoRoot, "origin", "https://a.b", "weird");
    expect(r.remote.scope).toBe("public");
  });

  test("rejects empty name or url", () => {
    expect(addRemote(repoRoot, "", "u", "public").added).toBe(false);
    expect(addRemote(repoRoot, "o", "", "public").added).toBe(false);
  });
});

describe("removeRemote", () => {
  test("removes an existing remote", () => {
    addRemote(repoRoot, "origin", "u", "public");
    const r = removeRemote(repoRoot, "origin");
    expect(r.removed).toBe(true);
    expect(getRemote(repoRoot, "origin")).toBeNull();
  });

  test("returns removed:false on absent remote", () => {
    const r = removeRemote(repoRoot, "ghost");
    expect(r.removed).toBe(false);
    expect(r.reason).toBe("not found");
  });
});

describe("setRemoteScope", () => {
  test("public → private succeeds without --unsafe", () => {
    addRemote(repoRoot, "origin", "u", "public");
    const r = setRemoteScope(repoRoot, "origin", "private");
    expect(r.changed).toBe(true);
    expect(getRemote(repoRoot, "origin").scope).toBe("private");
  });

  test("private → public REFUSED without --unsafe", () => {
    addRemote(repoRoot, "private", "u", "private");
    const r = setRemoteScope(repoRoot, "private", "public");
    expect(r.changed).toBe(false);
    expect(r.reason).toMatch(/--unsafe/);
    expect(getRemote(repoRoot, "private").scope).toBe("private");
  });

  test("private → public allowed with --unsafe", () => {
    addRemote(repoRoot, "private", "u", "private");
    const r = setRemoteScope(repoRoot, "private", "public", { unsafe: true });
    expect(r.changed).toBe(true);
    expect(getRemote(repoRoot, "private").scope).toBe("public");
  });

  test("no-op when scope already matches", () => {
    addRemote(repoRoot, "o", "u", "public");
    const r = setRemoteScope(repoRoot, "o", "public");
    expect(r.changed).toBe(false);
    expect(r.reason).toBe("already that scope");
  });

  test("rejects invalid scope", () => {
    addRemote(repoRoot, "o", "u", "public");
    const r = setRemoteScope(repoRoot, "o", "mystery");
    expect(r.changed).toBe(false);
    expect(r.reason).toMatch(/invalid scope/);
  });

  test("unknown remote returns not-found", () => {
    const r = setRemoteScope(repoRoot, "ghost", "private");
    expect(r.changed).toBe(false);
    expect(r.reason).toBe("not found");
  });
});

// ---------------------------------------------------------------------------
// sync helpers
// ---------------------------------------------------------------------------

describe("parseSyncArgs", () => {
  test("defaults to push + pull", () => {
    expect(parseSyncArgs([])).toEqual({ remote: null, push: true, pull: true });
  });

  test("--push only", () => {
    expect(parseSyncArgs(["--push"])).toEqual({ remote: null, push: true, pull: false });
  });

  test("--pull only", () => {
    expect(parseSyncArgs(["--pull"])).toEqual({ remote: null, push: false, pull: true });
  });

  test("--remote NAME", () => {
    expect(parseSyncArgs(["--remote", "private"])).toMatchObject({ remote: "private" });
  });

  test("--remote=NAME form", () => {
    expect(parseSyncArgs(["--remote=origin"])).toMatchObject({ remote: "origin" });
  });
});

describe("resolveTargetRemote", () => {
  test("no remotes + no request → ok with null", () => {
    expect(resolveTargetRemote(repoRoot, null)).toEqual({ ok: true, remote: null });
  });

  test("requested remote found", () => {
    addRemote(repoRoot, "origin", "u", "public");
    const r = resolveTargetRemote(repoRoot, "origin");
    expect(r.ok).toBe(true);
    expect(r.remote.name).toBe("origin");
  });

  test("requested remote missing → error", () => {
    const r = resolveTargetRemote(repoRoot, "ghost");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/No remote named 'ghost'/);
  });

  test("exactly one remote → auto-selects it", () => {
    addRemote(repoRoot, "origin", "u", "public");
    const r = resolveTargetRemote(repoRoot, null);
    expect(r.ok).toBe(true);
    expect(r.remote.name).toBe("origin");
  });

  test("multiple remotes + no request → ambiguous error", () => {
    addRemote(repoRoot, "origin", "u", "public");
    addRemote(repoRoot, "private", "v", "private");
    const r = resolveTargetRemote(repoRoot, null);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Multiple remotes/);
  });
});

// checkPushSafety uses a mocked engine that returns a status string.
function mockEngine(statusRaw) {
  return {
    status: async () => ({ ok: true, data: { raw: statusRaw } }),
  };
}

describe("checkPushSafety", () => {
  test("no target remote → allowed", async () => {
    const r = await checkPushSafety(mockEngine(""), repoRoot, null);
    expect(r.allowed).toBe(true);
  });

  test("private remote → allowed even with private paths changed", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    const target = { name: "p", url: "u", scope: "private" };
    const r = await checkPushSafety(mockEngine("M user-voice.md\n"), repoRoot, target);
    expect(r.allowed).toBe(true);
  });

  test("public remote + no private changes → allowed", async () => {
    const target = { name: "o", url: "u", scope: "public" };
    const r = await checkPushSafety(mockEngine("M src/main.js\n"), repoRoot, target);
    expect(r.allowed).toBe(true);
  });

  test("public remote + private change → REFUSED", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    const target = { name: "o", url: "u", scope: "public" };
    const r = await checkPushSafety(mockEngine("M user-voice.md\nM src/main.js\n"), repoRoot, target);
    expect(r.allowed).toBe(false);
    expect(r.files.map((f) => f.path)).toContain("user-voice.md");
  });
});

// ---------------------------------------------------------------------------
// sync() end-to-end with mocked engine + stdout capture
// ---------------------------------------------------------------------------

describe("sync() end-to-end", () => {
  let stdoutChunks, stderrChunks, origStdout, origStderr, origExit, exitCode;

  beforeEach(() => {
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
  });

  function stdout() { return stdoutChunks.join(""); }
  function stderr() { return stderrChunks.join(""); }

  function fullMockEngine({ statusRaw = "", fetchOk = true, pushOk = true } = {}) {
    return {
      status: async () => ({ ok: true, data: { raw: statusRaw } }),
      _rawSync: async (dir) => {
        if (dir === "fetch") return fetchOk ? { ok: true, data: "" } : { ok: false, error: "fetch fail" };
        if (dir === "push") return pushOk ? { ok: true, data: "" } : { ok: false, error: "push fail" };
        return { ok: false, error: "unknown" };
      },
    };
  }

  test("refuses push to public remote when working copy has private changes", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    addRemote(repoRoot, "origin", "https://a.b", "public");
    const engine = fullMockEngine({ statusRaw: "M user-voice.md\n" });
    try {
      await sync(["--push"], { cwd: repoRoot, engine });
    } catch (e) { /* swallow exit */ }
    expect(exitCode).toBe(1);
    expect(stderr()).toMatch(/Cannot push/);
    expect(stderr()).toMatch(/user-voice\.md/);
  });

  test("allows push to private remote with private changes", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    addRemote(repoRoot, "mine", "git@host", "private");
    const engine = fullMockEngine({ statusRaw: "M user-voice.md\n" });
    await sync(["--push", "--remote", "mine"], { cwd: repoRoot, engine });
    expect(exitCode).toBe(null);
    expect(stdout()).toMatch(/Synced/);
  });

  test("allows push to public remote with only public changes", async () => {
    addPrivatePattern(repoRoot, "user-voice.md");
    addRemote(repoRoot, "origin", "https://a.b", "public");
    const engine = fullMockEngine({ statusRaw: "M src/main.js\n" });
    await sync(["--push"], { cwd: repoRoot, engine });
    expect(exitCode).toBe(null);
    expect(stdout()).toMatch(/Synced/);
  });

  test("errors on unknown remote", async () => {
    addRemote(repoRoot, "origin", "u", "public");
    const engine = fullMockEngine();
    try {
      await sync(["--remote", "ghost"], { cwd: repoRoot, engine });
    } catch (e) { /* swallow exit */ }
    expect(exitCode).toBe(1);
    expect(stderr()).toMatch(/No remote named 'ghost'/);
  });
});

// ---------------------------------------------------------------------------
// CLI: giti remote ...
// ---------------------------------------------------------------------------

describe("giti remote CLI", () => {
  let stdoutChunks, stderrChunks, origStdout, origStderr, origExit, exitCode;

  beforeEach(() => {
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
  });
  const stdout = () => stdoutChunks.join("");
  const stderr = () => stderrChunks.join("");

  test("list with no remotes", async () => {
    await remoteCmd(["list"], { cwd: repoRoot });
    expect(stdout()).toMatch(/No remotes configured/);
  });

  test("add then list round-trips", async () => {
    await remoteCmd(["add", "origin", "https://a.b"], { cwd: repoRoot });
    stdoutChunks.length = 0;
    await remoteCmd(["list"], { cwd: repoRoot });
    expect(stdout()).toMatch(/origin/);
    expect(stdout()).toMatch(/\[public\]/);
    expect(stdout()).toMatch(/https:\/\/a\.b/);
  });

  test("add --private flags the new remote", async () => {
    await remoteCmd(["add", "mine", "git@h", "--private"], { cwd: repoRoot });
    stdoutChunks.length = 0;
    await remoteCmd(["list"], { cwd: repoRoot });
    expect(stdout()).toMatch(/\[private\]/);
  });

  test("set-scope private → public refused without --unsafe", async () => {
    await remoteCmd(["add", "mine", "u", "--private"], { cwd: repoRoot });
    stderrChunks.length = 0;
    try {
      await remoteCmd(["set-scope", "mine", "public"], { cwd: repoRoot });
    } catch (e) { /* exit */ }
    expect(exitCode).toBe(1);
    expect(stderr()).toMatch(/--unsafe/);
  });

  test("set-scope private → public with --unsafe succeeds", async () => {
    await remoteCmd(["add", "mine", "u", "--private"], { cwd: repoRoot });
    stdoutChunks.length = 0;
    await remoteCmd(["set-scope", "mine", "public", "--unsafe"], { cwd: repoRoot });
    expect(stdout()).toMatch(/is now public/);
  });

  test("remove unknown exits 1", async () => {
    try {
      await remoteCmd(["remove", "ghost"], { cwd: repoRoot });
    } catch (e) { /* exit */ }
    expect(exitCode).toBe(1);
  });

  test("unknown subcommand exits 1", async () => {
    try {
      await remoteCmd(["wat"], { cwd: repoRoot });
    } catch (e) { /* exit */ }
    expect(exitCode).toBe(1);
    expect(stderr()).toMatch(/unknown subcommand/);
  });

  test("no-args prints usage", async () => {
    await remoteCmd([], { cwd: repoRoot });
    expect(stdout()).toMatch(/Usage: giti remote/);
  });
});

// ---------------------------------------------------------------------------
// CLI: giti link-private
// ---------------------------------------------------------------------------

describe("giti link-private CLI", () => {
  let stdoutChunks, stderrChunks, origStdout, origStderr, origExit, exitCode;

  beforeEach(() => {
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
  });
  const stdout = () => stdoutChunks.join("");
  const stderr = () => stderrChunks.join("");

  test("no URL exits 1 with usage", async () => {
    try {
      await linkPrivate([], { cwd: repoRoot });
    } catch (e) { /* exit */ }
    expect(exitCode).toBe(1);
    expect(stdout()).toMatch(/Usage: giti link-private/);
  });

  test("default name 'private', scope private", async () => {
    await linkPrivate(["git@host:me/repo-private"], { cwd: repoRoot });
    const r = getRemote(repoRoot, "private");
    expect(r).not.toBeNull();
    expect(r.scope).toBe("private");
    expect(r.url).toBe("git@host:me/repo-private");
  });

  test("--name overrides default remote name", async () => {
    await linkPrivate(["git@host", "--name", "personal"], { cwd: repoRoot });
    expect(getRemote(repoRoot, "personal")).not.toBeNull();
  });

  test("refuses if remote name already exists", async () => {
    addRemote(repoRoot, "private", "existing", "public");
    try {
      await linkPrivate(["git@other"], { cwd: repoRoot });
    } catch (e) { /* exit */ }
    expect(exitCode).toBe(1);
    expect(stderr()).toMatch(/already exists/);
  });
});
