# giti — Master List

**Purpose:** Live inventory of the giti collaboration platform.

**Last updated:** 2026-04-22 (S7 — GITI-010 filed + fixed by scrmlTS (Option A) + verified live; GITI-009 confirmed at runtime)

---

## A. CLI (verified S86 in new location)

**Entry:** `src/cli.js`, bin name: `giti`
**Tests:** 88 pass (81 CLI + 7 jj integration)
**Engine:** jj-lib 0.40 wrapper

### Commands (all working)

- [x][x] `giti save [message]` — save current work
- [x][x] `giti switch <name>` — switch line of work
- [x][x] `giti merge <name>` — bring another line of work in
- [x][x] `giti undo` — undo last operation
- [x][x] `giti history` — show history
- [x][x] `giti status` — show changes
- [x][x] `giti land` — ship work (compiler + tests must pass)
- [x][x] `giti init` — initialize repo
- [x][x] `giti describe <hash> <msg>` — update save description
- [x][x] `giti sync` — push + pull

### Source files

- `src/cli.js`
- `src/commands/` — 10 files
- `src/engine/index.js`, `interface.js`, `jj-cli.js`

**Total:** 1,079 LOC

---

## B. Spec

- [x][x] `giti-spec-v1.md` — 1,531 lines, debate-ratified. AUTHORITATIVE.
  - 5-function surface (save/switch/merge/undo/history) over invisible jj-lib engine
  - jj conflict-as-data
  - Layered collaboration (Landing → Stack → TypedChange)
  - Real-time keystroke conflict detection
  - scrml state types for all forge entities
  - §3.7 engine independence gate

---

## C. Tests

- [x][x] `tests/cli.test.js` — 81 tests
- [x][x] `tests/jj-integration.test.js` — 7 tests

---

## D. Docs (repo-scoped)

- [x][x] `docs/gauntlet-teams/` — reference data from teams gauntlet

**All other giti research + friction audits + debates live in `scrml-support/docs/deep-dives/`:**
- `giti-vcs-model-2026-04-09.md`
- `giti-collaboration-primitive-2026-04-09.md`
- `giti-conflict-resolution-2026-04-09.md`
- `giti-radical-doubt-2026-04-09.md`
- `giti-design-constraints-from-friction-2026-04-10.md`
- `pa-agent-git-friction-audit-2026-04-10.md`
- `git-e-platform-2026-03-30.md` (historical — before rename to giti)

---

## E. Open work

### M4.1 — Hosted Forge (target: beta tester access)
- [x][x] **Bun HTTP API (read-only)** — `/api/health`, `/api/version`, `/api/status`, `/api/history` (S3)
- [x][x] **Bun HTTP API (local-dev writes)** — `/api/save`, `/api/switch`, `/api/merge`, `/api/undo` gated on `--local-dev`, bound 127.0.0.1 (S3)
- [x][x] **Compiler gate in `land`** — resolves `$SCRMLTS_PATH` or `../scrmlTS`, globs `.scrml`, skips when none (S3)
- [x][x] **Web UI — status dashboard** — `ui/status.scrml` (540 LOC) live end-to-end S7; CSRF bootstrap verified in browser after GITI-010 fix. All three loaders (status/history/bookmarks) render on first page load.
- [x][x] **Web UI — history timeline** — `ui/history.scrml` ships dedicated timeline page. `loadTimeline` server fn fetches 50 entries; CSRF bootstrap+retry verified via curl (S7).
- [x][x] **Web UI — bookmarks** — `ui/bookmarks.scrml` ships full bookmark listing including remote-tracking. `loadBookmarkList` server fn → `engine.listBranches`; CSRF bootstrap+retry verified (S7).
- [x][x] **Web UI — shared theme** — `ui/theme.css` (hand-written) carries shared chrome. `compileUi` copies it into `dist/ui/` and post-injects `<link rel="stylesheet" href="theme.css">` into every compiled HTML head before the per-page CSS link (cascade: theme = base, page = overrides). history/bookmarks trimmed to page-specific CSS only. status.scrml retains its own standalone chrome — compatible via later-in-cascade override. (Tried `@import url('theme.css')` inside scrml `#{}` first; scrml's CSS parser mangles at-rules — HTML link injection is the workaround.)
- [ ][ ] **Web UI — diff viewer + file browser**
- [ ][ ] **Web UI — landing dashboard** — compiler gate results, test results, landing queue
- [x][x] **Compile-on-serve pipeline** — Bun.serve compiles `ui/*.scrml` → dist, serves at `/` (S3)
- [x][x] **scrml per-file fetch composition** — `composeScrmlFetch` + `loadScrmlHandlers` wired into `createHandler`/`startServer`; first-match-wins, null falls through to `/api/*` (S6, commit `c530779`)
- [ ][ ] **Auth + multi-repo** — user accounts, repo creation, access control (blocks non-local hosting)
- [ ][ ] **Deploy** — Fly.io or VPS (blocked on auth)
- [ ][ ] **GAP-1–11 implementations** — content-loss detection, protected contexts, `giti check`, granular undo
- [x][x] **Private scopes slice 1** (spec §12) — `.giti/private` manifest I/O, glob matching, `giti private {add,remove,list}` commands, `land` refusal on private diff, 40 tests
- [x][x] **Private scopes slice 2** — remote scope config (`.giti/remotes.json`), `giti remote {add,remove,set-scope,list}`, `giti link-private`, `giti sync --remote NAME`, push refusal on public remote when working copy has private changes, private→public scope flip requires `--unsafe`. 48 tests.
- [x][x] **Private scopes slice 3** — engine primitives (`setBookmark` with create-fallback, `bookmarkExists`, `changedFilesInRange`); save-time scope classification + bookmark routing (`main` + `_private`); mixed-commit refusal with clear error; commit-range-aware push safety. 33 new tests (22 routing + 11 engine).
- [x][x] **Private scopes slice 4** — engine `push({remoteName, bookmarks})` + `fetch({remoteName})` primitives; sync computes bookmarks-to-push from remote scope (public → [main], private → [main, _private]); `link-private` auto-creates `_private` bookmark at `bookmarks(main)`; `.giti/private` manifest un-ignored (rides `_private` via slice 3 routing). 16 new tests.
- [x][x] **Private scopes slice 5** — `engine.split` + `engine.newChange` primitives; `giti save --split` auto-splits mixed WC into two commits (public + private) and advances main + _private accordingly; `giti private status` annotates pending changes by scope with bookmark-advance hints. 25 new tests.
- [ ][ ] **Private scopes slice 6** (optional) — `giti private check <pattern>` dry-run, real-jj integration harness, fetch-side `_private` auto-tracking, OQ-9 retroactive privatization
- [ ][ ] **Engine independence gate** — when scrml compiler does AST-level conflict resolution, revisit jj

### UI policy (S3)
- Web UI is **scrml-only** — no vanilla HTML/JS fallback
- Compiler bugs blocking the UI → P0 on scrmlTS (cross-repo escalation via user)
- See pa.md "compiler bug escalation path"

### giti-blocking compiler bugs

**Status (S6, 2026-04-21):** All originally blocking bugs now fixed by scrmlTS. UI work unblocked. One cosmetic issue (GITI-006) remains open.

Batch 1 — sent 2026-04-20 12:10 → `scrmlTS/handOffs/incoming/2026-04-20-1210-giti-to-scrmlTS-server-function-codegen-bugs.md`. Compiler version at send: `acc56be` (S32 phase 3c). All 5 fixed by scrmlTS commits `881b411` / `e585dba` / `e5f5b22` / `d23fd54`; verified PASS against current tip.

- [x][x] **GITI-BLOCK-001** — `<request>` tag emitted empty-URL fetch + unawaited promise in reactive. Repro: `ui/repros/repro-01-request-minimal.scrml`
- [x][x] **GITI-BLOCK-002** — `E-SCOPE-001` false positive on `import { x } from '.js'` inside server-function body. Repro: `ui/repros/repro-02-js-import.scrml`
- [x][x] **GITI-BLOCK-003** — server-only imports leaked into `.client.js`
- [x][x] **GITI-BLOCK-004** — `lift <bare-expr>` in server function lowered to `document.createTextNode` on the server
- [x][x] **GITI-BLOCK-005** — `${serverFn()}` in markup fired once at module top, never re-wired to DOM

Batch 2 — sent 2026-04-20 16:14 → `scrmlTS/handOffs/incoming/2026-04-20-1614-giti-to-scrmlTS-two-new-bugs-from-status-scrml.md`. Both fixed by scrmlTS commits `b8f3b51` + `3f79d71`.

- [x][x] **GITI-007** — CSS bare-tag descendant combinator (`nav a { }`) misparsed as `prop: ; selector { }`. Repro: `ui/repros/repro-04-css-bare-tag-compound.scrml`
- [x][x] **GITI-008** — lift-branch text tokens emitted as separate `createTextNode` calls, stripping whitespace ("Hello world" → "Helloworld"). Repro: `ui/repros/repro-03-lift-whitespace.scrml`

**Open (cosmetic only):**
- [ ][ ] **GITI-006** — markup `${@var.path}` emits a bare module-top `_scrml_reactive_get(...).value` that throws `undefined.path` before async reactive init resolves. Workaround: pre-seed `@state` with full default shapes. Applied in `ui/status.scrml`. Low-priority — filed as "ride or ticket, your call."

**Open (UI-blocking):**
- [ ][ ] **GITI-009** — scrmlTS forwards relative imports verbatim; source-relative paths don't resolve from compiled-output location. Confirmed at runtime S7: `bun run src/cli.js serve` throws `Cannot find module './repro-06-relative-imports-helper.js' from 'dist/ui/repro-06-relative-imports.server.js'`. Workaround applied in `ui/status.scrml` with `../../src/...` prefix. Repro: `ui/repros/repro-06-relative-imports.scrml` + `ui/repros/repro-06-relative-imports-helper.js`. Send to scrmlTS pending.
- [x][x] **GITI-010** — Compiler-emitted CSRF scheme was not bootstrappable. Filed S7 with live server-log trace + minimal repro (`ui/repros/repro-05-csrf-bootstrap.scrml`). scrmlTS shipped Option-A fix same session: server now `Set-Cookie`s on 403, client wraps every server-fn in `_scrml_fetch_with_csrf_retry` (single retry). Commit `40e162b`, scrmlTS HEAD `adbc30c`. Verified end-to-end via live `giti serve` browser trace S7: `403+Set-Cookie → 200` per call, three loaders complete on first page load. Out of scope: auth-middleware CSRF path (separate fix).

### Lesson from GITI-010 (narrow)
If recompilation-after-filing shows the bug gone, the fix may have just shipped on the upstream — check `git log` in scrmlTS for commits touching the relevant codegen since the report time before concluding the original report was wrong. GITI-010's 0805 "retraction" mis-attributed a fresh upstream fix (`40e162b`, pushed ~5 min earlier) as "bug was never there." scrmlTS explicitly flagged the self-flagellation as over-tuned; dated SHA-stamped reports are adequate and stale-dist is normal. The 0814 corrected ack supersedes both the retraction and the mis-framing.


### Cleanup (post-split)
- [ ][ ] Non-compliance audit
- [ ][ ] Cold project map

---

## F. Cross-repo

- **scrmlTS** — compiler gate target
- **scrml-support** — all giti research + history
- **scrml8** — frozen archive
