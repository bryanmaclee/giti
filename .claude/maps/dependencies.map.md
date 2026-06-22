# dependencies.map.md
# project: giti
# updated: 2026-06-22T00:00:00Z  commit: b2fde19

## Runtime Dependencies
No external runtime dependencies declared in package.json.
Runtime relies on Bun built-ins (Bun.spawn, Bun.serve, Bun.file, bun:test) and Node.js built-ins (node:fs, node:path, node:os).

External runtime requirements (not in package.json):
- `jj` binary in PATH (jj 0.40+) — all VCS operations
- `scrml` compiler at `../scrml/compiler/src/cli.js` (or via $SCRML_PATH) — required by `giti land`, `giti check`, `giti serve`

## Dev / Build Dependencies
No dev dependencies declared in package.json.
Test framework: bun:test (bundled with Bun runtime).
Package scripts: `test` → `bun test`, `dev` → `bun run src/cli.js`

## Internal Module Graph
src/cli.js              → src/commands/{save,switch,merge,undo,history,init,land,status,describe,sync,serve,private,remote,link-private,check}.js
src/commands/save.js    → src/engine/index.js, src/commands/status.js, src/lib/save-message.js, src/lib/cli-args.js, src/private/save-routing.js
src/commands/history.js → src/engine/index.js, src/lib/duration.js, src/lib/cli-args.js
src/commands/status.js  → src/engine/index.js, src/lib/parse-status.js, src/lib/format-status.js
src/commands/land.js    → src/engine/index.js, src/commands/status.js, src/private/scope.js, src/lib/resolve-compiler.js, src/lib/find-scrml-files.js, src/lib/result.js
src/commands/check.js   → src/commands/land.js, src/engine/index.js, src/commands/status.js
src/commands/sync.js    → src/engine/index.js, src/commands/status.js, src/private/scope.js, src/private/remotes.js, src/private/save-routing.js, src/lib/cli-args.js, src/lib/bookmarks.js
src/commands/serve.js   → src/server/index.js
src/commands/private.js → src/private/scope.js, src/private/save-routing.js, src/engine/index.js
src/commands/remote.js  → src/private/remotes.js
src/engine/index.js     → src/engine/jj-cli.js
src/engine/jj-cli.js    → src/engine/interface.js, src/lib/friendly-error.js, src/lib/result.js
src/server/index.js     → src/engine/index.js, src/commands/status.js, src/server/compile-ui.js, src/lib/server-helpers.js
src/server/compile-ui.js → src/commands/land.js (re-uses resolveCompilerPath)
src/private/scope.js    → src/lib/scope-manifest.js, src/lib/scope-match.js  (re-export shims)
src/private/save-routing.js → src/lib/bookmarks.js, src/lib/save-routing-pure.js, src/lib/save-routing-async.js, src/lib/classify-from-status.js  (re-export shims)
src/private/remotes.js  → src/lib/remotes.js  (re-export shim)

## scrml stdlib shims (src/lib/_scrml/)
fs.js      — mirrors scrml:fs exports (readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync)
path.js    — mirrors scrml:path exports (join, resolve, dirname, basename)
process.js — mirrors scrml:process exports (cwd, env, argv)

## Tags
#giti #map #dependencies #bun #javascript #jj #scrml

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
