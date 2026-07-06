# primary.map.md
# project: giti
# updated: 2026-07-06T10:16:06-06:00  commit: ccad5ba

## Project Fingerprint
Language:   JavaScript (ES modules, no TypeScript)
Framework:  Bun (Bun.serve HTTP, Bun.spawn subprocess, bun:test)
Runtime:    Bun; jj 0.40+ in PATH; scrml compiler at ../scrml/ (for land/check/serve) — HEAD 59dc5287
            (s241, language v0.7.1) as of this refresh; re-verify HEAD at each compile, it moves fast
Type:       CLI tool + HTTP server + scrml-dogfood project (+ a standalone AST-merge research prototype)
Size:       ~80 hand-authored source files (46 .js under src/), 24 core .scrml (17 lib + 7 UI pages),
            33 compiler-bug repros, ~375 tests across 14 test files + 3 manual harnesses

## Map Index
| Map                  | Status  | Contents                                                         |
|----------------------|---------|------------------------------------------------------------------|
| structure.map.md     | present | directory layout, 15 CLI commands, 7 UI pages, 33 repros, scrml module list, docs/ast-merge/ |
| dependencies.map.md  | present | 0 declared packages; Bun builtins + jj + scrml compiler deps     |
| schema.map.md        | present | 8 domain shapes; JSDoc typedefs; engine result pattern           |
| config.map.md        | present | 4 env vars (GITI_LOCAL_DEV, GITI_SERVER_LOG, SCRML_PATH, SCRMLTS_PATH) |
| build.map.md         | present | dev/test commands; scrml compile step; serve startup sequence    |
| error.map.md         | present | 15 friendly error codes; gate error codes; result-object pattern |
| test.map.md          | present | bun:test, 375/0 tests, 14 test files, 3 manual harnesses (browser-paint now portable) |
| api.map.md           | present | 15 CLI commands + 10 HTTP endpoints + 19 engine methods          |
| state.map.md         | absent  | no state management library                                      |
| events.map.md        | absent  | no event bus (scrml §38 channel WebSocket handled inline in server) |
| auth.map.md          | absent  | no auth (remote auth delegated to jj/git; HTTP server 127.0.0.1 only) |
| domain.map.md        | absent  | no domain/ dir; domain concepts captured in schema.map.md        |
| style.map.md         | absent  | UI uses per-page scrml-compiled CSS + shared ui/theme.css (now incl. .mono utility) |
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
manual harnesses (channel/sse/browser)  → test.map.md
build commands / scrml compile steps    → build.map.md
directory layout / entry points         → structure.map.md
external packages / internal graph      → dependencies.map.md
error codes / handling patterns         → error.map.md
scrml lib modules (src/lib/)            → structure.map.md + dependencies.map.md
UI page Phase enums / idioms            → structure.map.md
AST-merge research prototype            → structure.map.md (docs/ast-merge/); non-compliance.report.md for the two design-note docs

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
1. structure.map.md — UI page table (Phase enum, server fns, notes per page) + repros/ distinction +
   the §4.17 raw-content (`<code>`/`<pre>`) interpolation rule
2. build.map.md — serve startup sequence; compile command
3. api.map.md — HTTP static serving and /_scrml_ws/ channel routes; SSE /_scrml/__ri_route_* routes
4. config.map.md — SCRML_PATH for compiler, GITI_SERVER_LOG for debugging
All 7 pages use the typed Phase:enum + <match for=Phase> idiom introduced in S15. Interpolated values
never go inside `<code>`/`<pre>` (raw-content, ships `${...}` verbatim) — use `<span class="mono">` /
a plain block element instead (S17 fix, ui/theme.css `.mono`).

**Compiler bug reproducer work (ui/repros/):**
1. structure.map.md — full repro list with short descriptions (repro-01..33)
2. test.map.md — sse-runtime.mjs and browser-paint.mjs for runtime verification
These files are NOT compiled by `giti serve`; run the compiler directly against them.

**AST semantic-merge research / prototype work (docs/ast-merge/):**
1. structure.map.md — docs/ast-merge/ table (shared note, compiler ask, prototype/ files)
2. non-compliance.report.md — compliance status of the two design-note .md files (uncertain, needs
   human review on canonical-home / ask-retention policy) — the prototype code itself is unaffected
3. giti-spec-v1.md §4.3 (v2 AST semantic merge) / §4.4 (v3 compiler type-diff) — the spec sections this
   thread targets
Prototype is real, runnable code (`bun docs/ast-merge/prototype/merge-driver.mjs ...`); gate = the
merged output must compile via the scrml CLI directly (not `bun test`, not `giti land`).

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
- Engine: JjCliEngine in src/engine/jj-cli.js wraps jj CLI subprocess; all ops return { ok, data|error }; 19 methods total including diff() + diffChange()
- Compiler dependency: scrml at ../scrml/ (renamed from scrmlTS ~2026-06); resolved via $SCRML_PATH env or sibling path; legacy $SCRMLTS_PATH / ../scrmlTS honored as fallback. As of this refresh, ../scrml is at commit 59dc5287 (session s241, language v0.7.1) — re-verify HEAD before relying on a specific compiler behavior, it moves fast.
- scrml dogfood: 17 src/lib/*.scrml modules compiled to .js siblings (library mode); 7 ui/*.scrml pages compiled to ui/dist/ by `giti serve`; 33 ui/repros/ compiler-bug reproducers (skipped by serve)
- Web UI idiom (S15, refined S17): all 7 pages use typed Phase:enum state + `<match for=Phase on=@cell>` + `<each>`/`<empty>`; server functions return enum variants off the engine Result tuple; loads trigger via `on mount {}`. S17 §4.17 fix: `<code>`/`<pre>` are raw-content (ship `${...}` verbatim) — interpolated values now use `<span class="mono">` (new ui/theme.css utility) or a plain block element instead.
- HTTP server: Bun.serve on 127.0.0.1 (hardcoded); read-only by default; write endpoints gated on localDev flag; scrml-generated WinterCG handlers run first (first-match wins); SSE routes under /_scrml/__ri_route_*
- Private-path model: .giti/private manifest of glob patterns; save/sync/land all enforce public/private separation (spec §12)
- Test injection: JjCliEngine accepts a `spawn` option; commands expose setRunners() for compiler/test mocking; 375/0 tests confirmed 2026-07-06 (791 expect() calls), 0 external deps; 3 manual harnesses in tests/manual/ (channel-runtime, sse-runtime, browser-paint) are NOT run by `bun test`. browser-paint.mjs is now portable (resolves playwright/chromium from $HOME) and gives `land` a 45s nav budget (its on-mount preflight runs the real compile+test gate).
- Compiler bug reproducers: 33 files in ui/repros/ (repro-01..33 + repro-06-helper.js). repro-32 (GITI-033, each-in-ternary-markup) has since landed upstream; repro-33 (GITI-035, SSE-generator-binding null-clobber) is open and is why feed.scrml is the one UI page of 7 not yet rendering.
- NEW (S17): docs/ast-merge/ — a joint giti+flogence research/prototype thread for giti-spec §4.3 (AST semantic merge). `prototype/merge-driver.mjs` is real, gate-verified working code (proves the consumer-path first slice). The two narrative docs (shared note + compiler ask) are flagged UNCERTAIN in non-compliance.report.md pending a canonical-home / ask-retention policy decision, mirroring the existing docs/deep-dives/ carve-out.
- NEW (S17): flobase PA config — `.pa-base/profile` (boot manifest) + `.claude/CLAUDE.md` (fenced flobase region, excluded from the doc-compliance scan by the mapper's own `.claude/` exclusion rule). Authority still defers to `pa.md`.

## Tags
#giti #map #primary #cli #bun #javascript #jj #scrml #ast-merge

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
