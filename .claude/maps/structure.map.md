# structure.map.md
# project: giti
# updated: 2026-04-11T00:00:00Z  commit: 3c4a7c3

## Entry Points
src/cli.js — CLI binary entry; registers all 10 commands, dispatches to command handlers, prints help

## Directory Ownership
src/                  — all source code (CLI entry + commands + engine)
src/commands/         — one file per giti command; each exports a single async function
src/engine/           — jj-cli wrapper: interface contract, JjCliEngine implementation, factory
src/types/            — directory exists but contains no files at scan time
tests/                — Bun test suite (unit + integration)
docs/                 — repo-scoped documentation only
docs/gauntlet-teams/  — reference data from teams gauntlet (empty dist/ subdirs, no content files)
handOffs/             — historical session hand-offs (out-of-scope, not mapped)

## Ignored / Generated Paths
node_modules/, dist/, build/, target/, .git/, .claude/

## Tags
#giti #map #structure #cli #bun #javascript

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
