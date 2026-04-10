# giti — Master List

**Purpose:** Live inventory of the giti collaboration platform.

**Last updated:** 2026-04-10 (S86 — initial split)

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
- [ ][ ] **Bun HTTP API** — giti commands as REST endpoints
- [ ][ ] **Web UI — history + status** — timeline view, diff viewer, file browser
- [ ][ ] **Web UI — landing dashboard** — compiler gate results, test results, landing queue
- [ ][ ] **Auth + multi-repo** — user accounts, repo creation, access control
- [ ][ ] **Deploy** — Fly.io or VPS
- [ ][ ] **Compiler gate in `land`** — wire scrmlTS compiler into landing validation
- [ ][ ] **GAP-1–11 implementations** — content-loss detection, protected contexts, `giti check`, granular undo
- [ ][ ] **Engine independence gate** — when scrml compiler does AST-level conflict resolution, revisit jj

### Cleanup (post-split)
- [ ][ ] Non-compliance audit
- [ ][ ] Cold project map

---

## F. Cross-repo

- **scrmlTS** — compiler gate target
- **scrml-support** — all giti research + history
- **scrml8** — frozen archive
