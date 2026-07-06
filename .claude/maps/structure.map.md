# structure.map.md
# project: giti
# updated: 2026-07-06T10:16:06-06:00  commit: ccad5ba

## Entry Points
src/cli.js — CLI binary entry; registers all 15 commands, dispatches to command handlers, prints help/version

## Directory Ownership
src/                — all source code (CLI entry, commands, engine, lib, server, private helpers)
src/commands/       — one file per CLI command (15 commands); each exports a named function
src/engine/         — VCS engine abstraction: interface contract, JjCliEngine (jj subprocess), factory
src/lib/            — shared logic modules; each has a `.scrml` source file and a compiled `.js` sibling
src/lib/_scrml/     — hand-written scrml stdlib shims: fs.js, path.js, process.js (serve scrml:* imports)
src/lib/dist/       — stale intermediate artifacts from src/lib scrml pages (generated; superceded by ui/dist/)
src/private/        — private-path scope helpers; thin re-export shims over src/lib counterparts
src/server/         — Bun HTTP server, compile-ui orchestration, WinterCG/channel handler wiring
tests/              — Bun test suite (~375 tests across 14 .test.js files + 3 manual scripts)
tests/manual/       — manual harnesses: channel-runtime.mjs (§38 WS), sse-runtime.mjs (§37 SSE), browser-paint.mjs (headless Chromium; now portable + land nav-budget, see below)
ui/                 — scrml Web UI source: 7 production `.scrml` pages + theme.css
ui/repros/          — compiler bug reproducer `.scrml` files (33 files; skipped by `giti serve`)
ui/dist/            — compiled output from ui/*.scrml (generated; skipped by mapper)
docs/deep-dives/    — historical design deep-dives (6 .md files; belong in scrml-support)
docs/spec-types/    — illustrative scrml domain shapes in .scrml (reference only, not compiled)
docs/ast-merge/     — NEW (S17): §4.3 AST semantic-merge research thread — shared design note +
                      compiler ask (giti+flogence, to scrml) + a BUILT, gate-verified `prototype/`
                      merge driver. See non-compliance.report.md for compliance assessment of the
                      two design-note files; `prototype/` is real, running, gate-verified code.
.pa-base/           — NEW (S17): flobase boot manifest (`profile`) — points at pa.md, does not replace it

## docs/ast-merge/ (S17 — new research/prototype thread)
| Path                                    | What it is                                                                 |
|------------------------------------------|-----------------------------------------------------------------------------|
| v0-approach-d-shared-note.md            | giti+flogence shared design note for §4.3 AST semantic merge (v0 draft; joint compiler-interface Q&A) |
| compiler-ask-v0.md                      | Co-signed ask to scrml: 2 additive extensions to `--emit-block-analysis` (field-level member emission + tight bodySpan) |
| prototype/merge-driver.mjs              | Working CLI: 3-way merges a `.scrml` state-type field-add off `--emit-block-analysis` spans; gate = the merged file must compile |
| prototype/README.md                     | How to run the prototype + the two empirical findings that became the compiler ask |
| prototype/slice/{base,sideA,sideB}.scrml | Fixture: base `AppState{count,name}`; sideA adds `theme`; sideB adds `locale` — git-conflicts, driver merges clean |
Scope: single-file, flat-struct, field-add-only (no renames/removals/nested types) — first slice only.
Compiler cross-verified at scrml @59dc5287 (s241, language v0.7.1).

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

## scrml Web UI pages — 7 production pages in ui/ (S15 idiomatic rewrite; S17 §4.17 cleanup)
All 7 pages use typed `Phase:enum` state + `<match for=Phase on=@cell>` + `<each>`/`<empty>`.
Server functions return enum variants directly off the engine Result tuple.
Loads trigger via `on mount {}` blocks; no hydrate-with-defaults GITI-006 dodge.

S17 §4.17 fix (commit 1bed516): `<code>`/`<pre>` are RAW-CONTENT — interpolated `${...}` inside them
ships verbatim instead of interpolating (empirically confirmed on scrml@59dc5287). Interpolated inline
`<code>` → `<span class="mono">` (new shared utility class in ui/theme.css); interpolated block
`<pre class="X">` → `<div class="X">` (CSS already carries white-space:pre). Static/non-interpolated
`<code>` chips left as-is. Fixed in: bookmarks, diff, history, land, status.

| Page           | Phase enum(s)                                          | Server fn(s)                              | Notes                                         |
|----------------|--------------------------------------------------------|-------------------------------------------|-----------------------------------------------|
| status.scrml   | StatusPhase, BookmarksPhase, HistoryPhase              | loadStatus, loadHistory, loadBookmarks    | 3 parallel on-mount loads (§13.5.5); interpolated bookmark now `<span class="mono">` |
| history.scrml  | TimelinePhase                                          | loadTimeline                              | 50-entry window; interpolated changeId now `<span class="mono">` |
| bookmarks.scrml| BookmarksPhase                                         | loadBookmarkList                          | includes remote-tracking branches; interpolated name now `<span class="mono">` |
| diff.scrml     | DiffMode, DiffPhase, HistoryPhase                      | loadHistory, loadDiff                     | ?change= URL param selects working-copy vs change; interpolated diffText now `<div class="diff-pane">`; §4.17 changeId now `<span class="mono">`; window.location read refactored (below) |
| land.scrml     | PreflightPhase                                         | loadLandingPreflight                      | runs all 4 gates (private/conflicts/compiler/tests); interpolated gate errors + paths now `<div class="gate-error">`/`<span class="mono">` |
| live.scrml     | Phase (Idle/Ok/Error, field on channel <snapshot>)     | refreshStatus (channel server fn)         | §38 channel; <match> on snapshot.state field  |
| feed.scrml     | Phase (Idle/Ok/Error, field on SSE struct)             | watchStatus (server function*)            | §37 SSE generator; still NOT rendering — repro-33/GITI-035 (seed-clobber, see below) |

diff.scrml E-FN-004 fix (commit 1de8d54): `modeFromUrl`/`changeIdFromUrl` (both reading
`window.location` directly) refactored into `function changeParam()` (the sole window.location read)
+ pure `fn modeFromParam(param: string?)` (testable, no global read). Both `on mount` blocks now call
`modeFromParam(changeParam())` / `loadDiff(changeParam())`.

Compiled by `giti serve` to ui/dist/*.{html,client.js,server.js,css}

## ui/repros/ — compiler bug reproducers (33 files total)
repro-01..23: pre-S16 reproducers (23 files)
repro-24..31: S16 additions (8 files) — repro-24 (engine-cell-not-server-writable),
  repro-25 (sse-binding-in-on-mount-invalid-js), repro-26 (safecall-library-mode-invalid-js),
  repro-27 (enum-undefined-in-server-bundle), repro-28 (comment-before-on-mount-leaks-as-text),
  repro-29 (each-key-field-interp-leaks), repro-30 (match-on-subfield-dispatches-whole-cell),
  repro-31 (ternary-markup-in-match-arm)
repro-32..33: S17 additions (2 files) —
  repro-32-each-item-accessor-in-ternary-markup.scrml (GITI-033): `<each>` item accessor `@.`/`@.field`
    not lowered when the `<each>` is nested inside ternary-markup `${ cond ? <markup> : "" }`; emits raw
    `@.` into the client bundle → E-CODEGEN-INVALID-LOGIC. Control case (identical `<each>` outside the
    ternary) compiles clean. Filed against scrml @94e156c5 (s239, v0.2.0); GITI-033 since landed upstream.
  repro-33-sse-generator-binding-clobbers-seed-with-null.scrml (GITI-035): binding a `server function*`
    (SSE generator) to a reactive cell via `${ @cell = gen() }` emits a spurious
    `_scrml_reactive_set(cell, null)` that clobbers the typed seed — cell is null between that clobber
    and the first SSE event, so any synchronous render of `@cell.<field>` crashes at runtime
    ("Cannot read properties of null"). Compile + `node --check` are clean (Bug-51 class — the runtime
    half of giti's feed finding #2). Still reproducing post-GITI-033, on scrml @59dc5287. This is why
    feed.scrml is the one page of 7 not yet rendering. Filed to scrml 2026-07-06.
All skipped by `giti serve` — not app pages.

## tests/manual/ — 3 harnesses (not part of `bun test`)
channel-runtime.mjs — §38 WS: boots real server wiring, opens 2 WS clients, fires refreshStatus via HTTP, asserts both receive snapshot __sync broadcast
sse-runtime.mjs     — §37 SSE: loads compiled feed.server.js directly, counts delivered frames; two phases isolate enum-undefined root cause (repro-27)
browser-paint.mjs   — drives headless Chromium (playwright + chromium resolved from $HOME, NOT hardcoded — portable across machines) over giti serve; visits all 7 pages, waits for loaders, inspects painted DOM + screenshots. land gets a 45s nav-timeout budget (its on-mount preflight runs the REAL gate: compile all .scrml + full `bun test`, ~20s+); other pages use 15s. 6 of 7 pages paint clean as of S17 (feed blocked on GITI-035).

## Ignored / Generated Paths
node_modules/, ui/dist/, src/lib/dist/, .git/, .jj/

## Tags
#giti #map #structure #cli #bun #javascript #scrml #ast-merge

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
