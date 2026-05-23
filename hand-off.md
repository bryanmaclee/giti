# giti — Session 10 Hand-Off

**Date:** TBD (next session)
**Previous session file:** `handOffs/hand-off-9.md`
**Next hand-off filename:** `handOffs/hand-off-10.md`

## Caught-up state (through S9)

- CLI: 11 commands; **337 pass / 0 fail** (S8 close: 316; +6 in 6.2, +15 in 6.3)
- Spec `giti-spec-v1.md` ratified (1,531 lines)
- Web UI complete (5 pages live, native `@import` shared theme)
- Private scopes 6.x (slice 6):
  - **6.1** `giti private check <pattern>` dry-run (S8)
  - **6.2** real-jj integration harness for the save-routing flow (S9) — 6 tests
  - **6.3** fetch-side `_private` auto-tracking on private-scoped pulls (S9) — 15 tests + 2 engine methods (`trackRemoteBookmark`, `remoteBookmarkExists`)

## S9 summary (2 commits, `48a7107..b9acda5`)

1. `48a7107` — slice 6.2: real-jj harness for the private flow (6 tests; +316 → 322)
2. `b9acda5` — slice 6.3: fetch-side `_private` auto-tracking (spec §12.5) — 2 engine methods + sync.js wiring + 15 tests (+322 → 337)

## Compiler bug ledger (status at S9 close)

| ID | Status | Notes |
|---|---|---|
| GITI-006 | open (cosmetic) | bare `${@var.path}` module-top read; workaround in place; no escalation |
| GITI-009 | CLOSED upstream (S8) | relative-import path rewriting; workaround removed |
| GITI-011 | CLOSED upstream (S8) | CSS at-rules; workaround removed |
| GITI-012 | **CLOSED (S10, verified against scrmlTS `cbfefef`)** | repro-08 compiles clean; `arr.length == 0` lowered to `===` (primitive shortcut); `bun --check` exits 0. Workarounds removed from `ui/land.scrml`. |
| GITI-013 | **CLOSED (S10, verified against scrmlTS `cbfefef`)** | repro-09 compiles clean; `items.map(f => ({...}))` emits `(f) => ({...})` with parens preserved; `bun --check` exits 0. Workaround (explicit for-loop + push) replaced with natural `.map()` form in `ui/land.scrml`. |
| GITI-014 | **OPEN — filed to scrmlTS S10** | Residual of GITI-013: zero-arg arrow `() => ({...})` returning object literal loses parens in **client-emit**. Compiler emits `_scrml_init_set("var", () => {obj})` instead of `() => ({obj})`. Affects every `@var = { ... }` reactive declaration. All 5 UI pages currently regress to empty defaults — `Uncaught SyntaxError: Unexpected token ':'` on every `.client.js`. Repro: `ui/repros/repro-10-zero-arg-arrow-object-init.scrml`. No author-level workaround. |

## Inbox

**Processed in S10:**
- ~~`2026-04-25-1100-scrmlTS-to-giti-s41-fixes-and-kickstarter.md`~~ — action complete; moved to `incoming/read/`. FYI sent back to scrmlTS as `2026-05-23-0543-giti-to-scrmlTS-giti-012-013-verified-closed.md`.

**Unread on entry:**
- `2026-04-26-0919-scrmlTS-to-giti-s42-close-fixes-and-kickstarter-v1.md` (`needs: fyi`) — scrmlTS S42 close at `b6eb0c3`. Five things affecting giti:
  1. **Kickstarter v1 supersedes v0** — v0 had 10 verified-wrong claims (real-time `room=`/`onmessage` invented, derived-decl `~name=`, `<if>`/`<for>` markup tags, `protect=` separator wrong, `signJwt` arity, `<request>` attrs, `.debounced(ms)` postfix, component `prop:Type` annotation). **Use v1 only**: `scrmlTS/docs/articles/llm-kickstarter-v1-2026-04-25.md`. Verification matrix at `scrmlTS/docs/audits/kickstarter-v0-verification-matrix.md`.
  2. **6 compiler bugs fixed** (A1–A6). **A5 in particular** had a silent-corruption mode: markup text starting with `function`/`fn` (e.g. `<p>function adds.</p>`) was auto-promoted to a logic block — paragraph text vanished from output with NO error. If any giti UI page ever seemed to render blank paragraphs that should have had text, re-pull and recompile.
  3. **F4 — agent tool-routing leak**: agents under `isolation: "worktree"` can write to absolute paths outside the worktree (no boundary at the tool layer). If giti's PA dispatches `scrml-dev-pipeline` agents, see scrmlTS pa.md "Worktree-isolation startup verification + path discipline" — paste-ready mitigation template.
  4. **8 new examples** in `scrmlTS/examples/15..22` covering channel-chat, RemoteData, schema migrations, state authority, lin tokens, middleware, navigation, multifile imports. Reference material for any new giti UI work.
  5. **A7/A8 intakes pending** upstream (component-def `${@reactive}` BLOCK_REF + `<select><option>` children). Not blocking giti today; flag if our UI hits the shape.

No outbound messages sent in S9. **No push request sent yet** for the two S9 commits — see "Pending decisions" below.

## Session 10 priorities (suggested)

1. **GITI-012 / GITI-013 verification** (top of stack — direct ask from scrmlTS S41):
   - Pull scrmlTS main locally (user-driven; this PA does not cross-edit scrmlTS).
   - Re-run `ui/repros/repro-08-server-fn-eq.scrml` and `ui/repros/repro-09-arrow-object-literal.scrml` against the new compiler shape.
   - If both green, drop the workarounds in calling code and update the bug ledger here.
   - Send a `needs: fyi` confirmation to scrmlTS once verified.
   - Move the S41 inbox message to `handOffs/incoming/read/` after acting.
2. **Theme dedupe in `status.scrml`** — still pending; ~250 LOC of chrome overlaps `theme.css`.
3. **Auth + multi-repo (master-list §E)** — blocks hosted forge.
4. **GAP-1–11 CLI items** — content-loss detection, protected contexts, `giti check`, granular undo.
5. **6.4 OQ-9 retroactive privatization** — open question / debate fodder.

## Pending decisions / surfacing-needed at S10 start

- **Push request to master.** S9 has 2 unpushed commits. S8's pattern was a `needs: push` message dropped at session close. S10 PA should ask the user before sending one (per pa.md commit/push rules — push is gated on user authorization).
- **License selection.** User stated S9: "as long as i can charge for using giti according to what the license says we're good." No LICENSE file or `license` field in `package.json` yet — currently default copyright (all rights reserved). Needs a deliberate choice before any external distribution. Permissive (MIT/Apache-2.0) is the obvious default for "anyone can charge"; a source-available + commercial option (BUSL-1.1, FSL, Elastic) is another shape if the user wants a moat.
- **LLM kickstarter (FYI from scrmlTS S41 + S42 close).** **Use v1, not v0** — `scrmlTS/docs/articles/llm-kickstarter-v1-2026-04-25.md` (v0 had 10 verified-wrong claims; full matrix in `kickstarter-v0-verification-matrix.md`). Paste v1 when dispatching dev agents to write scrml UI code.

## Known open items

- **GITI-006** (cosmetic) — workaround in place
- **GITI-012, GITI-013** — fixes shipped upstream; awaiting verification (S10 priority 1)
- **Auth + multi-repo** (master-list §E) — blocks hosted forge
- **GAP-1–11** — CLI items
- **OQ-9** retroactive privatization — open spec question
- **License selection** — pending

## Not in scope unless user pushes

- Engine independence (§3.7 gate — stays jj-lib until scrml compiler does AST-level conflict resolution)
- Deploy target (blocked on auth)
- Live-follow / WebSocket-y dashboard updates

## Session 10 work log

### Slice 1 — GITI-012 / GITI-013 verification + workaround removal

Verified against scrmlTS `cbfefef` (current main, ~S122).

- `repro-08-server-fn-eq.scrml` compiles clean; emitted server-fn shows `arr.length === 0` (primitive `==` lowered per S41 fix layer-a). `bun --check` exits 0. No `_scrml_structural_eq` reference at all.
- `repro-09-arrow-object-literal.scrml` compiles clean; arrow body emits as `(f) => ({path: f.path, kind: f.kind})` with parens preserved (S41 fix `0af4eaf`). `bun --check` exits 0.
- `ui/land.scrml` workarounds removed:
  - For-loop + push → natural `privChanged.map(f => ({ path: f.path, kind: f.kind }))`
  - Stale workaround comments deleted; `!privChanged.length` and `!!skipped` kept (idiomatic JS, not workarounds per se)
- `npm test` after edit: 324 pass / 15 skip / 0 fail (no regressions; JS tests don't depend on scrml recompile)
- Bug ledger updated above

### Finding: pre-existing UI compile drift

All 5 UI pages (`status`, `history`, `bookmarks`, `diff`, `land`) currently FAIL to compile against scrmlTS `cbfefef` due to `E-SYNTAX-042: null is not a scrml token` — scrml tightened the spec to require `not` for absence (§42.7) during the ~80-session gap between giti S9 and now. Each page has 2–3 `null` literals (`error: null` defaults, `return { error: null }` in server fns). **Not introduced by today's edit** — surfaced because today's recompile is the first since S8. Filed as **DRIFT-1** in master-list; separate slice.

### Slice 2 — DRIFT-1 sweep

Mechanical sed substitution `: null` → `: not` across all 5 UI files (18 sites). All 5 now compile clean against scrmlTS `cbfefef`. JS tests unchanged: 324 pass / 15 skip / 0 fail. Only residual `null` is in a JSDoc comment describing a JS-side URL-param type (`string | null`) — left as-is since it documents the JS-side `URLSearchParams.get()` return value, not a scrml token.

### Slice 3 — end-to-end serve verification + GITI-014 discovery

1. Installed jj 0.41.0 via homebrew (giti's wrapper built against 0.40 — minor bump). `jj git init --colocate` on the giti repo.
2. `giti serve` boots clean across 14 .scrml files. Probed all 5 page server-fns via curl with CSRF flow — all return well-formed JSON with real jj data (history shows commits, bookmarks shows main + @git + @origin, etc.).
3. **Browser verification REGRESSED**: all 5 pages show empty defaults. Console error: `Uncaught SyntaxError: Unexpected token ':'` on every `.client.js`. Root cause: residual of GITI-013 — zero-arg arrow `() => ({...})` for reactive-state init lambdas loses parens in client-emit. Filed as GITI-014 with minimal repro `ui/repros/repro-10-zero-arg-arrow-object-init.scrml`. Sent to scrmlTS as `2026-05-23-0600-giti-to-scrmlTS-giti-014-zero-arg-arrow-object-init.md`.
4. **State while waiting on fix**: server-side is fully functional (curl confirms real data); only the client bundle parse fails. Pages will hang on empty defaults until GITI-014 lands upstream.

### Slice 4 — GAP-6 `giti check` shipped

New CLI command per spec §9.6, dry-run validation for `giti land`. User direction: continue non-UI work while waiting on GITI-014; we're dogfooding scrml + building the ecosystem.

- `src/commands/check.js` (new, 90 LOC). Reuses `runCompiler` + `runTests` from `land.js` (no pipeline duplication) and `parseStatus` for `--diff`.
- Flags: default = compiler + tests; `--quick` = compiler only; `--diff` = list .scrml files changed in WC (no compile/test).
- Exit codes per spec normative #4: 0 on pass, 1 on failure.
- Injectable runners (`check.setRunners({ runCompiler, runTests, getEngine })`) for testability — same pattern as `land`.
- Wired into `src/cli.js` (15th command); help text updated.
- Tests: `tests/check.test.js` — 13 tests covering 4 happy paths, 4 failure paths, --quick path-isolation, --diff filtering + kind labels.
- Smoke-tested end-to-end:
  - `giti check --diff` → "No .scrml files changed." (matches WC state)
  - `giti check --quick` → "Compiler: pass (15 files) — Check passed (compiler only…)" against scrmlTS `cbfefef`. Exit 0.
- **Test count**: 350 pass / 0 fail / 0 skip (up from 324 / 15 skip — +13 new check tests + jj-integration tests now running since jj is installed).

### Slice 5 — GAP-8 `giti history --since`

Spec §2.5 normative #6 — time-window filter for history.

- `src/commands/history.js` extended with `parseDuration` + `parseTimestamp` exports (pure helpers, no engine dep) and a `--since <duration>` flag on the CLI.
- Durations: `30m` / `2h` / `1d` / `7d` (regex `^(\d+)(m|h|d)$`, must be positive). Other units rejected with examples in the error.
- When `--since` is set: fetch up to 1000 entries from engine (`SINCE_FETCH_CAP`), filter client-side using `parseTimestamp` on the `YYYY-MM-DD HH:MM` strings the jj template emits. Entries with unparseable timestamps drop silently.
- Friendly empty-result: `"No saves in the last 2h."` (vs the unfiltered default's "No history yet.").
- `tests/history.test.js` (new) — 21 tests: 10 parseDuration cases, 2 parseTimestamp cases, 9 CLI integration cases (window inclusion, day-boundary, bad input, empty result, fetch cap, garbage-timestamp handling).
- Smoke-test against the live giti repo: `--since 1h` drops the S9 hand-off entry from 2026-04-26, keeps all 6 of today's S10 saves.
- **Test count**: 371 pass / 0 fail (up from 350; +21 history tests).

