# test.map.md
# project: giti
# updated: 2026-04-11T00:00:00Z  commit: 3c4a7c3

## Test Framework
Runner: bun:test (bundled with Bun runtime)
Config: no separate config file; `bun test` auto-discovers *.test.js
Run all:    bun test
Run single: bun test tests/cli.test.js  OR  bun test tests/jj-integration.test.js

## Test Categories
Unit:        tests/cli.test.js — 81 tests (mocked Bun.spawn; no jj required)
Integration: tests/jj-integration.test.js — 7 tests (real jj in PATH required; skips if absent)

## Test Count
Total: 88 (81 unit + 7 integration)

## What is tested (cli.test.js — unit)
| Suite                         | Tests |
|-------------------------------|-------|
| friendlyError                 | 10    |
| jj not installed (ENOENT)     | 3     |
| generic spawn errors          | 1     |
| non-zero exit code            | 2     |
| init                          | 2     |
| save                          | 4     |
| listBranches                  | 3     |
| switchTo                      | 2     |
| createBranch                  | 1     |
| merge                         | 1     |
| undo                          | 1     |
| history                       | 5     |
| status                        | 1     |
| conflicts (new method)        | 4     |
| diff (new method)             | 3     |
| land (new method)             | 6     |
| _rawDescribe                  | 1     |
| _rawSync                      | 3     |
| constructor / repoPath        | 1     |
| friendlyError expanded catalog| 6     |
| parseStatus                   | 8     |
| formatStatus                  | 7     |
| generateMessage               | 6     |

## What is tested (jj-integration.test.js — integration)
Real jj subprocess in a temp directory: init, status, save, history, diff, conflicts, undo.

## Fixtures & Factories
mockSpawn(calls)           — injectable Bun.spawn mock, records calls, returns predetermined results
mockSpawnNotInstalled()    — throws ENOENT to simulate jj missing
mockSpawnGenericError(msg) — throws arbitrary error

## Pattern
Tests import from source modules directly. Unit tests inject a mock spawn function into JjCliEngine
via the `{ spawn }` constructor option. Each test suite uses `describe` + `test` blocks. Assertions
use `expect(...).toBe()`, `.toContain()`, `.toEqual()`, `.toHaveLength()`, `.toBeGreaterThanOrEqual()`,
`.toEndWith()`. Integration tests use `beforeAll`/`afterAll` to create and clean up a real temp repo.
No shared test fixtures on disk — all setup is inline.

## Tags
#giti #map #test #bun-test #unit #integration #mock

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
