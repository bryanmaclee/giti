# primary.map.md
# project: giti
# updated: 2026-07-18T11:12:13-06:00  commit: 64883a8

## Project Fingerprint
Language:   JavaScript (ES modules, no TypeScript)
Framework:  Bun (Bun.serve HTTP, Bun.spawn subprocess, bun:test)
Runtime:    Bun; jj 0.40+ in PATH; scrml compiler at ../scrml/ (for land/check/serve). giti's S18 scrml
            sources were cross-verified against scrml @7d5fda26 (await promoted to hard error
            E-AWAIT-NOT-IN-SCRML, §19.9.8; compiler auto-awaits safeCallAsync in server-fn context).
            S19: sibling ../scrml churned ~6x this session (7d5fda26 -> 780e4342 -> 01160fb8 ->
            c82550dd -> 99ae45ca -> 1e63bbb1) — conformance-freeze churn (fn-purity §48, async/await
            ban, structural-eq, route-inference). Currently at 1e63bbb1 — re-verify HEAD at each
            compile, it moves fast.
Type:       CLI tool + HTTP server + scrml-dogfood project (+ a standalone AST-merge research prototype)
Size:       ~81 hand-authored source files (46 .js under src/ + 4 hand-written scrml:* shims in
            src/lib/_scrml/ incl. host.js), 24 core .scrml (17 lib + 7 UI pages), 34 compiler-bug repros,
            ~375 tests (791 expect calls) across 14 test files + 3 manual harnesses

## Map Index
| Map                  | Status  | Contents                                                         |
|----------------------|---------|--------------------------------------------------------------------|
| structure.map.md     | present | directory layout, 15 CLI commands, 7 UI pages (safeCallAsync idiom), 34 repros, scrml module list (fn-idiom), docs/ast-merge/ (4 slices) |
| dependencies.map.md  | present | 0 declared packages; Bun builtins + jj + scrml compiler deps     |
| schema.map.md        | present | 8 domain shapes; JSDoc typedefs; engine result pattern           |
| config.map.md        | present | 4 env vars (GITI_LOCAL_DEV, GITI_SERVER_LOG, SCRML_PATH, SCRMLTS_PATH) |
| build.map.md         | present | dev/test commands; scrml compile step; serve startup sequence    |
| error.map.md         | present | 15 friendly error codes; gate error codes; result-object pattern |
| test.map.md          | present | bun:test, 375/0 tests, 14 test files, 3 manual harnesses (browser-paint SSE-aware, true 7/7 in one run) |
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
AST-merge research prototype            → structure.map.md (docs/ast-merge/, 4 slices); non-compliance.report.md for the narrative .md docs

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
1. structure.map.md — complete list of src/lib scrml modules; the S19 fn-promotion idiom (pure fns use
   `fn`, I/O fns stay `function`); the src/lib/_scrml/host.js shim (safeCall); GITI-037 caveat (plain
   library fns still have no async idiom — ANSWERED + BANKED upstream S19, not yet built; safeCallAsync
   only auto-awaits in server fns; interim = server-fn wrapper, foreign-code block, or keep committed .js)
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
(raw-content) — use `<span class="mono">` / a plain block element instead. For UI-render verification use
tests/manual/browser-paint.mjs (server-200 ≠ renders); SSE pages settle on `domcontentloaded`, not
`networkidle` (S19 fix — an open EventSource never lets networkidle fire).

**Compiler bug reproducer work (ui/repros/):**
1. structure.map.md — full repro list with short descriptions (repro-01..34)
2. test.map.md — sse-runtime.mjs and browser-paint.mjs for runtime verification
These files are NOT compiled by `giti serve`; run the compiler directly against them.

**AST semantic-merge research / prototype work (docs/ast-merge/):**
1. structure.map.md — docs/ast-merge/ table: shared note, compiler ask (#6 SHIPPED, #6b `scrml semdiff`
   SHIPPED PR #91), and the FOUR built slices — slice 1 (struct field-add), slice 2 (enum variant-add, on
   shipped member-emission, + boundary/ fixtures), slice 3 (multi-entity same-file merge), slice 4 (NEW
   S19: disjoint-glue merge gated by `scrml semdiff base M --json` on `diagnostics.added` — closes the
   S18-measured `#6b` boundary from the merge side)
2. non-compliance.report.md — compliance status of the narrative .md files (UNCERTAIN, canonical-home
   decision pending) — the prototype code itself is COMPLIANT (docs-for-working-code); slice 4's driver
   was re-executed live during this scan and its exit-code claims (1 = accept-with-review, 2 = semantic
   conflict) verified byte-for-byte
3. giti-spec-v1.md §4.3 (v2 AST semantic merge) / §4.4 (v3 compiler type-diff) — the spec sections this
   thread targets; slice 4 is the working v3 implementation (structural merge + compiler-validated gate)
Prototypes are real, runnable code (`bun docs/ast-merge/prototype/.../merge-driver*.mjs ...`); gate = the
merged output must compile via the scrml CLI directly (slices 1-3) or additionally pass `scrml semdiff
base M --json` with empty `diagnostics.added` (slice 4) — not `bun test`, not `giti land`.
Productization (wiring into `giti merge`/`giti resolve`) is DEFERRED — gated on the subprocess primitive
(scrml can't be spawned from scrml source yet); a JS-side wire-in crosses the dogfood goal and is a
design fork the user has twice deferred.

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
- Compiler dependency: scrml at ../scrml/ (renamed from scrmlTS ~2026-06); resolved via $SCRML_PATH env or sibling path; legacy $SCRMLTS_PATH / ../scrmlTS honored as fallback. S19: sibling churned 6x this session (7d5fda26 -> ... -> 1e63bbb1) — re-verify HEAD before relying on a specific compiler behavior, it moves fast.
- scrml dogfood: 17 src/lib/*.scrml modules compiled to .js siblings (library mode) — 21 pure fns across 12 modules now use the enforced-pure `fn` form (S19 idiom sweep; source-only, .js byte-identical); 7 ui/*.scrml pages compiled to ui/dist/ by `giti serve`; 34 ui/repros/ compiler-bug reproducers (skipped by serve)
- Web UI idiom (S15 + S17 + S18): all 7 pages use typed Phase:enum state + `<match for=Phase on=@cell>` + `<each>`/`<empty>`; loads trigger via `on mount {}`. **S18 server-fn idiom (NEW CANONICAL):** every server fn's engine call is `safeCallAsync(() => engine.X()) !{ | ::Thrown(msg) :> ({ok:false, error:msg}) }` — scrml @7d5fda26 promoted source-level `await` to a HARD error (`E-AWAIT-NOT-IN-SCRML`, §19.9.8) and the compiler AUTO-AWAITS `safeCallAsync` in server-fn context. No ui/*.scrml has `await` (grep-verified). S17 §4.17: `<code>`/`<pre>` are raw-content → interpolated values use `<span class="mono">` / a plain block.
- Values-not-exceptions (S18): giti's `.scrml` sources are now ENTIRELY try/catch-free. src/lib/remotes.scrml migrated try/catch → `safeCall(() => …) !{ | ::Thrown :> not }`. The one place a JS-host throw is caught is the hand-written `scrml:host` shim src/lib/_scrml/host.js (safeCall / safeCallAsync / HostError), copied to `<outputDir>/_scrml/host.js` by the compiler's stdlib bundler.
- HTTP server: Bun.serve on 127.0.0.1 (hardcoded); read-only by default; write endpoints gated on localDev flag; scrml-generated WinterCG handlers run first (first-match wins); SSE routes under /_scrml/__ri_route_*
- Private-path model: .giti/private manifest of glob patterns; save/sync/land all enforce public/private separation (spec §12)
- Test injection: JjCliEngine accepts a `spawn` option; commands expose setRunners() for compiler/test mocking; 375/0 tests, 14 files, 791 expect() calls (unchanged through S19 — the fn-promotion sweep touched only .scrml sources + byte-identical compiled siblings). 3 manual harnesses in tests/manual/ are NOT run by `bun test`. browser-paint.mjs is portable and now paints **7/7 pages in a single main-harness run** (S19: SSE-aware `domcontentloaded` settle for feed fixed a spurious 6/7+timeout).
- AST-merge research (docs/ast-merge/): joint giti+flogence thread for giti-spec §4.3/§4.4. Compiler oracle-ask #6 (member emission + tight bodySpan) SHIPPED; ask #6b (`scrml semdiff`) SHIPPED S19 (`780e4342`, PR #91). FOUR built, gate-verified prototype slices: slice 1 (struct field-add), slice 2 (enum variant-add), slice 3 (multi-entity same-file merge), slice 4 (NEW S19: disjoint-glue merge + `scrml semdiff` validation gate — closes the S18-measured `#6b` boundary from the merge side). The narrative .md files are flagged UNCERTAIN in non-compliance.report.md pending a canonical-home decision, mirroring the docs/deep-dives/ carve-out; the underlying code is COMPLIANT and re-verified (executed) this scan.

## GITI bug ledger — current deltas (S19)
- GITI-036 CLOSED — structural-eq treeshake VERIFIED FIXED @ scrml `01160fb8` (fix `4d0220c7`, PR #59); runtime bundle now defines `_scrml_structural_eq` (0->1); zero structural-eq/ReferenceError console errors on status browser-paint. No giti source change — idiomatic source retained through the bug.
- GITI-016 CLEARED — `match` identifier workaround REMOVED; `friendly-error.scrml` restored `m`->`match`, recompiles clean; 375/0. A 100%-scrml roadmap blocker cleared.
- GITI-037 OPEN, ANSWERED + BANKED upstream (not yet built) — scrml ruled (S19): colorless async via compiler-inferred, typed-and-surfaced async is the real fix (~80% already built; Phase-1 seed-holes not yet dispatched); silent Promise-leak persists until Phase 1 lands. Interim: `server-helpers.scrml` + `save-routing-async.scrml` stay on committed `.js` / `function` / `async function` (promote to `fn` for free once Phase 1 lands). Watch for scrml's "Phase 1 landed" ping.
- E-ROUTE-001 NEW, P3 FYI (filed S19) — route-inference warning over-fires on numeric regex-capture array access (`m[1]`/`m[2]`) in object-literal-value position, inside a pure route-less lib fn (parse-status.scrml::parseStatus). Non-blocking (warning only, correct emit). Repro: ui/repros/repro-34-e-route-001-computed-capture-in-object-literal.scrml. Filed to scrml's inbox; disposition is their call.
- Still OPEN (unchanged): GITI-006 (cosmetic `${@var.path}` pre-init — untested, low-pri; giti no longer triggers it).
- Still BLOCKED (compiler, not bugs — 100%-scrml roadmap): DF-8 (cross-scrml `.scrml` import rewrite in lib mode); subprocess primitive (absent from `scrml:process` — jj wrapper stays JS, AND the AST-merge production driver can't spawn `scrml semdiff` yet).

## Tags
#giti #map #primary #cli #bun #javascript #jj #scrml #ast-merge #safecall #semdiff #fn-promotion

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
