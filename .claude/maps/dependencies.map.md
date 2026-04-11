# dependencies.map.md
# project: giti
# updated: 2026-04-11T00:00:00Z  commit: 3c4a7c3

## Runtime Dependencies
No external runtime dependencies declared in package.json.
Runtime relies on Bun built-ins (Bun.spawn, Response) and Node.js built-ins (fs, path, os, child_process).
External runtime requirement: `jj` binary in PATH (jj 0.40+, not declared in package.json).

## Dev / Build Dependencies
No dev dependencies declared in package.json.
Test framework: bun:test (bundled with Bun runtime).

## Internal Module Graph
src/cli.js           → src/commands/save.js, switch.js, merge.js, undo.js, history.js, init.js, land.js, status.js, describe.js, sync.js
src/commands/save.js → src/engine/index.js, src/commands/status.js
src/commands/switch.js  → src/engine/index.js
src/commands/merge.js   → src/engine/index.js
src/commands/undo.js    → src/engine/index.js
src/commands/history.js → src/engine/index.js
src/commands/status.js  → src/engine/index.js
src/commands/land.js    → src/engine/index.js
src/commands/init.js    → src/engine/index.js
src/commands/describe.js → src/engine/index.js
src/commands/sync.js    → src/engine/index.js
src/engine/index.js     → src/engine/jj-cli.js
src/engine/jj-cli.js    → src/engine/interface.js

## Tags
#giti #map #dependencies #bun #javascript #jj

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
