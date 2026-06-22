# primary.map.md
# project: giti
# updated: 2026-06-22T00:00:00Z  commit: b2fde19

## Project Fingerprint
Language:   JavaScript (ES modules, no TypeScript)
Framework:  Bun (Bun.serve HTTP, Bun.spawn subprocess, bun:test)
Runtime:    Bun; jj 0.40+ in PATH; scrml compiler at ../scrml/ (for land/check/serve)
Type:       CLI tool + HTTP server + scrml-dogfood project
Size:       ~80 source files, ~375 tests across 14 test files

## Map Index
| Map                  | Status  | Contents                                                         |
|----------------------|---------|------------------------------------------------------------------|
| structure.map.md     | present | directory layout, 15 CLI commands, scrml module list             |
| dependencies.map.md  | present | 0 declared packages; Bun builtins + jj + scrml compiler deps     |
| schema.map.md        | present | 8 domain shapes; JSDoc typedefs; engine result pattern           |
| config.map.md        | present | 4 env vars (GITI_LOCAL_DEV, GITI_SERVER_LOG, SCRML_PATH, SCRMLTS_PATH) |
| build.map.md         | present | dev/test commands; scrml compile step; serve startup sequence    |
| error.map.md         | present | 15 friendly error codes; gate error codes; result-object pattern |
| test.map.md          | present | bun:test, ~375 tests, 14 test files                              |
| api.map.md           | present | 15 CLI commands + 8 HTTP endpoints + 17 engine methods           |
| state.map.md         | absent  | no state management library                                      |
| events.map.md        | absent  | no event bus (scrml §38 channel WebSocket handled inline in server) |
| auth.map.md          | absent  | no auth (remote auth delegated to jj/git; HTTP server 127.0.0.1 only) |
| domain.map.md        | absent  | no domain/ dir; domain concepts captured in schema.map.md        |
| style.map.md         | absent  | UI uses per-page scrml-compiled CSS + shared ui/theme.css        |
| i18n.map.md          | absent  | no i18n                                                          |
| infra.map.md         | absent  | no Docker, no CI/CD, no cloud resources                          |
| migrations.map.md    | absent  | no database                                                      |
| jobs.map.md          | absent  | no background jobs                                               |

## File Routing
types / interfaces / domain shapes      → schema.map.md
CLI commands / HTTP endpoints           → api.map.md
engine methods (jj wrapper)             → api.map.md
environment variables / config keys     → config.map.md
test patterns / mock helpers            → test.map.md
build commands / scrml compile steps    → build.map.md
directory layout / entry points         → structure.map.md
external packages / internal graph      → dependencies.map.md
error codes / handling patterns         → error.map.md
scrml lib modules (src/lib/)            → structure.map.md + dependencies.map.md

## Task-Shape Routing (agents — read this section first)

**Bug fix in a CLI command (save/switch/merge/undo/history/status/describe/sync/check):**
1. api.map.md — find the command's file and arg contract
2. schema.map.md — understand the engine result shapes the command consumes
3. error.map.md — check relevant error codes and handling patterns
4. test.map.md — find the test file covering that command

**Bug fix in the landing gate (giti land / giti check):**
1. api.map.md — land and check command contracts
2. error.map.md — GIT-004, GIT-005, GIT-006 gate error codes
3. config.map.md — SCRML_PATH / SCRMLTS_PATH resolution order
4. test.map.md — tests/land.test.js, tests/check.test.js

**Bug fix or feature in the HTTP server (giti serve / API endpoints):**
1. api.map.md — HTTP endpoint table
2. build.map.md — serve startup sequence, compile-ui flow
3. schema.map.md — compileUi result shape, loadScrmlHandlers pattern
4. test.map.md — tests/server.test.js, tests/compile-ui.test.js

**scrml lib module work (src/lib/*.scrml recompile or new module):**
1. structure.map.md — complete list of src/lib scrml modules
2. build.map.md — scrml compile command (`bun run ../scrml/compiler/src/cli.js compile ...`)
3. dependencies.map.md — internal module graph to check import chains
4. config.map.md — SCRML_PATH env var for compiler resolution

**Private-path scope work (giti private / giti sync scope safety):**
1. api.map.md — private and sync command surfaces
2. schema.map.md — classifyFromStatus, Remote config, partitionByScope shapes
3. error.map.md — private-path blocking errors
4. test.map.md — tests/private.test.js, tests/sync-push.test.js, tests/auto-split.test.js

**Web UI page work (ui/*.scrml):**
1. structure.map.md — UI page list and repros/ distinction
2. build.map.md — serve startup sequence; compile command
3. api.map.md — HTTP static serving and /_scrml_ws/ channel routes
4. config.map.md — SCRML_PATH for compiler, GITI_SERVER_LOG for debugging

**New CLI command:**
1. structure.map.md — confirm command slot in src/commands/
2. api.map.md — existing command table for pattern
3. dependencies.map.md — internal module graph to plan imports
4. test.map.md — test file pattern to match

**Don't know which** (e.g., open-ended task brief from user):
1. Read `primary.map.md` (this file) in full
2. Read the **Task-Shape Routing** section above and self-classify
3. If the classification is genuinely unclear, surface to PA before consuming further context

## Use feedback loop

When this map's content was load-bearing for a dispatch outcome, the agent's final report should
note **"map content consulted: [list of map files]; load-bearing finding: [one sentence]"**. When
the map content was NOT useful, report **"maps consulted but not load-bearing"** so PA can
diagnose whether the wrong maps were named in the brief OR the map content is at the wrong
granularity (PA-side fix). 3-5 consecutive "not load-bearing" reports on the same task shape
trigger a map-design review.

## Key Facts
- Entry point: src/cli.js — 15 commands dispatched from a plain process.argv switch; no framework
- Engine: JjCliEngine in src/engine/jj-cli.js wraps jj CLI subprocess; all ops return { ok, data|error }
- Compiler dependency: scrml at ../scrml/ (renamed from scrmlTS ~2026-06); resolved via $SCRML_PATH env or sibling path; legacy $SCRMLTS_PATH / ../scrmlTS honored as fallback
- scrml dogfood: 17 src/lib/*.scrml modules compiled to .js siblings (library mode); 6 ui/*.scrml pages compiled to ui/dist/ by `giti serve`
- HTTP server: Bun.serve on 127.0.0.1 (hardcoded); read-only by default; write endpoints gated on localDev flag; scrml-generated WinterCG handlers run first (first-match wins)
- Private-path model: .giti/private manifest of glob patterns; save/sync/land all enforce public/private separation (spec §12)
- Test injection: JjCliEngine accepts a `spawn` option; commands expose setRunners() for compiler/test mocking; ~375 tests, 0 external deps

## Tags
#giti #map #primary #cli #bun #javascript #jj #scrml

## Links
- [structure.map.md](./structure.map.md)
- [dependencies.map.md](./dependencies.map.md)
- [schema.map.md](./schema.map.md)
- [config.map.md](./config.map.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
- [test.map.md](./test.map.md)
- [api.map.md](./api.map.md)
- [non-compliance.report.md](./non-compliance.report.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
