# giti — Session 6 Hand-Off

**Date:** 2026-04-21
**Previous session file:** `handOffs/hand-off-5.md`
**Next hand-off filename:** `handOffs/hand-off-6.md`

## Caught-up state (from sessions 1–5)
- CLI: 10 commands, 1,079 LOC, jj-lib 0.40 wrapper
- Spec `giti-spec-v1.md` ratified (1,531 lines)
- S3: Bun HTTP API + `land` compiler gate + compile-on-serve + static `ui/status.scrml` shell
- S5: Private scopes §12 slices 1–5 shipped (280 tests pre-wrap), `ui/status.scrml` iter 3 landed (536 LOC, clean compile), 5 compiler bugs filed + 5 fixed by scrmlTS, 2 more filed (GITI-007, GITI-008)

## S5 wrap was interrupted — uncommitted work carried into S6

At end of S5 an S35 reply landed from scrmlTS and work began integrating it, but neither commit nor hand-off.md update happened before session end.

**Uncommitted changes (working tree, clean — all tests pass):**
- `src/server/index.js` — `composeScrmlFetch(handlers)`, `loadScrmlHandlers(distDir)`, `createHandler({scrmlHandlers})`, and `startServer` now auto-discovers and chains scrml-generated `fetch` exports. `scrmlResponse ?? /api/*` fallthrough wired in the dispatcher.
- `tests/server.test.js` — +9 tests (composeScrmlFetch empty/match/fallthrough; createHandler scrml-precedence/null-fallthrough/backward-compat; loadScrmlHandlers missing-dir/fetch-import/skips-no-fetch)
- `.giti/private` — manifest (untracked; per §12.6 normative — the manifest itself is implicitly private and rides `_private`)
- `handOffs/incoming/read/2026-04-20-1900-scrmlTS-to-giti-s35-bugs-plus-mount-verdict.md` — S35 reply (already moved to read/, untracked)

**Test status:** 289 pass / 9 skip / 0 fail across 9 files (up from 280 at S5 close — confirmed locally 2026-04-21).

## Inbox
- Clear. S5 scrmlTS verdict + S6 master pa.md-updates message both archived to `handOffs/incoming/read/`. Reply to master sent.

## Pending from scrmlTS's S35 reply (design-insight 22)
Three asks:
1. **Re-verify GITI-007 + GITI-008** on `ui/status.scrml` against current scrmlTS tip (fixes in commits `3f79d71` + `b8f3b51`)
2. **Try the one-line composition** `scrml(req) ?? myApi(req)` — ALREADY DONE in the uncommitted work above; the chain is in `createHandler`. Needs live verification once UI re-compiles against the new compiler tip.
3. **Resume UI work** — lift-branch whitespace blocker cleared

## Session 6 work completed

1. **Committed S5-tail** (`c530779`) — scrml per-file fetch composition: `composeScrmlFetch`, `loadScrmlHandlers`, `createHandler({scrmlHandlers})` + `startServer` auto-discovery; +9 tests. 289 pass / 9 skip / 0 fail.
2. **master-list + hand-off rotation** (`03dc6a3`) — compiler bugs 001–005/007/008 struck through; GITI-006 kept as open (cosmetic); `.giti/private` manifest tracked.
3. **status.scrml re-verified** against scrmlTS `ccae1f6` — GITI-007/008 fixes confirmed in codegen (whole-phrase text nodes; clean `nav a` CSS); per-file `fetch(request)` export visible in `status.server.js:137`.
4. **Server wire-up confirmed live** — Bun.serve at `127.0.0.1:3737` serves static shell, runtime.js, and routes `/_scrml/*` → scrml handler chain (CSRF-gated, returns 403 to unauth'd curl) vs `/api/*` → giti handler (200). Composition per design-insight 22 works end-to-end.
5. **pa.md policy sync** (`20d44e2`) — master's 2026-04-22 edits applied: no-direct-main rule relaxed into new "Commit rules" section; cross-repo bug reports now require reproducer (sidecar or inline). Reply sent.
6. **status.scrml import-path fix** (`c671d8d`) — `../src/...` → `../../src/...` to match output-file depth. Flagged as **GITI-009** (compiler UX: scrmlTS should rewrite source-relative imports to resolve from output location).

## Still open / parked

**Three errors in browser** — status.scrml loads its shell but the three server-fn calls (loadStatus / loadHistory / loadBookmarks) all error out in the browser. Parked; next session diagnose. Likely candidates:
- Client-side CSRF token acquisition (the server route issues CSRF 403 without token — client needs to fetch+attach)
- Server-fn body throwing at runtime (e.g., `getEngine()` path issue in the bun-spawned subprocess)
- Serialization/contract mismatch between scrml client stub and scrml-generated server handler

**GITI-009** — scrmlTS forwards relative imports verbatim; source-relative paths don't resolve from compiled-output location. Workaround applied in status.scrml with `../../` prefix. File a repro + send to scrmlTS when convenient.

**GITI-006** (cosmetic, from S5) — still open. Workaround (pre-seed full defaults) is in place.

## Next session priorities (suggested)
1. Diagnose the three server-fn errors in browser (capture the actual error — devtools console + network tab)
2. File GITI-009 repro to scrmlTS (source-relative import rewrite)
3. Depending on #1's root cause: either fix in giti (wiring) or escalate to scrmlTS (codegen)
4. Send scrmlTS a session-closing reply covering asks #1-3 from S35 (two fixes verified + composition live + GITI-009 filed)
5. Then: next UI screen (history timeline, diff viewer) per master-list §E

## Not in scope this session unless user pushes
- Private scopes slice 6 (check/real-jj harness/OQ-9) — deferred, none required for original frustration
- Auth + multi-repo (blocks non-local hosting)

## Known cosmetic issue (non-blocking)
- **GITI-006** — markup `${@var.path}` emits a bare module-top `_scrml_reactive_get(...).value` that throws `undefined.path` before async reactive init resolves. Workaround: pre-seed `@state` with full default shapes (already applied in `ui/status.scrml`).
