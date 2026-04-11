# config.map.md
# project: giti
# updated: 2026-04-11T00:00:00Z  commit: 3c4a7c3

## Environment Variables
No .env.example or .env.template found.
No process.env references detected in source code.
No runtime configuration via environment variables at scan time.

## Feature Flags
No feature flags detected.

## Config Files
No standalone config files (config.js, config.ts, etc.) detected.

## Runtime Assumptions
- jj binary must be in PATH (version 0.40+)
- Bun runtime required (uses Bun.spawn, bun:test)
- Default repoPath: process.cwd() when not specified to JjCliEngine constructor

## Tags
#giti #map #config #environment #bun #javascript

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
