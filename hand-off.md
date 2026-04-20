# giti — Session 5 Hand-Off

**Date:** 2026-04-20
**Next hand-off filename:** `handOffs/hand-off-5.md`

## Caught-up state (from sessions 1-4)
- Split from scrml8 complete; CLI: 10 commands, 1,079 LOC, jj-lib 0.40 wrapper
- Spec: `giti-spec-v1.md` ratified, 1,531 lines
- S3: Bun HTTP API (read + local-dev writes), `land` compiler gate, compile-on-serve pipeline, static `ui/status.scrml` shell — 118 tests pass
- **GITI-BLOCK-001:** `<request>` state machine not wired to route fetch — all client-side data fetching broken. Repro at `ui/repros/repro-01-request-minimal.scrml`. Secondary issues observed but not minimized.
- S4: hand-off rotated but no substantive work recorded

## Inbox
- No incoming messages

## Pending from S3/S4
- ~~Dropbox escalation to scrmlTS for GITI-BLOCK-001 drafted but NOT sent~~ — SENT S5 (2026-04-20 12:10) as batched bug report covering GITI-BLOCK-001 through 005

## Session 5 work

### Private scopes spec addendum (giti-spec-v1.md)
New **§12 Private Scopes** — addresses user-voiced frustration: public repo + local private files (user-voice, hand-off, .agents) vs. multi-machine sync. Model chosen: **parallel private history** (two bookmarks, `main` + `_private`, sharing one working copy), **remote scope** (`public`/`private`), **path scope manifest** at `.giti/private`. Public push filters to `main` only; private remote gets both. Land refuses to ship a diff touching private paths. Retroactive public-history scrubbing deferred to **OQ-9**.

Changes:
- `giti-spec-v1.md` §1.4 table: added `.gitignore + "private repo for secrets"` → Private scopes row
- `giti-spec-v1.md` §3.5: fixed pre-existing xref (`Section 12: Migration` → `Section 11`)
- `giti-spec-v1.md` §9.8 new CLI block: `giti private {add,remove,list}`, `giti remote {add,set-scope,list}`, `giti link-private`
- `giti-spec-v1.md` §12 new section (7 subsections: motivation, model, push/pull, marking, bootstrap, safety rails, engine interaction)
- `giti-spec-v1.md` §13 renamed from §12 Open Questions; added OQ-9 (retroactive private migration)
- `master-list.md` — new open-work item for private scopes implementation

Not yet implemented — spec-only for now.

### Dropbox escalation to scrmlTS (SENT S5)
Batched bug report: GITI-BLOCK-001 (re-verified against current `acc56be` scrmlTS — partially better but `<request>` tag still emits empty-URL fetch, unawaited promise in reactive), plus new GITI-BLOCK-002/003/004/005 surfaced by minimal `import { x } from '.js' + server function + lift` probe (`ui/repros/repro-02-js-import.scrml`). Message: `/home/bryan/scrmlMaster/scrmlTS/handOffs/incoming/2026-04-20-1210-giti-to-scrmlTS-server-function-codegen-bugs.md`.

Also logged in master-list.md "giti-blocking compiler bugs" — pending update.

### UI work parked
UI blocked on scrmlTS fixes. User directive: "I dont want to waste time and tokens on something we WILL rewrite for sure." Pivoting to private scopes implementation (non-scrml, pure CLI + engine work).

### Private scopes slice 1 — LANDED
- `src/private/scope.js` (218 LOC) — manifest I/O (`loadPrivateManifest`, `savePrivateManifest`), path normalization, glob matching (`*`, `**`, `?`, `[abc]`, trailing `/`, literal-dir prefix), `isPrivatePath`, `partitionByScope`, `addPrivatePattern`, `removePrivatePattern`, `globToRegExp`. Implicit self-pattern: `.giti/private` is always private without being written.
- `src/commands/private.js` (91 LOC) — `giti private {add,remove,list}` + usage
- `src/cli.js` — registered `private` command and help entry
- `src/commands/land.js` — safety rail: `land` refuses when working-copy changes include private paths (spec §12.3 normative #5). Early-return before compiler/tests run.
- `tests/private.test.js` (303 LOC, 40 tests) — manifest I/O, glob matching (8 cases), partition, add/remove idempotence, CLI stdout/stderr capture, exit-code behavior

**Test status:** `bun test` → 158 pass / 9 skip / 0 fail (up from 118 pass at S3). 5 test files.

**NOT in slice 1 (deferred to slice 2):**
- Parallel `_private` jj bookmark plumbing
- Remote scope config (`giti remote add`, `giti remote set-scope`)
- Push filter at sync time
- `giti link-private <url>`
- Automatic save-routing of private changes to `_private` (save currently does NOT route by scope; the safety rail only fires at `land` time)

### Live manifest on this repo
Per user request, added to `.giti/private`: `user-voice.md`, `hand-off.md`, `handOffs/`, `.claude/`. No enforcement yet at save time; the safety rails fire at `land` and `sync --push` (see slice 2).

### Private scopes slice 2 — LANDED
- `src/private/remotes.js` (127 LOC) — JSON config at `.giti/remotes.json`, I/O is tolerant of missing/corrupt files. `addRemote`, `removeRemote`, `setRemoteScope` with private→public refusal unless `{unsafe:true}`; `listRemotes`, `getRemote`.
- `src/commands/remote.js` (107 LOC) — `giti remote {add, remove, set-scope, list}` with `--public`/`--private`/`--unsafe` flags.
- `src/commands/link-private.js` (56 LOC) — `giti link-private <url> [--name NAME]`; registers a private remote (defaults to name "private") and tells user to pull.
- `src/commands/sync.js` (rewritten, 124 LOC) — `parseSyncArgs`, `resolveTargetRemote`, `checkPushSafety` extracted as pure helpers. Sync now:
  - Accepts `--remote NAME`, `--push`, `--pull` flags
  - Auto-selects the only remote when there's one configured; errors on ambiguity
  - Before push to a **public** remote: refuses if working-copy changes touch any private path (spec §12.3 #4 — for working-copy changes; commit-range analysis deferred to slice 3)
- `src/cli.js` — `remote` and `link-private` registered; help updated
- `tests/remote.test.js` (350 LOC, 48 tests) — config I/O, scope change safety, CLI subcommands, sync helpers, sync end-to-end with mocked engine
- `.gitignore` — added `.giti/remotes.json` (per-machine state)

**Test status:** 206 pass / 9 skip / 0 fail (up from 158 at slice 1 finish). 6 test files.

**Slice 2 coverage of §12.3 normative statements:**
- [x] #1 `sync --push <remote>` pushes public stream to public remote (covered — no `_private` bookmark yet so all of `main` is "public stream")
- [~] #2 private remote receives both streams (partial — sync allows the push, but `_private` bookmark itself doesn't exist yet → slice 3)
- [x] #4 refuse private paths on public push (working-copy check implemented; precise commit-range check → slice 3)
- [x] #5 `land` refuses private diff (done slice 1)
- [x] #6 private→public scope flip requires `--unsafe`

**Still deferred to slice 3:**
- `_private` parallel jj bookmark (create, advance on private-only saves, merge-commit on mixed)
- Auto-routing private changes at save-time (currently user has to manage this themselves)
- Precise commit-range private-path detection on push (currently only working-copy)
- `giti sync --pull` behavior specifically for private remotes (actually fetching `_private` refs)
- Safety rail #1 strict form: split commits that mix public + private paths

### Private scopes slice 3 — LANDED
- `src/engine/interface.js` — added `setBookmark`, `bookmarkExists`, `changedFilesInRange` to the engine contract
- `src/engine/jj-cli.js` — implemented each: `setBookmark` tries `jj bookmark set --to --allow-backwards`, falls back to `jj bookmark create --revision` if the bookmark doesn't exist; `bookmarkExists` uses `jj bookmark list NAME`; `changedFilesInRange` uses `jj diff --summary -r <range>` and parses the same `[MAD] path` format as `parseStatus`
- `src/private/save-routing.js` (82 LOC) — `classifyChanges` (scope: public | private | mixed | empty), `classifyFromStatus`, `planBookmarkMoves` (public advances main + _private together; private advances only _private; mixed/empty advances nothing), `advanceBookmarks` (non-fatal per-bookmark results)
- `src/commands/save.js` — scope classification before save; **mixed save is refused** (clear error listing the two buckets); private-only and public-only saves auto-advance the right bookmarks via `setBookmark`; bookmark-move failures are reported but don't fail the save; scope tag `[private]` appears in save output for private saves
- `src/commands/sync.js` — `checkPushSafety` now unions working-copy AND commit-range private-path checks (commit-range uses `engine.changedFilesInRange("<remote>/main..main")`, deduplicated with commit-source winning); commit-range errors (first push, no tracker) are non-fatal; engine without `changedFilesInRange` falls back gracefully
- `tests/save-routing.test.js` (272 LOC, 22 tests) — classification, bookmark planning, advance-with-failure, save end-to-end (public/private/mixed-refused/empty/bookmark-fail/status-fail), sync commit-range + dedup + backward compat
- `tests/cli.test.js` — +11 tests for engine primitives (setBookmark success + fallback + double-fail + empty-name; bookmarkExists true/false/error; changedFilesInRange parse + empty + noise-filter + empty-range)

**Test status:** 239 pass / 9 skip / 0 fail across 7 files (from 206 at slice 2).

**§12 coverage after slice 3:**
- [x] §12.2 two-stream model via bookmarks (`main` + `_private` on shared WC) — modeled at save time
- [x] §12.3 #4 refuse private paths on public push (now precise: working-copy + commit-range)
- [x] §12.3 #5 land refusal (slice 1)
- [x] §12.3 #6 scope-flip safety (slice 2)
- [x] §12.4 add/remove path patterns
- [x] §12.6 safety rails: #1 no private on main, #4 manifest implicitly private
- [~] §12.5 link-private exists; full bootstrap flow (clone-public + link-private + sync-pull) not yet end-to-end tested against a real jj
- [ ] Auto-split of mixed commits (deferred; slice 3 refuses them instead with clear error)

**Slice 4 candidates (not scheduled):**
- Auto-split of mixed working-copy at save time (paths-based `jj split`)
- `giti private check <pattern>` — preview which tracked files a new glob would mark
- `giti private status` — show scope annotations on changed files
- Real-jj integration tests (requires `jj` in CI)
- Spec §12 OQ-9 retroactive privatization (requires history rewrite plumbing)
