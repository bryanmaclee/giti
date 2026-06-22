# structure.map.md
# project: giti
# updated: 2026-06-22T00:00:00Z  commit: b2fde19

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
tests/              — Bun test suite (~375 tests across 14 .test.js files + 1 manual script)
ui/                 — scrml Web UI source: 6 production `.scrml` pages + theme.css
ui/repros/          — compiler bug reproducer `.scrml` files (23 files; skipped by `giti serve`)
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

## scrml Web UI pages (6 production pages in ui/)
bookmarks.scrml, diff.scrml, feed.scrml, history.scrml, live.scrml, status.scrml
Compiled by `giti serve` to ui/dist/*.{html,client.js,server.js,css}
ui/repros/ (23 .scrml) are compiler-bug reproducers — skipped by serve

## Ignored / Generated Paths
node_modules/, ui/dist/, src/lib/dist/, .git/, .jj/

## Tags
#giti #map #structure #cli #bun #javascript #scrml

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
