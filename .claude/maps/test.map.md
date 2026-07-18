# test.map.md
# project: giti
# updated: 2026-07-18T11:12:13-06:00  commit: 64883a8

## Test Framework
Runner: bun:test (bundled with Bun runtime)
Config: no separate config file; `bun test` auto-discovers *.test.js
Run all:    bun test
Run single: bun test tests/<file>.test.js

## Test Files (14 files)
| File                              | Approx tests | Focus                                                        |
|-----------------------------------|-------------|--------------------------------------------------------------|
| tests/cli.test.js                 | 92          | CLI command dispatch, arg parsing, engine method coverage    |
| tests/auto-split.test.js          | 25          | save --split auto-split routing (public/private/mixed)       |
| tests/check.test.js               | 13          | giti check dry-run, --quick, --diff flags                    |
| tests/compile-ui.test.js          | 9           | compileUi() and copySharedCss() (mocked compiler)            |
| tests/history.test.js             | 21          | history command, --since duration filtering                  |
| tests/jj-integration.test.js      | 7           | real jj subprocess: init/save/status/history/undo (skips if no jj) |
| tests/land.test.js                | 13          | resolveCompilerPath (env, sibling, legacy), findScrmlFiles    |
| tests/private-jj-integration.test.js | 6        | private scope with real jj subprocess                        |
| tests/private.test.js             | 48          | private scope manifest, glob matching, partitionByScope      |
| tests/remote.test.js              | 48          | remote add/remove/set-scope/list                             |
| tests/save-routing.test.js        | 22          | save routing: classifyFromStatus, planBookmarkMoves          |
| tests/server.test.js              | 40          | HTTP route handler (mocked engine): GET/POST endpoints, CSRF, WS |
| tests/sync-pull.test.js           | 15          | sync pull, private overlay bootstrap                         |
| tests/sync-push.test.js           | 16          | sync push, scope-aware push safety                           |
Total: 375 tests, 0 failures, 14 files, 791 expect() calls (unchanged through S19 — the fn-promotion
idiom sweep (`function`→`fn` in 12 src/lib/*.scrml modules) is source-only: every compiled `.js` sibling
is byte-identical, so the suite's assertions are unaffected; no test count delta since S18).

## Test Categories
Unit:        tests/*.test.js (all except jj-integration and private-jj-integration) — mocked engine/spawn
Integration: tests/jj-integration.test.js, tests/private-jj-integration.test.js — real jj subprocess in tmpdir

## Manual Harnesses (tests/manual/ — NOT run by `bun test`)
These are invoked by hand or by the PA for runtime/browser verification. They are not discovered by bun test.

| File                         | Invocation                                              | What it checks                                                                                    |
|------------------------------|-----------------------------------------------------------------------|-------------------------------------------------|
| tests/manual/channel-runtime.mjs | bun run tests/manual/channel-runtime.mjs          | §38 channel: boots real server, opens 2 WS clients, fires refreshStatus, asserts both get __sync broadcast with real jj data |
| tests/manual/sse-runtime.mjs     | bun run tests/manual/sse-runtime.mjs <dist-dir>   | §37 SSE: loads compiled feed.server.js, counts delivered frames; 2-phase probe isolates enum-undefined (repro-27) root cause |
| tests/manual/browser-paint.mjs   | bun run tests/manual/browser-paint.mjs [baseURL]  | Headless Chromium drives all 7 UI pages; waits for loaders, inspects painted DOM, screenshots to /tmp/giti-paint/. Portable — playwright + chromium resolved from `$HOME` (glob for the installed `chromium-*` build); default baseURL `http://127.0.0.1:3737`. `land` gets a 45s nav-timeout budget (its on-mount preflight runs the REAL gate: full compile + full `bun test`, ~20s+); other pages use 15s. **S19: SSE-aware settle** — a `SSE_PAGES` set (`feed`) now settles navigation on `waitUntil: "domcontentloaded"` + a 3s post-nav `waitForTimeout`, instead of `networkidle` — an open `EventSource` keeps the network busy forever, so `networkidle` never fires for `feed` even though it renders correctly (this caused a spurious 6/7 + timeout every run through S18). WS-driven `live` is unaffected and keeps `waitUntil: "networkidle"` + a 2.5s settle. **Result: true 7/7 pages paint clean in a single main-harness run** (feed streams real SSE data: "State: ok, Changed files: N"). This is the standing UI-render gate (server-200 ≠ renders). |

## Fixtures & Factories
mockEngine(overrides)         — inline engine stub in server.test.js; overrides specific methods
fakeFs(existingPaths: Set)    — injectable fs stub in land.test.js for resolveCompilerPath tests
check.setRunners / land.setRunners — injectable runner overrides for compiler/test mocking
mkdtempSync + rmSync          — inline tmpdir management in compile-ui.test.js, land.test.js, jj-integration tests

## Pattern
Tests import directly from src/ modules. Unit tests inject mocks via constructor options (`{ spawn }` for
JjCliEngine) or module-level setRunners() hooks. Server tests construct a handler with a mock engine and
issue synthetic Request objects. Assertions use `expect(...).toBe()`, `.toContain()`, `.toEqual()`,
`.toHaveLength()`, `.toBeGreaterThanOrEqual()`, `.toEndWith()`. Integration tests use beforeAll/afterAll to
create and clean up real temp repos. No shared fixture files on disk — all setup is inline.

Note: `docs/ast-merge/prototype/` holds FOUR standalone research merge-driver prototypes (slice 1 struct
field-add, slice 2 enum variant-add, slice 3 multi-entity, slice 4 NEW S19 compiler-validated
disjoint-glue merge) — NOT part of the `bun test` suite or tests/manual/. Slices 1–3's gate is "the merged
file must compile" via a direct `scrml compiler compile` invocation. Slice 4's gate is stronger: the
candidate merge must compile AND pass `scrml semdiff base M --json` with an empty `diagnostics.added`
(verified live this scan: CLEAN fixture exits 1 accept-with-review, DANGLING fixture exits 2 semantic
conflict on `E-TYPE-063`, exactly as documented). See structure.map.md.

## Tags
#giti #map #test #bun-test #unit #integration #mock #scrml #manual #semdiff

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
