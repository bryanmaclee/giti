/**
 * giti history --since (GAP-8, spec §2.5)
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { history, parseDuration, parseTimestamp } from "../src/commands/history.js";

describe("parseDuration", () => {
  test("accepts minutes (30m)", () => {
    expect(parseDuration("30m")).toEqual({ ok: true, ms: 30 * 60_000 });
  });
  test("accepts hours (2h)", () => {
    expect(parseDuration("2h")).toEqual({ ok: true, ms: 2 * 3_600_000 });
  });
  test("accepts days (7d)", () => {
    expect(parseDuration("7d")).toEqual({ ok: true, ms: 7 * 86_400_000 });
  });
  test("accepts single-digit", () => {
    expect(parseDuration("1d").ms).toBe(86_400_000);
  });
  test("rejects zero", () => {
    const r = parseDuration("0m");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("positive");
  });
  test("rejects negative (regex fails before numeric check)", () => {
    expect(parseDuration("-1h").ok).toBe(false);
  });
  test("rejects empty unit", () => {
    expect(parseDuration("5").ok).toBe(false);
  });
  test("rejects unknown unit", () => {
    expect(parseDuration("3w").ok).toBe(false);
  });
  test("rejects non-string", () => {
    expect(parseDuration(undefined).ok).toBe(false);
    expect(parseDuration(null).ok).toBe(false);
    expect(parseDuration(120).ok).toBe(false);
  });
  test("error message names format examples", () => {
    expect(parseDuration("xyz").error).toContain("30m");
    expect(parseDuration("xyz").error).toContain("7d");
  });
});

describe("parseTimestamp", () => {
  test("parses YYYY-MM-DD HH:MM into epoch ms", () => {
    const t = parseTimestamp("2026-05-23 05:57");
    expect(Number.isFinite(t)).toBe(true);
    // Round-trip through Date
    const d = new Date(t);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4); // May = 4 (0-indexed)
    expect(d.getDate()).toBe(23);
    expect(d.getHours()).toBe(5);
    expect(d.getMinutes()).toBe(57);
  });
  test("returns NaN on garbage", () => {
    expect(parseTimestamp("not a date")).toBeNaN();
    expect(parseTimestamp("")).toBeNaN();
    expect(parseTimestamp(undefined)).toBeNaN();
  });
});

// CLI-level tests (history command)

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
});

const stdout = () => stdoutChunks.join("");
const stderr = () => stderrChunks.join("");

function makeEngine(entries) {
  return {
    history: async () => ({ ok: true, data: entries }),
  };
}

function tsAgo({ minutesAgo = 0, hoursAgo = 0, daysAgo = 0, now }) {
  const ms = now - minutesAgo * 60_000 - hoursAgo * 3_600_000 - daysAgo * 86_400_000;
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

describe("giti history (no --since: existing behavior)", () => {
  test("prints entries with default limit when no args", async () => {
    const entries = [
      { changeId: "abcd1234efgh", description: "save A", timestamp: "2026-05-23 05:57" },
      { changeId: "wxyz5678ijkl", description: "save B", timestamp: "2026-05-23 04:00" },
    ];
    await history([], { getEngine: () => makeEngine(entries) });
    expect(stdout()).toContain("abcd1234  save A  2026-05-23 05:57");
    expect(stdout()).toContain("wxyz5678  save B  2026-05-23 04:00");
    expect(exitCode).toBeNull();
  });

  test("empty history shows hint", async () => {
    await history([], { getEngine: () => makeEngine([]) });
    expect(stdout()).toContain("No history yet");
  });
});

describe("giti history --since (GAP-8)", () => {
  const FIXED_NOW = new Date(2026, 4, 23, 12, 0).getTime();

  test("includes entries within window, excludes older", async () => {
    const entries = [
      { changeId: "fresh111aaaa", description: "recent",   timestamp: tsAgo({ minutesAgo: 15, now: FIXED_NOW }) },
      { changeId: "edge222bbbb",  description: "edge",     timestamp: tsAgo({ minutesAgo: 60, now: FIXED_NOW }) },
      { changeId: "stale33ccc",   description: "too old",  timestamp: tsAgo({ hoursAgo: 3,  now: FIXED_NOW }) },
    ];
    await history(["--since", "2h"], {
      getEngine: () => makeEngine(entries),
      now: () => FIXED_NOW,
    });
    expect(stdout()).toContain("recent");
    expect(stdout()).toContain("edge");
    expect(stdout()).not.toContain("too old");
  });

  test("day window filters across day boundary", async () => {
    const entries = [
      { changeId: "today1aaaaaa", description: "today",  timestamp: tsAgo({ hoursAgo: 5,  now: FIXED_NOW }) },
      { changeId: "yest12bbbbbb", description: "yest",   timestamp: tsAgo({ hoursAgo: 25, now: FIXED_NOW }) },
    ];
    await history(["--since", "1d"], {
      getEngine: () => makeEngine(entries),
      now: () => FIXED_NOW,
    });
    expect(stdout()).toContain("today");
    expect(stdout()).not.toContain("yest");
  });

  test("empty window result shows friendly message", async () => {
    const entries = [
      { changeId: "old111aaaaaa", description: "ancient", timestamp: tsAgo({ daysAgo: 30, now: FIXED_NOW }) },
    ];
    await history(["--since", "2h"], {
      getEngine: () => makeEngine(entries),
      now: () => FIXED_NOW,
    });
    expect(stdout()).toContain("No saves in the last 2h");
    expect(stdout()).not.toContain("ancient");
  });

  test("invalid duration → exits 1 with friendly error", async () => {
    await expect(
      history(["--since", "2hours"], {
        getEngine: () => makeEngine([]),
        now: () => FIXED_NOW,
      })
    ).rejects.toThrow("__exit_1__");
    expect(stderr()).toContain("invalid duration");
    expect(exitCode).toBe(1);
  });

  test("missing duration value → exits 1", async () => {
    await expect(
      history(["--since"], { getEngine: () => makeEngine([]) })
    ).rejects.toThrow("__exit_1__");
    expect(exitCode).toBe(1);
  });

  test("--since fetches up to cap, then filters", async () => {
    // Engine sees the request and returns many entries; --since whittles down
    let requestedLimit = null;
    const engine = {
      history: async (limit) => {
        requestedLimit = limit;
        return {
          ok: true,
          data: [
            { changeId: "kept1aaaaaaa", description: "kept",    timestamp: tsAgo({ minutesAgo: 10, now: FIXED_NOW }) },
            { changeId: "drop1bbbbbbb", description: "dropped", timestamp: tsAgo({ daysAgo: 5,    now: FIXED_NOW }) },
          ],
        };
      },
    };
    await history(["--since", "30m"], { getEngine: () => engine, now: () => FIXED_NOW });
    expect(requestedLimit).toBeGreaterThan(20);
    expect(stdout()).toContain("kept");
    expect(stdout()).not.toContain("dropped");
  });

  test("unparseable timestamp drops entry silently", async () => {
    const entries = [
      { changeId: "good11aaaaaa", description: "good",    timestamp: tsAgo({ minutesAgo: 10, now: FIXED_NOW }) },
      { changeId: "bad22bbbbbbb", description: "junkts",  timestamp: "not-a-timestamp" },
    ];
    await history(["--since", "1h"], {
      getEngine: () => makeEngine(entries),
      now: () => FIXED_NOW,
    });
    expect(stdout()).toContain("good");
    expect(stdout()).not.toContain("junkts");
  });
});
