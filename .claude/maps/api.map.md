# api.map.md
# project: giti
# updated: 2026-07-15T16:04:15-06:00  commit: 513ef41

## CLI Command Surface (15 commands)
All registered in src/cli.js and dispatched via `command(args.slice(1))`.

| Command                           | File                          | Args / Flags                                 | Effect                                                                |
|-----------------------------------|-------------------------------|----------------------------------------------|-----------------------------------------------------------------------|
| giti save [message]               | src/commands/save.js          | optional freeform string; --split            | Describe+new in jj; auto-message from changed files; scope-aware bookmark advance |
| giti switch <name>                | src/commands/switch.js        | required bookmark name                       | jj edit bookmarks(name)                                               |
| giti merge <name>                 | src/commands/merge.js         | required bookmark name                       | jj new @ bookmarks(name) — merge commit                               |
| giti undo                         | src/commands/undo.js          | none                                         | jj undo — reverts last operation                                      |
| giti history [--since <dur>]      | src/commands/history.js       | --since 30m|2h|1d|7d                         | Shows last N changes, filtered by duration window                     |
| giti status                       | src/commands/status.js        | none                                         | Parses jj status; shows changed files, conflicts, bookmark            |
| giti land [message]               | src/commands/land.js          | optional freeform string                     | Private-path check → conflict check → compiler gate → test gate → save + merge to main |
| giti init [path]                  | src/commands/init.js          | optional directory path                      | jj git init at path (default: cwd)                                    |
| giti describe <hash> <msg>        | src/commands/describe.js      | change hash + message                        | jj describe target -m message                                         |
| giti sync [--remote N] [--push] [--pull] | src/commands/sync.js   | --remote <name>; --push; --pull              | fetch + push with scope-aware safety and bookmark targeting           |
| giti serve [--port N] [--local-dev] | src/commands/serve.js       | --port N; --local-dev                        | Compile UI → start Bun HTTP server on 127.0.0.1 (default 3737)       |
| giti private <sub> [args]         | src/commands/private.js       | add|remove|check|list|status                 | Manage .giti/private glob patterns                                    |
| giti remote <sub> [args]          | src/commands/remote.js        | add|remove|set-scope|list                    | Manage .giti/remotes.json entries                                     |
| giti link-private <url>           | src/commands/link-private.js  | required URL                                 | Register a private remote and configure tracking                      |
| giti check [--quick|--diff]       | src/commands/check.js         | --quick (compiler only); --diff (list scrml) | Dry-run land validation without landing                               |

## HTTP REST Endpoints  [src/server/index.js]
Server always binds 127.0.0.1. Write endpoints require `localDev: true`.

| Method | Path             | Auth         | Notes                                                                |
|--------|------------------|--------------|----------------------------------------------------------------------|
| GET    | /health          | none         | Returns { ok: true, localDev }                                       |
| GET    | /version         | none         | Returns { version: "0.1.0" }                                         |
| GET    | /api/status      | none         | Calls engine.status(); returns parseStatus result                    |
| GET    | /api/history     | none         | Calls engine.history(limit); ?limit= param (default 20)              |
| POST   | /api/save        | localDev     | Body: { message? }; calls engine.save()                              |
| POST   | /api/switch      | localDev     | Body: { name }; calls engine.switchTo()                              |
| POST   | /api/merge       | localDev     | Body: { name }; calls engine.merge()                                 |
| POST   | /api/undo        | localDev     | No body; calls engine.undo()                                         |
| GET    | /*               | none         | Static file serving from ui/dist/ (7 compiled scrml pages)          |
| WS     | /_scrml_ws/<ch>  | none         | §38 channel WebSocket upgrade routes from scrml UI pages             |

scrml-generated /_scrml/* routes (from ui/dist/*.server.js) run first; first non-null Response wins.
SSE routes (from feed.scrml) are emitted as GET routes under /_scrml/__ri_route_*.

## scrml UI server-fn idiom (S18 — the shape that produces *.server.js)
The compiled `*.server.js` handlers above are lowered from `server function` / `server function*` bodies
in ui/*.scrml. As of S18 (scrml @7d5fda26, §19.9.8) the canonical body shape is:
    import { safeCallAsync } from "scrml:host"
    const res = safeCallAsync(() => engine.X()) !{ | ::Thrown(msg) :> ({ ok: false, error: msg }) }
Source-level `await` is now a HARD compile error (`E-AWAIT-NOT-IN-SCRML`); the compiler AUTO-AWAITS
`safeCallAsync` inside a server-fn body. No ui/*.scrml server fn uses `await`. Each of the 8 endpoint
handlers' underlying engine call flows through this failable, so a JS-host throw becomes an
`{ ok:false, error }` payload instead of a 500 — same Result contract the HTTP layer already returns.

## JjCliEngine Internal Methods  [src/engine/jj-cli.js, src/engine/interface.js]
All return { ok: true, data } or { ok: false, error }.

| Method                      | jj command(s)                                       | data shape                                              |
|-----------------------------|-----------------------------------------------------|---------------------------------------------------------|
| init(path?)                 | jj git init                                         | { path: string }                                        |
| save(message?)              | jj describe -m; jj new; jj log                      | { changeId: string, description: string }               |
| listBranches()              | jj bookmark list --all-remotes                      | { name, info, active }[]                                |
| switchTo(name)              | jj edit bookmarks(name) [fallback: jj edit name]    | { name: string }                                        |
| createBranch(name)          | jj bookmark create name                             | { name: string }                                        |
| merge(name)                 | jj new @ bookmarks(name)                            | { merged: string }                                      |
| undo()                      | jj undo                                             | { undone: true }                                        |
| history(limit=10)           | jj log --no-graph -n N -T <template>                | { changeId, description, author, timestamp }[]          |
| status()                    | jj status                                           | { raw: string }                                         |
| conflicts()                 | jj status (parsed)                                  | { hasConflicts: boolean, files: string[] }              |
| diff(target?)               | jj diff (working copy or target revision)           | { raw: string } (raw unified diff text)                 |
| diffChange(changeId)        | jj diff -r changeId (change vs its parent)          | { raw: string } (raw unified diff text)                 |
| setBookmark(name, target)   | jj bookmark set name --to target                    | (varies)                                                |
| bookmarkExists(name)        | jj bookmark list filtered                           | boolean                                                 |
| changedFilesInRange(range)  | jj diff --stat (revset range)                       | { kind, path }[]                                        |
| push(opts)                  | jj git push [--remote N] [--bookmark B...]          | (varies)                                                |
| fetch(opts)                 | jj git fetch [--remote N]                           | (varies)                                                |
| split(opts)                 | jj split (paths, message, revision)                 | (varies)                                                |
| newChange()                 | jj new                                              | (varies)                                                |
| files()                     | jj files (at working copy)                          | string[]                                                |

## Tags
#giti #map #api #cli #commands #jj #engine #http #scrml #safecall

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
