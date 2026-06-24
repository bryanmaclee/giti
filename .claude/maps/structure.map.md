# structure.map.md
# project: giti
# updated: 2026-06-24T14:00:00Z  commit: 36e0fb4

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
tests/manual/       — manual harnesses: channel-runtime.mjs (§38 WS), sse-runtime.mjs (§37 SSE), browser-paint.mjs (headless Chromium)
ui/                 — scrml Web UI source: 7 production `.scrml` pages + theme.css
ui/repros/          — compiler bug reproducer `.scrml` files (32 files; skipped by `giti serve`)
ui/dist/            — compiled output from ui/*.scrml (generated; skipped by mapper)
docs/deep-dives/    — historical design deep-dives (6 .md files; belong in scrml-support)
docs/spec-types/    — illustrative scrml domain shapes in .scrml (reference only, not compiled)

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

## scrml Web UI pages — 7 production pages in ui/ (S15 idiomatic rewrite)
All 7 pages use typed `Phase:enum` state + `<match for=Phase on=@cell>` + `<each>`/`<empty>`.
Server functions return enum variants directly off the engine Result tuple.
Loads trigger via `on mount {}` blocks; no hydrate-with-defaults GITI-006 dodge.

| Page           | Phase enum(s)                                          | Server fn(s)                              | Notes                                         |
|----------------|--------------------------------------------------------|-------------------------------------------|-----------------------------------------------|
| status.scrml   | StatusPhase, BookmarksPhase, HistoryPhase              | loadStatus, loadHistory, loadBookmarks    | 3 parallel on-mount loads (§13.5.5)           |
| history.scrml  | TimelinePhase                                          | loadTimeline                              | 50-entry window                               |
| bookmarks.scrml| BookmarksPhase                                         | loadBookmarkList                          | includes remote-tracking branches             |
| diff.scrml     | DiffMode, DiffPhase, HistoryPhase                      | loadHistory, loadDiff                     | ?change= URL param selects working-copy vs change |
| land.scrml     | PreflightPhase                                         | loadLandingPreflight                      | runs all 4 gates (private/conflicts/compiler/tests) |
| live.scrml     | Phase (Idle/Ok/Error, field on channel <snapshot>)     | refreshStatus (channel server fn)         | §38 channel; <match> on snapshot.state field  |
| feed.scrml     | Phase (Idle/Ok/Error, field on SSE struct)             | watchStatus (server function*)            | §37 SSE generator; binding at module top      |

Compiled by `giti serve` to ui/dist/*.{html,client.js,server.js,css}

## ui/repros/ — compiler bug reproducers (32 files total)
repro-01..23: pre-S16 reproducers (23 files)
repro-24..31: S16 additions (8 files) — repro-24 (engine-cell-not-server-writable),
  repro-25 (sse-binding-in-on-mount-invalid-js), repro-26 (safecall-library-mode-invalid-js),
  repro-27 (enum-undefined-in-server-bundle), repro-28 (comment-before-on-mount-leaks-as-text),
  repro-29 (each-key-field-interp-leaks), repro-30 (match-on-subfield-dispatches-whole-cell),
  repro-31 (ternary-markup-in-match-arm)
All skipped by `giti serve` — not app pages.

## tests/manual/ — 3 harnesses (not part of `bun test`)
channel-runtime.mjs — §38 WS: boots real server wiring, opens 2 WS clients, fires refreshStatus via HTTP, asserts both receive snapshot __sync broadcast
sse-runtime.mjs     — §37 SSE: loads compiled feed.server.js directly, counts delivered frames; two phases isolate enum-undefined root cause (repro-27)
browser-paint.mjs   — drives headless Chromium (playwright from ../scrml/node_modules) over giti serve; visits all 7 pages, waits for loaders, inspects painted DOM + screenshots

## Ignored / Generated Paths
node_modules/, ui/dist/, src/lib/dist/, .git/, .jj/

## Tags
#giti #map #structure #cli #bun #javascript #scrml

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
