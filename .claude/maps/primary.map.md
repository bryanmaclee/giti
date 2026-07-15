# primary.map.md
# project: giti
# updated: 2026-07-15T16:04:15-06:00  commit: 513ef41

## Project Fingerprint
Language:   JavaScript (ES modules, no TypeScript)
Framework:  Bun (Bun.serve HTTP, Bun.spawn subprocess, bun:test)
Runtime:    Bun; jj 0.40+ in PATH; scrml compiler at ../scrml/ (for land/check/serve). giti's S18 scrml
            sources were cross-verified against scrml @7d5fda26 (await promoted to hard error
            E-AWAIT-NOT-IN-SCRML, §19.9.8; compiler auto-awaits safeCallAsync in server-fn context).
            Sibling ../scrml now at 211dc076 — re-verify HEAD at each compile, it moves fast.
Type:       CLI tool + HTTP server + scrml-dogfood project (+ a standalone AST-merge research prototype)
Size:       ~80 hand-authored source files (46 .js under src/ + 4 hand-written scrml:* shims in
            src/lib/_scrml/ incl. host.js), 24 core .scrml (17 lib + 7 UI pages), 33 compiler-bug repros,
            ~375 tests across 14 test files + 3 manual harnesses

## Map Index
| Map                  | Status  | Contents                                                         |
|----------------------|---------|------------------------------------------------------------------|
| structure.map.md     | present | directory layout, 15 CLI commands, 7 UI pages (safeCallAsync idiom), 33 repros, scrml module list, docs/ast-merge/ (3 slices) |
| dependencies.map.md  | present | 0 declared packages; Bun builtins + jj + scrml compiler deps     |
| schema.map.md        | present | 8 domain shapes; JSDoc typedefs; engine result pattern           |
| config.map.md        | present | 4 env vars (GITI_LOCAL_DEV, GITI_SERVER_LOG, SCRML_PATH, SCRMLTS_PATH) |
| build.map.md         | present | dev/test commands; scrml compile step; serve startup sequence    |
| error.map.md         | present | 15 friendly error codes; gate error codes; result-object pattern |
| test.map.md          | present | bun:test, 375/0 tests, 14 test files, 3 manual harnesses (browser-paint now 7/7) |
| api.map.md           | present | 15 CLI commands + 10 HTTP endpoints + 19 engine methods; S18 server-fn idiom |
| state.map.md         | absent  | no state management library                                      |
| events.map.md        | absent  | no event bus (scrml §38 channel WebSocket handled inline in server) |
| auth.map.md          | absent  | no auth (remote auth delegated to jj/git; HTTP server 127.0.0.1 only) |
| domain.map.md        | absent  | no domain/ dir; domain concepts captured in schema.map.md        |
| style.map.md         | absent  | UI uses per-page scrml-compiled CSS + shared ui/theme.css (incl. .mono utility) |
| i18n.map.md          | absent  | no i18n                                                          |
| infra.map.md         | absent  | no Docker, no CI/CD, no cloud resources                          |
| migrations.map.md    | absent  | no database                                                      |
| jobs.map.md          | absent  | no background jobs                                               |

## File Routing
types / interfaces / domain shapes      → schema.map.md
CLI commands / HTTP endpoints           → api.map.md
engine methods (jj wrapper)             → api.map.md
scrml UI server-fn idiom (safeCallAsync)→ api.map.md + structure.map.md
environment variables / config keys     → config.map.md
test patterns / mock helpers            → test.map.md
manual harnesses (channel/sse/browser)  → test.map.md
build commands / scrml compile steps    → build.map.md
directory layout / entry points         → structure.map.md
external packages / internal graph      → dependencies.map.md
error codes / handling patterns         → error.map.md
scrml lib modules (src/lib/)            → structure.map.md + dependencies.map.md
scrml:host shim (safeCall/safeCallAsync)→ structure.map.md (src/lib/_scrml/host.js)
UI page Phase enums / idioms            → structure.map.md
AST-merge research prototype            → structure.map.md (docs/ast-merge/, 3 slices); non-compliance.report.md for the narrative .md docs

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
1. api.map.md — HTTP endpoint table + the S18 server-fn idiom section
2. build.map.md — serve startup sequence, compile-ui flow
3. schema.map.md — compileUi result shape, loadScrmlHandlers pattern
4. test.map.md — tests/server.test.js, tests/compile-ui.test.js

**scrml lib module work (src/lib/*.scrml recompile or new module):**
1. structure.map.md — complete list of src/lib scrml modules; the src/lib/_scrml/host.js shim (safeCall);
   GITI-037 caveat (plain library fns have no async idiom — safeCallAsync only auto-awaits in server fns)
2. build.map.md — scrml compile command (`bun run ../scrml/compiler/src/cli.js compile ...`)
3. dependencies.map.md — internal module graph to check import chains
4. config.map.md — SCRML_PATH env var for compiler resolution

**Private-path scope work (giti private / giti sync scope safety):**
1. api.map.md — private and sync command surfaces
2. schema.map.md — classifyFromStatus, Remote config, partitionByScope shapes
3. error.map.md — private-path blocking errors
4. test.map.md — tests/private.test.js, tests/sync-push.test.js, tests/auto-split.test.js

**Web UI page work (ui/*.scrml):**
1. structure.map.md — UI page table (Phase enum, server fns, notes per page) + the S18 safeCallAsync
   server-fn idiom + the §4.17 raw-content (`<code>`/`<pre>`) interpolation rule + repros/ distinction
2. build.map.md — serve startup sequence; compile command
3. api.map.md — HTTP static serving, /_scrml_ws/ channel routes, SSE routes, S18 server-fn idiom
4. config.map.md — SCRML_PATH for compiler, GITI_SERVER_LOG for debugging
All 7 pages use the typed Phase:enum + `<match for=Phase>` idiom (S15) AND the S18 server-fn shape:
`safeCallAsync(() => engine.X()) !{ | ::Thrown(msg) :> ({ok:false, error:msg}) }`. Source-level `await`
is a HARD compile error now; do NOT reintroduce it. Interpolated values never go inside `<code>`/`<pre>`
(raw-content) — use `<span class="mono">` / a plain block element instead.

**Compiler bug reproducer work (ui/repros/):**
1. structure.map.md — full repro list with short descriptions (repro-01..33)
2. test.map.md — sse-runtime.mjs and browser-paint.mjs for runtime verification
These files are NOT compiled by `giti serve`; run the compiler directly against them.

**AST semantic-merge research / prototype work (docs/ast-merge/):**
1. structure.map.md — docs/ast-merge/ table: shared note, compiler ask (#6 SHIPPED), and the THREE
   built slices — slice 1 (struct field-add), slice 2 (enum variant-add, on shipped member-emission,
   + boundary/ fixtures), slice 3 (multi-entity same-file merge)
2. non-compliance.report.md — compliance status of the narrative .md files (UNCERTAIN, canonical-home
   decision pending) — the prototype code itself is COMPLIANT (docs-for-working-code)
3. giti-spec-v1.md §4.3 (v2 AST semantic merge) / §4.4 (v3 compiler type-diff) — the spec sections this
   thread targets; the slice-2 write-up locates the measured `#6b` boundary (where member-emission stops
   being sound and needs compiler classification)
Prototypes are real, runnable code (`bun docs/ast-merge/prototype/.../merge-driver*.mjs ...`); gate = the
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
- Compiler dependency: scrml at ../scrml/ (renamed from scrmlTS ~2026-06); resolved via $SCRML_PATH env or sibling path; legacy $SCRMLTS_PATH / ../scrmlTS honored as fallback. S18 sources cross-verified against scrml @7d5fda26; sibling now at 211dc076 — re-verify HEAD before relying on a specific compiler behavior, it moves fast.
- scrml dogfood: 17 src/lib/*.scrml modules compiled to .js siblings (library mode); 7 ui/*.scrml pages compiled to ui/dist/ by `giti serve`; 33 ui/repros/ compiler-bug reproducers (skipped by serve)
- Web UI idiom (S15 + S17 + S18): all 7 pages use typed Phase:enum state + `<match for=Phase on=@cell>` + `<each>`/`<empty>`; loads trigger via `on mount {}`. **S18 server-fn idiom (NEW CANONICAL):** every server fn's engine call is `safeCallAsync(() => engine.X()) !{ | ::Thrown(msg) :> ({ok:false, error:msg}) }` — scrml @7d5fda26 promoted source-level `await` to a HARD error (`E-AWAIT-NOT-IN-SCRML`, §19.9.8) and the compiler AUTO-AWAITS `safeCallAsync` in server-fn context. No ui/*.scrml has `await` (grep-verified). S17 §4.17: `<code>`/`<pre>` are raw-content → interpolated values use `<span class="mono">` / a plain block.
- Values-not-exceptions (S18): giti's `.scrml` sources are now ENTIRELY try/catch-free. src/lib/remotes.scrml migrated try/catch → `safeCall(() => …) !{ | ::Thrown :> not }`. The one place a JS-host throw is caught is the hand-written `scrml:host` shim src/lib/_scrml/host.js (safeCall / safeCallAsync / HostError), copied to `<outputDir>/_scrml/host.js` by the compiler's stdlib bundler.
- HTTP server: Bun.serve on 127.0.0.1 (hardcoded); read-only by default; write endpoints gated on localDev flag; scrml-generated WinterCG handlers run first (first-match wins); SSE routes under /_scrml/__ri_route_*
- Private-path model: .giti/private manifest of glob patterns; save/sync/land all enforce public/private separation (spec §12)
- Test injection: JjCliEngine accepts a `spawn` option; commands expose setRunners() for compiler/test mocking; 375/0 tests, 14 files (unchanged through S18 — migration touched only .scrml sources + compiled siblings). 3 manual harnesses in tests/manual/ are NOT run by `bun test`. browser-paint.mjs is portable and now paints **7/7 pages** (feed renders live SSE; GITI-035 closed).
- AST-merge research (docs/ast-merge/): joint giti+flogence thread for giti-spec §4.3. Compiler oracle-ask #6 (member emission + tight bodySpan) SHIPPED. THREE built, gate-verified prototype slices: slice 1 (struct field-add), slice 2 (enum variant-add, re-parse layer dropped, + boundary/ fixtures), slice 3 (multi-entity same-file merge). The narrative .md files are flagged UNCERTAIN in non-compliance.report.md pending a canonical-home decision, mirroring the docs/deep-dives/ carve-out.

## GITI bug ledger — current deltas (S18)
- GITI-035 CLOSED — feed SSE seed null-clobber fixed upstream; feed.scrml renders live → 7/7 browser-paint.
- GITI-016 FIXED — `match` as a variable name no longer trips E-SCOPE-001; the `match`→`m` workaround is removable.
- GITI-036 NEW, OPEN — status page's `==` lowers to a `_scrml_structural_eq` helper that gets tree-shaken OUT of the client runtime bundle (equality helper missing at runtime).
- GITI-037 NEW, OPEN — no async idiom for plain (non-server) library functions: `async` is banned in scrml source AND plain fns don't auto-await `safeCallAsync` (only server-fn context does).

## Tags
#giti #map #primary #cli #bun #javascript #jj #scrml #ast-merge #safecall

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
