# error.map.md
# project: giti
# updated: 2026-04-11T00:00:00Z  commit: 3c4a7c3

## Custom Error Types
No custom Error subclasses. All errors returned as { ok: false, error: string } result objects.

## Friendly Error Catalog  [src/engine/jj-cli.js — friendlyError()]
| Code    | Trigger pattern                              | User-facing message (summary)                         |
|---------|----------------------------------------------|-------------------------------------------------------|
| GIT-002 | /not a jj repo/i, /no jj repo/i, /not in a git repository/i | "This directory is not a giti project. Run giti init." |
| (merge) | /conflict/i (and not /resolved/)             | "Merge conflict detected. Run giti status."            |
| GIT-001 | /no changes/i, /nothing changed/i            | "Nothing to save."                                     |
| (bmark) | /bookmark.*already exists/i                  | "A bookmark named X already exists."                   |
| (bmark) | /no such bookmark/i, /bookmark.*not found/i  | "That bookmark does not exist. Run giti branches."     |
| GIT-003 | /no such revision/i, /revset.*resolved to no revisions/i | "No context called that name found."          |
| (dirty) | /working copy.*uncommitted/i                 | "You have uncommitted changes. Save your work first."  |
| GIT-010 | /authentication/i, /permission denied/i      | "Could not connect to remote. Check credentials."      |
| GIT-009 | /no remote/i, /no git remote/i               | "No remote repository is configured."                  |
| GIT-011 | /nothing to undo/i, /no operations/i, /operation log.*empty/i | "Nothing to undo."                        |
| GIT-012 | /merge.*into itself/i, /same revision/i      | "Cannot merge a context into itself."                  |
| GIT-008 | /no space left/i, /disk full/i, /ENOSPC/i    | "Disk is out of space."                                |
| ENOENT  | jj binary not found                          | "jj is not installed or not in PATH."                  |
| (long)  | stderr > 300 chars                           | truncated to 297 chars + "..."                         |
| (empty) | empty stderr                                 | "An unknown error occurred."                           |
| GIT-004 | compiler exit != 0 (land command)            | "Your work did not land because the compiler found errors." |
| GIT-005 | test exit != 0 (land command)                | "Your work did not land because the tests failed."     |
| GIT-006 | conflicts detected before land               | "Your work has conflicts that need to be resolved before landing." |

## Error Handling Patterns
- All engine methods return `{ ok: boolean, data? }` — no exceptions thrown to callers
- Commands call `engine.method()`, check `result.ok`, write to stderr and `process.exit(1)` on failure
- jj subprocess errors are caught in `run()` [src/engine/jj-cli.js:108]; ENOENT handled separately
- `land.js` checks conflicts before running compiler or tests (fail-fast ordering)
- Delete failure in `land()` is silently ignored (non-critical path)

## Global Error Boundaries
No Express/React error boundary patterns. CLI process exits on error via `process.exit(1)`.

## Unhandled Error Risks
src/commands/land.js:86  — `engine.save()` failure on land is silently swallowed ("No unsaved changes — that's fine") — could mask real errors
src/commands/sync.js:28  — push failure with "Nothing changed" substring check is fragile; jj output wording may vary

## Tags
#giti #map #error #error-handling #jj #cli

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
