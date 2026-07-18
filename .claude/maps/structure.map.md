# structure.map.md
# project: giti
# updated: 2026-07-18T11:12:13-06:00  commit: 64883a8

## Entry Points
src/cli.js — CLI binary entry; registers all 15 commands, dispatches to command handlers, prints help/version

## Directory Ownership
src/                — all source code (CLI entry, commands, engine, lib, server, private helpers)
src/commands/       — one file per CLI command (15 commands); each exports a named function
src/engine/         — VCS engine abstraction: interface contract, JjCliEngine (jj subprocess), factory
src/lib/            — shared logic modules; each has a `.scrml` source file and a compiled `.js` sibling
src/lib/_scrml/     — hand-written scrml stdlib shims: fs.js, path.js, process.js, host.js (serve scrml:* imports). host.js NEW (S18): the `scrml:host` shim exporting safeCall / safeCallAsync / HostError — the JS-host-throw containment primitives; the try/catch lives HERE and nowhere else, so scrml source is throw-free (§19 values-not-exceptions)
src/lib/dist/       — stale intermediate artifacts from src/lib scrml pages (generated; superceded by ui/dist/)
src/private/        — private-path scope helpers; thin re-export shims over src/lib counterparts
src/server/         — Bun HTTP server, compile-ui orchestration, WinterCG/channel handler wiring
tests/              — Bun test suite (~375 tests across 14 .test.js files + 3 manual scripts)
tests/manual/       — manual harnesses: channel-runtime.mjs (§38 WS), sse-runtime.mjs (§37 SSE), browser-paint.mjs (headless Chromium; portable + land nav-budget; SSE-aware settle path NEW S19; 7/7 in one run, see below)
ui/                 — scrml Web UI source: 7 production `.scrml` pages + theme.css
ui/repros/          — compiler bug reproducer `.scrml` files (34 files; skipped by `giti serve`)
ui/dist/            — compiled output from ui/*.scrml (generated; skipped by mapper)
docs/deep-dives/    — historical design deep-dives (6 .md files; belong in scrml-support)
docs/spec-types/    — illustrative scrml domain shapes in .scrml (reference only, not compiled)
docs/ast-merge/     — §4.3/§4.4 AST semantic-merge research thread — shared design note + compiler ask
                      (giti+flogence, to scrml) + a BUILT, gate-verified `prototype/` with FOUR slices
                      (struct field-add, enum variant-add, multi-entity, compiler-validated semdiff-gated
                      merge — NEW S19). See non-compliance.report.md for compliance assessment of the
                      narrative .md files; `prototype/` is real, running, gate-verified code.
.pa-base/           — flobase boot manifest (`profile`) — points at pa.md, does not replace it

## docs/ast-merge/ (research/prototype thread — S17 slice 1, S18 slices 2 & 3, S19 slice 4)
| Path                                       | What it is                                                                 |
|--------------------------------------------|-----------------------------------------------------------------------------|
| v0-approach-d-shared-note.md               | giti+flogence shared design note for §4.3 AST semantic merge (joint compiler-interface Q&A) |
| compiler-ask-v0.md                         | Co-signed ask to scrml: additive extensions to `--emit-block-analysis` (field-level member emission + tight bodySpan) — since SHIPPED as oracle-ask #6 |
| slice2-enum-merge-and-measured-boundary.md | Write-up of slice 2 (enum) + slice 3 (multi) + the measured `#6b` boundary (where consumer-side member-emission stops being sound and needs compiler classification) — giti's grounding for the flogence #6b co-sign |
| slice4-semdiff-v3-validation.md            | NEW (S19): write-up of slice 4 — the §4.4-v3 compiler-validated merge layer. Structural merge is LOOSENED to accept disjoint glue edits, gated by the landed `#6b` primitive (`scrml semdiff base M --json`, keyed on `diagnostics.added`). Measured: strictly dominates both git diff3 (ships the break silently) and slice 3 (blunt refusal of a safe merge). CLOSES the S18-measured boundary from the merge side. |
| prototype/README.md                        | Slice 1: run the struct field-add driver + the two empirical findings that became the compiler ask |
| prototype/merge-driver.mjs                 | Slice 1: 3-way merges a `.scrml` state-type field-add off `--emit-block-analysis` spans; gate = merged file must compile |
| prototype/slice/{base,sideA,sideB}.scrml   | Slice-1 fixture: base `AppState{count,name}`; sideA adds `theme`; sideB adds `locale` — git-conflicts, driver merges clean |
| prototype/slice2-enum/merge-driver-enum.mjs| Slice 2: enum variant-add merge; consumes shipped `members[]` directly (re-parse layer DROPPED); splices each added variant verbatim by span; keyed on `{name, typeText}` |
| prototype/slice2-enum/{base,sideA,sideB}.scrml + sideA/B-collide.scrml | Slice-2 fixture: base `Ref:enum{Sha,None}`; disjoint variant-adds merge clean; collide fixtures (both add `Tag`, different arg-tuple) → correct CONFLICT via `typeText` |
| prototype/slice2-enum/boundary/{base2,rename-clean,rename-dangling}.scrml | The measured #6b boundary fixtures — where a rename is/isn't distinguishable from add+remove on member-emission alone. Re-used directly by slice 4 (§1 of its write-up) to verify `scrml semdiff` separates them. |
| prototype/slice3-multi/merge-driver-multi.mjs | Slice 3: multi-entity same-file merge; disjoint entities (A→struct field, B→enum variant) that git text-conflicts on adjacent lines; whole-entity splice, same-entity-both-sides recurses into member-merge |
| prototype/slice3-multi/{base,sideA,sideB}.scrml | Slice-3 fixture: multi-entity fixture |
| prototype/slice4-semdiff/merge-driver-semdiff.mjs | NEW (S19): slice-3 entity logic + a per-segment glue merge (disjoint glue segments combine) + the validation gate — writes candidate `M`, shells to `scrml semdiff base M --json`, `diagnostics.added` non-empty → SEMANTIC CONFLICT. Exit codes: 0 auto-accept (cosmetic) · 1 accept-with-review (behavioral, compiles) · 2 semantic-conflict · 3 structural conflict. |
| prototype/slice4-semdiff/README.md          | NEW (S19): run instructions + the measured comparison table (git diff3 / slice-3 / slice-4) |
| prototype/slice4-semdiff/{base,sideA,sideB-clean,sideB-dangling}.scrml | NEW (S19) fixture: base has two type entities (`Ref:enum`, `Anchor:struct`, 2 glue segments); sideA renames `Ref.Sha`→`Digest` + updates its use-site; sideB-clean edits the disjoint glue segment safely; sideB-dangling reintroduces a `.Sha` use in the disjoint segment — CLEAN merges (exit 1), DANGLING hits `E-TYPE-063` via `diagnostics.added` (exit 2) |
Scope now covers: single-file struct field-add (slice 1) + enum variant-add (slice 2) + multi-entity
same-file (slice 3) + compiler-validated disjoint-glue merge gated by `scrml semdiff` (slice 4, S19).
Slices 1–3 remain additions-only / sound-conservative (refuse every glue change + removal/retype, so
everything accepted is already type-safe). Slice 4 LOOSENS that ceiling to accept disjoint glue edits —
safe only because of the `#6b` semdiff gate on the candidate `M`. Cross-verified against scrml churn
through `1e63bbb1` (S19: compiler moved `7d5fda26`→`780e4342`→`01160fb8`→`c82550dd`→`99ae45ca`→`1e63bbb1`;
the `#6b` `scrml semdiff` primitive landed at `780e4342`, PR #91).

## CLI Commands (15 registered in src/cli.js)
save          — save current work; auto-generates message; --split for mixed public/private changes
switch        — switch to a named line of work (bookmark)
merge         — merge a named line of work into current
undo          — undo the last operation
history       — show change log (--since <duration> flag)
init          — initialize a new giti repository
land          — ship work: private-path check + conflict check + compiler gate + test gate + merge to main
status        — show working-copy changes, conflicts, current bookmark
describe      — update an existing save's description
sync          — push/pull remote changes (scope-aware; --push/--pull/--remote flags)
serve         — start HTTP API server on 127.0.0.1:3737; compiles ui/*.scrml to ui/dist/ on startup
private       — manage private path scopes (add|remove|check|list|status subcommands)
remote        — manage remotes (add|remove|set-scope|list subcommands)
link-private  — attach a private remote to this clone
check         — dry-run landing validation (--quick compiler-only, --diff list changed .scrml)

## scrml Dogfood — src/lib modules (17 .scrml + compiled .js pairs)
bookmarks.scrml, classify-from-status.scrml, cli-args.scrml, delay.scrml*,
duration.scrml, find-scrml-files.scrml, format-status.scrml, friendly-error.scrml,
parse-status.scrml, remotes.scrml, resolve-compiler.scrml, result.scrml,
save-message.scrml, save-routing-async.scrml, save-routing-pure.scrml,
scope-manifest.scrml, scope-match.scrml, server-helpers.scrml
(* delay.scrml compiled to delay.js; no .scrml found — delay.js is hand-written)

S18: remotes.scrml migrated try/catch → idiomatic `safeCall(() => ...) !{ | ::Thrown :> not }` failable
(scrml:host, §19 values-not-exceptions) once lib-mode safeCall codegen shipped. giti's `.scrml` sources
are now ENTIRELY try/catch-free (throw containment lives only in src/lib/_scrml/host.js).

S19 fn-promotion idiom sweep (commit 64883a8): the compiler now emits `I-FN-PROMOTABLE` on pure
`function`s (bodies meeting §48.3's `fn` constraints). 21 pure functions across 12 modules — result,
duration, parse-status, format-status, friendly-error, bookmarks, save-message, cli-args,
save-routing-pure, classify-from-status, find-scrml-files, scope-match — promoted `function`→`fn`, so
purity is now an enforced invariant at the declaration site. Source-only: `fn` lowers to the identical
`export function` emit, so every compiled `.js` sibling is byte-identical (verified); 375/0 unaffected.
A cascade promoted `globToRegExp`→`fn` (scope-match.scrml), which made caller `matchGlob` provably pure
too — the compiler flagged it on the next pass, chased to zero. Modules that do real I/O (remotes.scrml,
resolve-compiler.scrml, scope-manifest.scrml) correctly stay on `function` — not everything is eligible.

KNOWN GAP — GITI-037 (OPEN, ANSWERED + BANKED upstream S19, not yet built): plain library functions have
NO async idiom today — `async` is banned in scrml source, and plain (non-server) fns do NOT auto-await
`safeCallAsync` (only server-fn context does). scrml's S19 ruling: the real fix is compiler-inferred,
typed-and-surfaced "colorless" async across function boundaries (~80% already built; Phase-1 seed-holes
not yet dispatched) — NOT an interim fail-close. Interim idioms: make the fn a `server function
name(args) ! -> HostError` (auto-awaits safeCallAsync today), use a `_{}` foreign-code block, or keep the
committed `.js`. `server-helpers.scrml` + `save-routing-async.scrml` currently keep the committed `.js`
(source stays on `function` / `async function`) — they promote to `fn` for free once Phase 1 lands.

## scrml Web UI pages — 7 production pages in ui/ (S15 idiomatic rewrite; S17 §4.17 cleanup; S18 await-removal)
All 7 pages use typed `Phase:enum` state + `<match for=Phase on=@cell>` + `<each>`/`<empty>`.
Loads trigger via `on mount {}` blocks; no hydrate-with-defaults GITI-006 dodge.

S18 server-fn idiom (commit 2fae229) — THE NEW CANONICAL SHAPE. scrml @7d5fda26 promoted source-level
`await` to a HARD ERROR (`E-AWAIT-NOT-IN-SCRML`, §19.9.8); the compiler now AUTO-AWAITS `safeCallAsync`
inside a server-fn body. Every server fn's engine call is now:
    import { safeCallAsync } from "scrml:host"
    const res = safeCallAsync(() => engine.X()) !{ | ::Thrown(msg) :> ({ ok: false, error: msg }) }
No `await` remains in any ui/*.scrml (verified by grep). The old `await engine.X()` shape is GONE.
The engine Result tuple is then unwrapped into the page's Phase enum variants exactly as before.

S17 §4.17 fix (commit 1bed516): `<code>`/`<pre>` are RAW-CONTENT — interpolated `${...}` inside them
ships verbatim instead of interpolating. Interpolated inline `<code>` → `<span class="mono">` (shared
utility class in ui/theme.css); interpolated block `<pre class="X">` → `<div class="X">`. Static/
non-interpolated `<code>` chips left as-is.

| Page           | Phase enum(s)                                          | Server fn(s)                              | Notes                                         |
|----------------|--------------------------------------------------------|-------------------------------------------|-----------------------------------------------|
| status.scrml   | StatusPhase, BookmarksPhase, HistoryPhase              | loadStatus, loadHistory, loadBookmarks    | 3 parallel on-mount loads (§13.5.5); safeCallAsync idiom; interpolated bookmark `<span class="mono">` |
| history.scrml  | TimelinePhase                                          | loadTimeline                              | 50-entry window; safeCallAsync idiom; interpolated changeId `<span class="mono">` |
| bookmarks.scrml| BookmarksPhase                                         | loadBookmarkList                          | remote-tracking branches; safeCallAsync idiom; interpolated name `<span class="mono">` |
| diff.scrml     | DiffMode, DiffPhase, HistoryPhase                      | loadHistory, loadDiff                     | ?change= URL param; safeCallAsync idiom; interpolated diffText `<div class="diff-pane">`; changeParam()/modeFromParam() window.location refactor (below) |
| land.scrml     | PreflightPhase                                         | loadLandingPreflight                      | 4 gates (private/conflicts/compiler/tests), each a separate `safeCallAsync(() => …) !{ ::Thrown }`; interpolated gate errors `<div class="gate-error">`/`<span class="mono">` |
| live.scrml     | Phase (Idle/Ok/Error, field on channel <snapshot>)     | refreshStatus (channel server fn)         | §38 channel; safeCallAsync idiom; <match> on snapshot.state field |
| feed.scrml     | Phase (Idle/Ok/Error, field on SSE struct)             | watchStatus (server function*)            | §37 SSE generator; `${ @status = watchStatus() }`; safeCallAsync idiom in the generator body; renders live SSE — the browser-paint SSE-settle fix (S19) confirms this reliably in the main harness run |

diff.scrml E-FN-004 fix (commit 1de8d54): `modeFromUrl`/`changeIdFromUrl` refactored into
`function changeParam()` (sole window.location read) + pure `fn modeFromParam(param: string?)` (testable).

Compiled by `giti serve` to ui/dist/*.{html,client.js,server.js,css}

## ui/repros/ — compiler bug reproducers (34 files; 35 physical files incl. repro-06's helper.js)
repro-01..23: pre-S16 reproducers (23 files)
repro-24..31: S16 additions (8 files) — repro-24 (engine-cell-not-server-writable),
  repro-25 (sse-binding-in-on-mount-invalid-js), repro-26 (safecall-library-mode-invalid-js),
  repro-27 (enum-undefined-in-server-bundle), repro-28 (comment-before-on-mount-leaks-as-text),
  repro-29 (each-key-field-interp-leaks), repro-30 (match-on-subfield-dispatches-whole-cell),
  repro-31 (ternary-markup-in-match-arm)
repro-32..33: S17 additions (2 files) —
  repro-32-each-item-accessor-in-ternary-markup.scrml (GITI-033): `<each>` item accessor not lowered
    inside ternary-markup; GITI-033 LANDED upstream.
  repro-33-sse-generator-binding-clobbers-seed-with-null.scrml (GITI-035): binding a `server function*`
    (SSE generator) to a reactive cell via `${ @cell = gen() }` emitted a spurious
    `_scrml_reactive_set(cell, null)` that clobbered the typed seed → runtime null-crash on first
    synchronous render. GITI-035 now CLOSED (feed null-clobber FIXED upstream); feed.scrml renders live
    SSE. Repro file retained as a historical reproducer.
repro-34: S19 addition (1 file) —
  repro-34-e-route-001-computed-capture-in-object-literal.scrml (E-ROUTE-001, P3 FYI, filed S19):
    route-inference warning over-fires on numeric regex-capture array access (`m[1]`, `m[2]`) when it
    appears in an OBJECT-LITERAL-VALUE position, inside a pure, route-less library fn
    (surfaced on src/lib/parse-status.scrml::parseStatus). The identical capture read in a
    ternary/const-bind position does NOT trigger the warning. Non-blocking (warning only, correct
    emit); filed to scrml's inbox, disposition is their call.
All skipped by `giti serve` — not app pages.

## GITI bug ledger — current deltas (S19)
- GITI-036 CLOSED — structural-eq treeshake VERIFIED FIXED @ scrml `01160fb8` (fix `4d0220c7`, PR #59).
  Runtime bundle now DEFINES `_scrml_structural_eq` (was 0, now 1); status browser-paints loaded data
  with zero structural-eq/ReferenceError console errors. No giti source change — idiomatic source
  retained through the bug.
- GITI-016 CLEARED — `match` identifier workaround REMOVED: `src/lib/friendly-error.scrml` restored
  `m`→`match`, recompiled clean (`is some` lowers correctly); 375/0. A 100%-scrml roadmap blocker cleared.
- GITI-037 OPEN, ANSWERED + BANKED upstream (not yet built) — scrml ruled (S19): colorless async via
  compiler-inferred, typed-and-surfaced async is the real fix (~80% already built; Phase-1 seed-holes not
  yet dispatched). Silent Promise-leak persists until Phase 1 lands. Interim: `server-helpers.scrml` +
  `save-routing-async.scrml` stay on committed `.js` / `function` / `async function`.
- E-ROUTE-001 NEW, P3 FYI (filed S19) — see ui/repros/ entry above; non-blocking.

## tests/manual/ — 3 harnesses (not part of `bun test`)
channel-runtime.mjs — §38 WS: boots real server wiring, opens 2 WS clients, fires refreshStatus via HTTP, asserts both receive snapshot __sync broadcast
sse-runtime.mjs     — §37 SSE: loads compiled feed.server.js directly, counts delivered frames; two phases isolate enum-undefined root cause (repro-27)
browser-paint.mjs   — drives headless Chromium (playwright + chromium resolved from $HOME, NOT hardcoded — portable across machines) over giti serve; visits all 7 pages, waits for loaders, inspects painted DOM + screenshots. land gets a 45s nav-timeout budget (its on-mount preflight runs the REAL gate: compile all .scrml + full `bun test`, ~20s+); other pages use 15s. **S19: SSE-aware settle path** — `feed` holds an open EventSource so `networkidle` never fires; it now settles on `domcontentloaded` + a 3s paint window instead (WS-driven `live` keeps `networkidle`). **True 7 of 7 pages paint clean in a single main-harness run** (was 6/7 + a feed timeout every run through S18, even though feed rendered fine). See test.map.md for the full harness table.

## Ignored / Generated Paths
node_modules/, ui/dist/, src/lib/dist/, .git/, .jj/

## Tags
#giti #map #structure #cli #bun #javascript #scrml #ast-merge #safecall #semdiff #fn-promotion

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
