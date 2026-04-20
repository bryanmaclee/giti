# giti — Master List

**Purpose:** Live inventory of the giti collaboration platform.

**Last updated:** 2026-04-20 (S5 — private scopes spec addendum)

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
- [ ][ ] **Web UI — status dashboard** — written in scrml (see policy below)
- [ ][ ] **Web UI — history timeline**
- [ ][ ] **Web UI — diff viewer + file browser**
- [ ][ ] **Web UI — landing dashboard** — compiler gate results, test results, landing queue
- [ ][ ] **Compile-on-serve pipeline** — Bun.serve compiles `ui/*.scrml` → dist, serves at `/`
- [ ][ ] **Auth + multi-repo** — user accounts, repo creation, access control (blocks non-local hosting)
- [ ][ ] **Deploy** — Fly.io or VPS (blocked on auth)
- [ ][ ] **GAP-1–11 implementations** — content-loss detection, protected contexts, `giti check`, granular undo
- [x][x] **Private scopes slice 1** (spec §12) — `.giti/private` manifest I/O, glob matching, `giti private {add,remove,list}` commands, `land` refusal on private diff, 40 tests
- [x][x] **Private scopes slice 2** — remote scope config (`.giti/remotes.json`), `giti remote {add,remove,set-scope,list}`, `giti link-private`, `giti sync --remote NAME`, push refusal on public remote when working copy has private changes, private→public scope flip requires `--unsafe`. 48 tests.
- [x][x] **Private scopes slice 3** — engine primitives (`setBookmark` with create-fallback, `bookmarkExists`, `changedFilesInRange`); save-time scope classification + bookmark routing (`main` + `_private`); mixed-commit refusal with clear error; commit-range-aware push safety. 33 new tests (22 routing + 11 engine).
- [x][x] **Private scopes slice 4** — engine `push({remoteName, bookmarks})` + `fetch({remoteName})` primitives; sync computes bookmarks-to-push from remote scope (public → [main], private → [main, _private]); `link-private` auto-creates `_private` bookmark at `bookmarks(main)`; `.giti/private` manifest un-ignored (rides `_private` via slice 3 routing). 16 new tests.
- [ ][ ] **Private scopes slice 5** (optional) — auto-split mixed working-copy, `giti private check/status`, real-jj integration tests, OQ-9 retroactive privatization
- [ ][ ] **Engine independence gate** — when scrml compiler does AST-level conflict resolution, revisit jj

### UI policy (S3)
- Web UI is **scrml-only** — no vanilla HTML/JS fallback
- Compiler bugs blocking the UI → P0 on scrmlTS (cross-repo escalation via user)
- See pa.md "compiler bug escalation path"

### giti-blocking compiler bugs

Batched escalation sent 2026-04-20 12:10 → `scrmlTS/handOffs/incoming/2026-04-20-1210-giti-to-scrmlTS-server-function-codegen-bugs.md`. Compiler version at send: `acc56be` (S32 phase 3c).

- **GITI-BLOCK-001** — `<request>` tag emits `fetch("", { method: "GET" })`; also: reactive receives unawaited Promise. Repro: `ui/repros/repro-01-request-minimal.scrml`
- **GITI-BLOCK-002** — `E-SCOPE-001` false positive on `import { x } from '.js'` used in a `server function` body (the import IS preserved in `.server.js` — just rejected at compile). Repro: `ui/repros/repro-02-js-import.scrml`
- **GITI-BLOCK-003** — server-only imports leak into `.client.js` (browser 500 on relative path)
- **GITI-BLOCK-004** — `lift <bare-expr>` inside a server function lowers to `_scrml_lift(() => document.createTextNode(...))` (server has no `document`). `lift ?{SQL}.all()` works because SQL has its own lowering.
- **GITI-BLOCK-005** — `${serverFn()}` in markup: fetch fires once at module top, result never wires to DOM. No working "render data from server function" idiom today.

**Status:** UI work parked pending fix. giti pivots to non-scrml features (private scopes §12).


### Cleanup (post-split)
- [ ][ ] Non-compliance audit
- [ ][ ] Cold project map

---

## F. Cross-repo

- **scrmlTS** — compiler gate target
- **scrml-support** — all giti research + history
- **scrml8** — frozen archive
