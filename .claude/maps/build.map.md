# build.map.md
# project: giti
# updated: 2026-04-11T00:00:00Z  commit: 3c4a7c3

## Development Commands
bun run dev     — run src/cli.js directly via Bun (alias for `bun run src/cli.js`)
bun run src/cli.js [args]  — invoke CLI directly without install

## Test Commands
bun test                              — run all tests (81 unit + 7 integration = 88 total)
bun test tests/cli.test.js            — run CLI unit tests only (81 tests)
bun test tests/jj-integration.test.js — run jj real-repo integration tests (7 tests, skips if jj not in PATH)

## Build & Release
No build step required — plain JavaScript, no compilation.
No release pipeline or publish workflow defined.

## Installation
npm install -g (or bun install -g) — installs `giti` bin via package.json bin field pointing to src/cli.js

## CI/CD Pipeline
No .github/workflows/, .gitlab-ci.yml, or Jenkinsfile detected at scan time.

## Docker
No Dockerfile or docker-compose.yml detected at scan time.

## Tags
#giti #map #build #bun #javascript #test

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
