# structure.map.md
# project: giti
# updated: 2026-07-15T16:04:15-06:00  commit: 513ef41

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
tests/manual/       — manual harnesses: channel-runtime.mjs (§38 WS), sse-runtime.mjs (§37 SSE), browser-paint.mjs (headless Chromium; portable + land nav-budget; now 7/7, see below)
ui/                 — scrml Web UI source: 7 production `.scrml` pages + theme.css
ui/repros/          — compiler bug reproducer `.scrml` files (33 files; skipped by `giti serve`)
ui/dist/            — compiled output from ui/*.scrml (generated; skipped by mapper)
docs/deep-dives/    — historical design deep-dives (6 .md files; belong in scrml-support)
docs/spec-types/    — illustrative scrml domain shapes in .scrml (reference only, not compiled)
docs/ast-merge/     — §4.3 AST semantic-merge research thread — shared design note + compiler ask
                      (giti+flogence, to scrml) + a BUILT, gate-verified `prototype/` with three slices
                      (struct field-add, enum variant-add, multi-entity). See non-compliance.report.md
                      for compliance assessment of the narrative .md files; `prototype/` is real,
                      running, gate-verified code.
.pa-base/           — flobase boot manifest (`profile`) — points at pa.md, does not replace it

## docs/ast-merge/ (research/prototype thread — S17 slice 1, S18 slices 2 & 3)
| Path                                       | What it is                                                                 |
|--------------------------------------------|-----------------------------------------------------------------------------|
| v0-approach-d-shared-note.md               | giti+flogence shared design note for §4.3 AST semantic merge (joint compiler-interface Q&A) |
| compiler-ask-v0.md                         | Co-signed ask to scrml: additive extensions to `--emit-block-analysis` (field-level member emission + tight bodySpan) — since SHIPPED as oracle-ask #6 |
| slice2-enum-merge-and-measured-boundary.md | NEW (S18): write-up of slice 2 (enum) + slice 3 (multi) + the measured `#6b` boundary (where consumer-side member-emission stops being sound and needs compiler classification) — giti's grounding for the flogence #6b co-sign |
| prototype/README.md                        | Slice 1: run the struct field-add driver + the two empirical findings that became the compiler ask |
| prototype/merge-driver.mjs                 | Slice 1: 3-way merges a `.scrml` state-type field-add off `--emit-block-analysis` spans; gate = merged file must compile |
| prototype/slice/{base,sideA,sideB}.scrml   | Slice-1 fixture: base `AppState{count,name}`; sideA adds `theme`; sideB adds `locale` — git-conflicts, driver merges clean |
| prototype/slice2-enum/merge-driver-enum.mjs| NEW (S18): enum variant-add merge; consumes shipped `members[]` directly (re-parse layer DROPPED), splices each added variant verbatim by span; keyed on `{name, typeText}` |
| prototype/slice2-enum/{base,sideA,sideB}.scrml + sideA/B-collide.scrml | NEW (S18): base `Ref:enum{Sha,None}`; disjoint variant-adds merge clean; collide fixtures (both add `Tag`, different arg-tuple) → correct CONFLICT via `typeText` |
| prototype/slice2-enum/boundary/{base2,rename-clean,rename-dangling}.scrml | NEW (S18): the measured #6b boundary fixtures — where a rename is/ isn't distinguishable from add+remove on member-emission alone |
| prototype/slice3-multi/merge-driver-multi.mjs | NEW (S18): multi-entity same-file merge; disjoint entities (A→struct field, B→enum variant) that git text-conflicts on adjacent lines; whole-entity splice, same-entity-both-sides recurses into member-merge |
| prototype/slice3-multi/{base,sideA,sideB}.scrml | NEW (S18): multi-entity fixture |
Scope now covers: single-file struct field-add (slice 1) + enum variant-add (slice 2) + multi-entity
same-file (slice 3). Still additions-only, no renames/removals/nested types (slice 2's boundary/ fixtures
locate exactly where renames break the consumer-side approach). Cross-verified against scrml @7d5fda26.

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
KNOWN GAP — GITI-037 (NEW, OPEN): plain library functions have NO async idiom — `async` is banned in
scrml source, and plain (non-server) fns do NOT auto-await `safeCallAsync`. Only server-fn context
auto-awaits it. Any lib module needing an awaited host call currently has no idiomatic path.

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
| feed.scrml     | Phase (Idle/Ok/Error, field on SSE struct)             | watchStatus (server function*)            | §37 SSE generator; `${ @status = watchStatus() }`; safeCallAsync idiom in the generator body; NOW RENDERS LIVE SSE (GITI-035 CLOSED, see below) — this is the 7th of 7 |

diff.scrml E-FN-004 fix (commit 1de8d54): `modeFromUrl`/`changeIdFromUrl` refactored into
`function changeParam()` (sole window.location read) + pure `fn modeFromParam(param: string?)` (testable).

Compiled by `giti serve` to ui/dist/*.{html,client.js,server.js,css}

## ui/repros/ — compiler bug reproducers (33 files total)
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
All skipped by `giti serve` — not app pages.

## GITI bug ledger — current deltas (S18)
- GITI-035 CLOSED — feed SSE seed null-clobber fixed upstream; feed.scrml renders live → 7/7 paint.
- GITI-016 FIXED — variable name `match` no longer triggers E-SCOPE-001; the `match`→`m` workaround is now removable.
- GITI-036 NEW, OPEN — status page's `==` lowers to a `_scrml_structural_eq` helper that gets tree-shaken OUT of the client runtime bundle (equality helper missing at runtime).
- GITI-037 NEW, OPEN — no async idiom for plain (non-server) library functions: `async` banned in source AND plain fns don't auto-await `safeCallAsync` (only server-fn context does).

## tests/manual/ — 3 harnesses (not part of `bun test`)
channel-runtime.mjs — §38 WS: boots real server wiring, opens 2 WS clients, fires refreshStatus via HTTP, asserts both receive snapshot __sync broadcast
sse-runtime.mjs     — §37 SSE: loads compiled feed.server.js directly, counts delivered frames; two phases isolate enum-undefined root cause (repro-27)
browser-paint.mjs   — drives headless Chromium (playwright + chromium resolved from $HOME, NOT hardcoded — portable across machines) over giti serve; visits all 7 pages, waits for loaders, inspects painted DOM + screenshots. land gets a 45s nav-timeout budget (its on-mount preflight runs the REAL gate: compile all .scrml + full `bun test`, ~20s+); other pages use 15s. **7 of 7 pages paint clean as of S18** — feed now renders live SSE (GITI-035 closed).

## Ignored / Generated Paths
node_modules/, ui/dist/, src/lib/dist/, .git/, .jj/

## Tags
#giti #map #structure #cli #bun #javascript #scrml #ast-merge #safecall

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
