# test.map.md
# project: giti
# updated: 2026-07-06T10:16:06-06:00  commit: ccad5ba

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
| tests/land.test.js                | 13          | resolveCompilerPath (env, sibling, legacy), findScrmlFiles   |
| tests/private-jj-integration.test.js | 6        | private scope with real jj subprocess                        |
| tests/private.test.js             | 48          | private scope manifest, glob matching, partitionByScope      |
| tests/remote.test.js              | 48          | remote add/remove/set-scope/list                             |
| tests/save-routing.test.js        | 22          | save routing: classifyFromStatus, planBookmarkMoves          |
| tests/server.test.js              | 40          | HTTP route handler (mocked engine): GET/POST endpoints, CSRF, WS |
| tests/sync-pull.test.js           | 15          | sync pull, private overlay bootstrap                         |
| tests/sync-push.test.js           | 16          | sync push, scope-aware push safety                           |
Total (confirmed by re-run 2026-07-06): 375 tests, 0 failures, 791 expect() calls, 14 files, 15.51s.

## Test Categories
Unit:        tests/*.test.js (all except jj-integration and private-jj-integration) — mocked engine/spawn
Integration: tests/jj-integration.test.js, tests/private-jj-integration.test.js — real jj subprocess in tmpdir

## Manual Harnesses (tests/manual/ — NOT run by `bun test`)
These are invoked by hand or by the PA for runtime/browser verification. They are not discovered by bun test.

| File                         | Invocation                                              | What it checks                                                                                    |
|------------------------------|-----------------------------------------------------------------------|-------------------------------------------------|
| tests/manual/channel-runtime.mjs | bun run tests/manual/channel-runtime.mjs          | §38 channel: boots real server, opens 2 WS clients, fires refreshStatus, asserts both get __sync broadcast with real jj data |
| tests/manual/sse-runtime.mjs     | bun run tests/manual/sse-runtime.mjs <dist-dir>   | §37 SSE: loads compiled feed.server.js, counts delivered frames; 2-phase probe isolates enum-undefined (repro-27) root cause |
| tests/manual/browser-paint.mjs   | bun run tests/manual/browser-paint.mjs [baseURL]  | Headless Chromium drives all 7 UI pages; waits for loaders, inspects painted DOM, screenshots to /tmp/giti-paint/. **S17: made portable** — playwright + chromium resolved from `$HOME` (glob for the installed `chromium-*` build) instead of a hardcoded machine path; default baseURL `http://127.0.0.1:3737`. `land` gets a 45s nav-timeout budget (its on-mount preflight runs the REAL gate: full compile + full `bun test`, ~20s+); other pages use 15s. As of S17: 6/7 pages paint clean, feed blocked on GITI-035 (repro-33). |

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

Note: `docs/ast-merge/prototype/merge-driver.mjs` is a separate, standalone research prototype (not part
of the `bun test` suite or tests/manual/) — its own gate is "the merged file must compile" via a direct
`scrml compiler compile` invocation. See structure.map.md.

## Tags
#giti #map #test #bun-test #unit #integration #mock #scrml #manual

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
