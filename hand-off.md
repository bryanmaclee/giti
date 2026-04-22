# giti — Session 8 Hand-Off

**Date:** TBD (next session)
**Previous session file:** `handOffs/hand-off-7.md`
**Next hand-off filename:** `handOffs/hand-off-8.md`

## Caught-up state (through S7)

- CLI: 10 commands, 1,079 LOC; 289 pass / 9 skip / 0 fail
- Spec `giti-spec-v1.md` ratified (1,531 lines)
- Bun HTTP API + `land` compiler gate + compile-on-serve + scrml per-file `fetch` composition (S3 + S6)
- **Web UI complete to the three-screen core**: Status / History / Bookmarks / Diff — all four pages live, CSRF bootstrap verified end-to-end, shared `theme.css` via HTML link injection (status keeps its own richer chrome)
- Engine: `engine.diffChange(id)` added in S7 for the diff viewer per-change selection
- Server instrumentation opt-in: `GITI_SERVER_LOG=1` on `giti serve` dumps request/response shapes

## S7 summary (10 commits, `186d820..0372411`)

1. `186d820` server instrumentation + GITI-010 first report
2. `84b0583` GITI-010 thread (filed → fixed upstream → verified live) + GITI-009 filed to scrmlTS
3. `bf92339` Web UI — history timeline (`ui/history.scrml`)
4. `fa857f5` Web UI — bookmarks (`ui/bookmarks.scrml`); three-tab nav
5. `f22662e` Shared `theme.css` + HTML `<link>` injection in `compileUi`
6. `3f85ba9` GITI-011 filed (scrml CSS parser mangles at-rules)
7. `0163915` Diff viewer v0 (`ui/diff.scrml`, working-copy diff)
8. `0372411` Diff viewer v1 — per-change selection via URL `?change=<id>`; new `engine.diffChange`

Compiler bugs outstanding in scrmlTS queue:
- **GITI-009** — relative-import forwarding. Workaround applied; runtime-confirmed. Sent 2026-04-22 0814.
- **GITI-011** — CSS at-rules mangled. Workaround only covers `@import` (HTML link injection); no workaround for `@media` / `@keyframes` / `@font-face`. Sent 2026-04-22 0841.
- **GITI-006** (cosmetic, S5) — bare `${@var.path}` module-top read; workaround in place.

Fixed this session (upstream, by scrmlTS):
- **GITI-010** — CSRF bootstrap (`Set-Cookie` on 403 + client one-shot retry). Commit `40e162b`, HEAD `adbc30c`.

Learned in S7 (scrml-author-facing, not yet documented anywhere):
- Server-fn args work end-to-end: `server function foo(bar)` → client serializes as POST body `{"bar": …}`.
- Compiler-internal `route.query` is NOT author-accessible (`E-SCOPE-001` on bare `route`). Read URL params client-side via `URLSearchParams(window.location.search)`.
- scrml client-side code can use browser globals (`window`, `URLSearchParams`, etc.) at module-top.
- `@import url(...)` inside a scrml `#{}` block mangles — workaround via HTML `<link>` injection in the host server.

## Inbox

- Clear on entry. S7 archived three scrmlTS threads into `handOffs/incoming/read/`:
  - `2026-04-22-0812-scrmlTS-to-giti-giti-010-fix-shipped.md`
  - `2026-04-22-0820-scrmlTS-to-giti-giti-010-timeline-correction.md`
- Three of our outbound messages still live in scrmlTS's inbox (their PA hasn't opened):
  - GITI-009 file (0814)
  - GITI-010 retraction (0805) — superseded but can't delete
  - GITI-011 file (0841)

## Session 8 priorities (suggested)

1. **Landing dashboard** — last `§E` web UI item. Reads from `giti land` flow: compiler gate results + test results + landing queue. Design choice: live-follow (websocket-ish) vs. poll on interval.
2. **Tests for `compileUi`'s copy + inject behavior** — currently untested. The static-CSS copy and the HTML head injection are both load-bearing now.
3. **GITI-009 / GITI-011 follow-up** — if scrmlTS replies, read + act. If no reply by mid-session, consider if a workaround PR in scrmlTS would unblock faster (probably not per per-repo PA rule).
4. **Private scopes slice 6** (optional) — `giti private check <pattern>` dry-run / real-jj harness / fetch-side `_private` auto-tracking / OQ-9 retroactive privatization.
5. **Theme maintenance** — status.scrml still has standalone chrome (~250 LOC of duplicated rules). Candidate for refactor once GITI-011 fix ships (so we can use `@media` responsive rules in theme.css).

## Known open items

- **GITI-006** (cosmetic) — workaround in place, no escalation planned.
- **GITI-009** / **GITI-011** — filed, awaiting scrmlTS.
- **Auth + multi-repo** (master-list §E) — blocks non-local hosting.
- **GAP-1–11** — CLI items (content-loss detection, protected contexts, `giti check`, granular undo).

## Not in scope unless user pushes

- Engine independence (§3.7 gate — stays jj-lib until scrml compiler does AST-level conflict resolution).
- Responsive design in the UI (blocked on GITI-011 for `@media`).
- Deploy target (blocked on auth).

## Session 8 work log

_(append as work completes)_
