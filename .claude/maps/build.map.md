# build.map.md
# project: giti
# updated: 2026-06-22T00:00:00Z  commit: b2fde19

## Development Commands
bun run dev                     — run src/cli.js directly (alias in package.json scripts)
bun run src/cli.js [args]       — invoke CLI directly without global install
bun test                        — run all tests (~375 tests across 14 test files)
bun test tests/cli.test.js      — run CLI unit tests only
bun test tests/server.test.js   — run HTTP server route tests only
bun test tests/land.test.js     — run compiler-gate and scrml-file discovery tests

## Build & Release
No dedicated build step — plain JavaScript, Bun runs .js files directly.
No release pipeline or publish workflow defined.
Installation: `bun install -g` (or `npm install -g`) — registers `giti` bin via package.json bin field → src/cli.js

## scrml Compile Step (manual / on-demand)
To recompile a src/lib/*.scrml module:
  bun run ../scrml/compiler/src/cli.js compile src/lib/<module>.scrml -o src/lib --mode library

To recompile all UI pages:
  bun run ../scrml/compiler/src/cli.js compile ui/<page>.scrml -o ui/dist

(giti serve performs the UI compile automatically on startup)

## giti serve startup sequence
1. Calls compileUi() → shells out to scrml compiler for each ui/*.scrml (top-level only, skips ui/repros/)
2. Copies shared CSS (ui/theme.css → ui/dist/theme.css)
3. Dynamically imports all ui/dist/*.server.js handlers
4. Discovers §38 channel WebSocket routes from ui/dist/*.server.js
5. Starts Bun.serve on 127.0.0.1:3737

## CI/CD Pipeline
No .github/workflows/, .gitlab-ci.yml, or Jenkinsfile detected.

## Docker
No Dockerfile or docker-compose.yml detected.

## Tags
#giti #map #build #bun #javascript #scrml #test

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
