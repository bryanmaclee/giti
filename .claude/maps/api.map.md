# api.map.md
# project: giti
# updated: 2026-04-11T00:00:00Z  commit: 3c4a7c3

## CLI Command Surface

This project is a CLI tool, not an HTTP API. The command surface is the public API.
All commands are registered in src/cli.js and dispatched via `command(args.slice(1))`.

| Command                      | File                        | Args                      | Effect                                                   |
|------------------------------|-----------------------------|---------------------------|----------------------------------------------------------|
| giti save [message]          | src/commands/save.js        | optional freeform string  | Describes current change in jj, creates new empty change |
| giti switch [name]           | src/commands/switch.js      | optional bookmark name    | Switches to bookmark; creates if missing; lists if no arg |
| giti merge <name>            | src/commands/merge.js       | required bookmark name    | jj new @ bookmarks(name) — merge commit                  |
| giti undo                    | src/commands/undo.js        | none                      | jj undo — reverts last operation                         |
| giti history [limit]         | src/commands/history.js     | optional integer limit    | Shows last N changes (default 20)                        |
| giti status                  | src/commands/status.js      | none                      | Parses jj status; shows changed files, conflicts, bookmark |
| giti land [message]          | src/commands/land.js        | optional freeform string  | Conflict check → compiler gate → test gate → save + merge to main |
| giti init [path]             | src/commands/init.js        | optional directory path   | jj git init in path (default: cwd)                       |
| giti describe <hash> <msg>   | src/commands/describe.js    | change hash + message     | jj describe target -m message                            |
| giti sync                    | src/commands/sync.js        | none                      | jj git fetch then jj git push                            |
| giti --help / -h             | src/cli.js                  | none                      | Prints HELP string                                        |
| giti --version / -v          | src/cli.js                  | none                      | Prints "giti 0.1.0"                                      |

## Engine Internal API (JjCliEngine methods)  [src/engine/jj-cli.js]

| Method                          | jj command(s)                              | Returns (data shape)                         |
|---------------------------------|--------------------------------------------|----------------------------------------------|
| init(path?)                     | jj git init                                | { path: string }                             |
| save(message?)                  | jj describe -m; jj new; jj log            | { changeId: string, description: string }    |
| listBranches()                  | jj bookmark list --all-remotes             | { name, info, active }[]                     |
| switchTo(name)                  | jj edit bookmarks(name) [fallback: jj edit name] | { name: string }                      |
| createBranch(name)              | jj bookmark create name                    | { name: string }                             |
| merge(name)                     | jj new @ bookmarks(name)                   | { merged: string }                           |
| undo()                          | jj undo                                    | { undone: true }                             |
| history(limit=10)               | jj log --no-graph -n N -T <template>       | { changeId, description, author, timestamp }[] |
| status()                        | jj status                                  | { raw: string }                              |
| conflicts()                     | jj status (parsed)                         | { hasConflicts: boolean, files: string[] }   |
| diff(target?)                   | jj diff [--from target]                    | string (raw diff)                            |
| land(bookmark, opts?)           | jj bookmark set target --to bookmarks(bm); jj bookmark delete bm | { landed, onto } |
| _rawDescribe(target, message)   | jj describe target -m message              | { ok, data }                                 |
| _rawSync(direction)             | jj git fetch / jj git push                 | { ok, data }                                 |

## Auth
No authentication. CLI operates on local jj repository. Remote auth delegated to jj/git credential store.

## Tags
#giti #map #api #cli #commands #jj #engine

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
