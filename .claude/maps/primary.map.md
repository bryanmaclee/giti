# primary.map.md
# project: giti
# updated: 2026-04-11T00:00:00Z  commit: 3c4a7c3

## Project Fingerprint
Language:   JavaScript (ES modules, no TypeScript)
Framework:  None (plain Bun + process.argv dispatch)
Runtime:    Bun (version pinned by usage of Bun.spawn; jj 0.40+ required in PATH)
Type:       CLI tool
Size:       ~25 source files, ~1,079 LOC (src/), 88 tests

## Map Index
| Map                  | Status  | Contents                                          |
|----------------------|---------|---------------------------------------------------|
| structure.map.md     | present | directory layout, CLI entry point                 |
| dependencies.map.md  | present | 0 declared packages; Bun builtins + jj binary dep |
| schema.map.md        | present | 4 JSDoc typedefs + engine result shape            |
| config.map.md        | present | 0 env vars; runtime: jj in PATH + Bun             |
| build.map.md         | present | dev/test commands; no build step or CI            |
| error.map.md         | present | 16 friendly error codes; result-object pattern    |
| test.map.md          | present | bun:test, 88 tests (81 unit + 7 integration)      |
| api.map.md           | present | 10 CLI commands + 14 engine methods               |
| state.map.md         | absent  | no state management library                       |
| events.map.md        | absent  | no event bus or pub-sub                           |
| auth.map.md          | absent  | no auth layer (remote auth delegated to jj/git)   |
| domain.map.md        | absent  | no domain/ or core/ directory                     |
| style.map.md         | absent  | no UI, no styling                                 |
| i18n.map.md          | absent  | no i18n                                           |
| infra.map.md         | absent  | no Docker, no CI/CD, no cloud resources           |
| migrations.map.md    | absent  | no database                                       |
| jobs.map.md          | absent  | no background jobs                                |

## File Routing
types / interfaces / JSDoc shapes      → schema.map.md
CLI commands / engine methods          → api.map.md
environment variables / config keys    → config.map.md
test patterns / mock helpers           → test.map.md
build commands                         → build.map.md
directory layout / entry point         → structure.map.md
external packages / internal graph     → dependencies.map.md
error codes / handling patterns        → error.map.md

## Key Facts
- Entry point: src/cli.js — reads process.argv, dispatches to one of 10 command handlers, no framework
- Engine: JjCliEngine in src/engine/jj-cli.js wraps jj CLI subprocess; all ops return { ok, data|error }
- No TypeScript, no build step — Bun runs .js files directly; bin registered via package.json bin field
- Test injection: JjCliEngine accepts a `spawn` option for mocking Bun.spawn; unit tests never touch real jj
- land command runs a compiler gate (bun run compiler/src/index.ts) and test gate (bun test) before merging — compiler path assumes scrmlTS is a sibling at ../compiler/
- Friendly error mapping: 14 jj stderr patterns mapped to user-readable messages in friendlyError() [src/engine/jj-cli.js:27]
- src/types/ directory exists but is empty at scan time

## Tags
#giti #map #primary #cli #bun #javascript #jj

## Links
- [structure.map.md](./structure.map.md)
- [dependencies.map.md](./dependencies.map.md)
- [schema.map.md](./schema.map.md)
- [config.map.md](./config.map.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
- [test.map.md](./test.map.md)
- [api.map.md](./api.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
