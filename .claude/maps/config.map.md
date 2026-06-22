# config.map.md
# project: giti
# updated: 2026-06-22T00:00:00Z  commit: b2fde19

## Environment Variables
No .env.example or .env.template found.

| Key              | Required | Source file                  | Effect                                                                 |
|------------------|----------|------------------------------|------------------------------------------------------------------------|
| GITI_LOCAL_DEV   | optional | src/commands/serve.js:19     | Set to "1" to enable write endpoints in giti serve (same as --local-dev flag) |
| GITI_SERVER_LOG  | optional | src/server/index.js:65       | Set to "1" to enable per-request logging in the HTTP server            |
| SCRML_PATH       | optional | src/lib/resolve-compiler.scrml:33 | Override path to scrml compiler checkout (preferred, canonical name)  |
| SCRMLTS_PATH     | optional | src/lib/resolve-compiler.scrml:34 | Legacy override path (pre-rename; honored as fallback after SCRML_PATH) |

## Feature Flags
localDev (runtime flag) — passed to createHandler(); enables /save, /switch, /merge, /undo HTTP endpoints
                           when false (default), write endpoints return 403

## Config Files
No standalone config files (config.js, etc.).
Private path manifest: `.giti/private` (repo-local, one glob pattern per line; managed by `giti private`)
Remote registry: `.giti/remotes.json` (repo-local; managed by `giti remote`)

## Runtime Assumptions
- jj binary must be in PATH (version 0.40+)
- Bun runtime required (uses Bun.spawn, Bun.serve, Bun.file, bun:test)
- scrml compiler required for `giti land`, `giti check`, `giti serve` (resolved via env or sibling checkout)
- HTTP server always binds 127.0.0.1 (hardcoded; no interface override); default port 3737

## Tags
#giti #map #config #environment #bun #javascript #scrml

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
