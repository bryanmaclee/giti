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

- **2026-04-25 — slice 1 (commit `1eb143d`):** `compileUi` shared-CSS test coverage. Extracted `injectSharedCss({uiAbs, distAbs})` from `compileUi`; added `tests/compile-ui.test.js` (11 tests) covering copy rules, link order, multi-file, multi-page, missing dirs. Idempotency test caught real bug: re-running `compile-ui` (e.g. on every `giti serve` restart) prepended a duplicate `<link>`. Fixed by gating on substring presence. 296 → 307 pass.

- **2026-04-25 — incoming `2026-04-24-2245-scrmlTS-to-giti-s40-sql-and-lsp-landings.md`** archived to `read/`. `needs: fyi`. Summary: SQL codegen identifier rename `_scrml_db` → `_scrml_sql`, `.prepare()` removed (E-SQL-006), 3 placeholder fixes, LSP L1+L2+L3 live. **giti has zero SQL blocks, zero `.prepare()` — no impact.** But message-trigger recompile surfaced GITI-009 silently fixed upstream.

- **2026-04-25 — slice 2 (commit `2f84289`):** GITI-009 verified fixed; workaround removed. scrmlTS S40 silently shipped Option A (path rewrite) from the GITI-009 repro. Our four UI pages still carried the dist-relative workaround; the new rewrite double-shifted to `'../../../src/engine/index.js'` and crashed the server on bookmarks. Reverted source paths to true source-relative; emit now correct (`'../../src/engine/index.js'`). All 4 pages return 200 live. Verified against scrmlTS HEAD `7a91068`.

- **2026-04-25 — sent `2026-04-25-0706-giti-to-scrmlTS-giti-009-verified-fixed-and-s40-impact.md`** into scrmlTS inbox. `needs: fyi`. Confirmed GITI-009 fix verified, workaround removed, S40 SQL/LSP changes are no-ops for giti.

- **2026-04-25 — slice 3 (commit `bb9b885`):** Landing preflight dashboard. New `ui/land.scrml` reading the four `giti land` gates (private files, conflicts, compiler, tests) and rendering pass/fail per row + summary banner. Reuses `runCompiler` / `runTests` (newly exported from `src/commands/land.js`). "Land" tab added to nav across all 5 pages. Live HTTP smoke verified end-to-end (5 pages 200, server fn returns structured JSON). Two scrml codegen workarounds applied inline (filed as GITI-012 + GITI-013 in slice 4).

- **2026-04-25 — slice 4: GITI-011 verified fixed; GITI-012 + GITI-013 filed.**
  - Compiled `repro-07-css-at-rules.scrml` against `7a91068`: at-rules emit correctly. Workaround in `compileUi` (HTML link inject) is no longer required but kept as load-bearing infra; its removal is parked as a follow-up cleanup slice.
  - Filed **GITI-012**: `==` in server fn body emits `_scrml_structural_eq()` but the helper is not imported into `.server.js`. Repro at `ui/repros/repro-08-server-fn-eq.scrml`. Workaround: truthy/falsy checks (`!arr.length`, `!!flag`).
  - Filed **GITI-013**: Arrow body returning object literal (`f => ({...})`) loses wrapping parens in emit. Repro at `ui/repros/repro-09-arrow-object-literal.scrml`. Workaround: explicit for-loop + push.
  - Sent `2026-04-25-0728-giti-to-scrmlTS-giti-011-verified-fixed-and-two-new-bugs.md` + 2 sidecar repros into scrmlTS inbox.

- **2026-04-25 — incoming `2026-04-25-2310-...giti-009-acked-giti-011-already-fixed.md`** archived to `read/`. `needs: action` (acted by the slice 4 verification + repros). Disk copy was deleted out-of-band before I could process; staged the deletion since 2315 supersedes it.

- **2026-04-25 — incoming `2026-04-25-2315-...giti-009-011-acked-012-013-need-sidecars.md`** archived to `read/`. `needs: action`. They asked for sidecars but had crossed them in flight — sidecars were already in their `read/`. Sent confirmation: `2026-04-25-0732-giti-to-scrmlTS-sidecars-already-landed.md` (`needs: fyi`).

- **GITI-009 + GITI-011 are now CLOSED on scrmlTS side.** Outstanding: GITI-012, GITI-013 (filed, awaiting scrmlTS triage); GITI-006 (cosmetic, unchanged).

- **giti-side TODO surfaced**: `src/types/{branch,change,landing,repository,stack,typed-change}.scrml` use spec-illustrative future-syntax that current scrml doesn't accept — break the compiler gate of `giti land`. Heads-up sent to scrmlTS in 0728 message. Real fix on giti side: add a compiler-gate file filter or rewrite/remove the type files.
