# error.map.md
# project: giti
# updated: 2026-06-22T00:00:00Z  commit: b2fde19

## Custom Error Types
No custom Error subclasses. All errors flow as { ok: false, error: string } result objects.
ok() and err() builders live in src/lib/result.scrml (compiled to src/lib/result.js).

## Friendly Error Catalog  [src/lib/friendly-error.scrml → src/lib/friendly-error.js]
| Code    | Trigger pattern                                                   | User-facing message (summary)                                       |
|---------|-------------------------------------------------------------------|---------------------------------------------------------------------|
| GIT-002 | /not a jj repo/i, /no jj repo/i, /not in a git repository/i     | "This directory is not a giti project. Run giti init."             |
| (merge) | /conflict/i (and not /resolved/i)                                | "Merge conflict detected. Run giti status."                         |
| GIT-001 | /no changes/i, /nothing changed/i                                | "Nothing to save. Your work is already captured."                   |
| (bmark) | /bookmark.*already exists/i                                      | "A bookmark named 'X' already exists."                              |
| (bmark) | /no such bookmark/i, /bookmark.*not found/i                      | "That bookmark does not exist. Run giti branches."                  |
| GIT-003 | /no such revision/i, /revset.*resolved to no revisions/i         | "No context called that name found."                                |
| (dirty) | /working copy.*uncommitted/i                                     | "You have uncommitted changes. Save your work first."               |
| GIT-010 | /authentication/i, /permission denied/i                          | "Could not connect to remote. Check credentials."                   |
| GIT-009 | /no remote/i, /no git remote/i                                   | "No remote repository is configured."                               |
| GIT-011 | /nothing to undo/i, /no operations/i, /operation log.*empty/i   | "Nothing to undo."                                                  |
| GIT-012 | /merge.*into itself/i, /same revision/i                          | "Cannot merge a context into itself."                               |
| GIT-008 | /no space left/i, /disk full/i, /ENOSPC/i                        | "Disk is out of space."                                             |
| ENOENT  | jj binary not found (spawn error)                                | "jj is not installed or not in PATH."                               |
| (long)  | stderr > 300 chars                                               | truncated to 297 chars + "..."                                      |
| (empty) | empty stderr                                                     | "An unknown error occurred."                                        |

## Landing / Check Gate Errors  [src/commands/land.js, src/commands/check.js]
| Code    | Condition                                                   | Exit behavior                                          |
|---------|-------------------------------------------------------------|--------------------------------------------------------|
| GIT-006 | conflicts detected before landing (engine.conflicts())      | stderr + process.exit(1)                               |
| GIT-004 | compiler exits non-zero (runCompiler)                       | "Your work did not land because the compiler found errors." + exit(1) |
| GIT-005 | tests exit non-zero (runTests)                              | "Your work did not land because the tests failed." + exit(1)         |
| (priv)  | private paths in landing diff (spec §12.3 #5)              | "Cannot land: your changes touch private paths." + exit(1)           |

## Sync / Save Errors  [src/commands/sync.js, src/commands/save.js]
| Condition                                         | Exit behavior                                              |
|---------------------------------------------------|------------------------------------------------------------|
| Push to public remote with private paths outgoing | "Cannot push: outgoing content includes private paths." + exit(1) |
| Mixed public+private files without --split        | "Cannot save: this change touches both public and private paths." + exit(1) |
| autoSplitSave stage failure                       | "giti save --split failed at the '<stage>' step:" + exit(1) |

## Error Handling Patterns
- Engine methods return { ok, data|error } — no exceptions propagate to callers
- Commands check result.ok, write to process.stderr, and process.exit(1) on failure
- jj subprocess errors caught in run() [src/engine/jj-cli.js]; ENOENT handled separately
- land.js checks private paths → conflicts → compiler → tests (fail-fast ordered)
- engine.save() failure during land is silently swallowed (treated as "no unsaved changes")
- Push failure containing "Nothing changed" is silently swallowed in sync.js

## Global Error Boundaries
HTTP server: startServer() throws Error("UI compile failed:\n...") on compile failure; caught in serve command and written to stderr + exit(1).
No React/Express error boundary patterns.

## Unhandled Error Risks
src/commands/land.js:133 — engine.save() failure on land is silently swallowed
src/commands/sync.js:191 — push error "Nothing changed" substring check is fragile; jj output wording may vary

## Tags
#giti #map #error #error-handling #jj #cli #scrml

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
