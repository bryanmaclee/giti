# test.map.md
# project: giti
# updated: 2026-06-22T00:00:00Z  commit: b2fde19

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
Total (approx): ~375 tests

## Test Categories
Unit:        tests/*.test.js (all except jj-integration and private-jj-integration) — mocked engine/spawn
Integration: tests/jj-integration.test.js, tests/private-jj-integration.test.js — real jj subprocess in tmpdir

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

## Tags
#giti #map #test #bun-test #unit #integration #mock #scrml

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
