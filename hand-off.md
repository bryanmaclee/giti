# giti — Session 7 Hand-Off

**Date:** 2026-04-22
**Previous session file:** `handOffs/hand-off-6.md`
**Next hand-off filename:** `handOffs/hand-off-7.md`

## Caught-up state (through S6)
- CLI: 10 commands, 1,079 LOC, jj-lib 0.40 wrapper; 289 pass / 9 skip / 0 fail
- Spec `giti-spec-v1.md` ratified (1,531 lines)
- S3: Bun HTTP API + `land` compiler gate + compile-on-serve + static `ui/status.scrml` shell
- S5: Private scopes §12 slices 1–5 shipped; `ui/status.scrml` iter 3 landed (536 LOC, clean compile); 5+2 compiler bugs filed, 5 fixed
- S6: scrml per-file `fetch` composition wired into Bun server; status.scrml re-verified against scrmlTS `ccae1f6`; end-to-end `/_scrml/*` routing live; import-path fix (GITI-009) applied as workaround

## Inbox
- Clear (only `read/` subdir present)

## Parked from S6
- **Three errors in browser** — `ui/status.scrml` shell loads but all three server-fn calls (`loadStatus` / `loadHistory` / `loadBookmarks`) error out. Candidates: client CSRF token, server-fn runtime crash, client-stub ↔ server-handler contract mismatch.
- **GITI-009** — scrmlTS forwards relative imports verbatim; source-relative paths don't resolve from compiled-output location. Workaround applied with `../../` prefix. File repro + send when convenient.
- **GITI-006** (cosmetic, S5) — bare `${@var.path}` in markup; workaround (pre-seed full defaults) in place.
- **Session-closing reply to scrmlTS** covering S35 asks #1–3 (two fixes verified + composition live + GITI-009 filed)

## Session 7 priorities (suggested, pending user)
1. Diagnose three browser errors (devtools console + network tab capture)
2. File GITI-009 repro to scrmlTS
3. Either fix in giti (wiring) or escalate to scrmlTS (codegen)
4. Close S35 with session-end reply
5. Next UI screen per master-list §E (history timeline / diff viewer)

## Not in scope unless user pushes
- Private scopes slice 6 (check / real-jj harness / OQ-9) — deferred
- Auth + multi-repo (blocks non-local hosting)

## Session 7 work log

1. **Server instrumentation** — opt-in via `GITI_SERVER_LOG=1`. Wraps top-level dispatcher + every scrml handler (IN/OUT/THROW), logs CSRF cookie/header state, static hits, 404s. Silent in tests — 289 pass / 9 skip / 0 fail. Committed `186d820`.
2. **GITI-010 filed → fixed by scrmlTS → verified live in browser** — Filed via `2026-04-22-0639-giti-to-scrmlTS-csrf-bootstrap-bug.md` with repro + log trace. scrmlTS shipped Option-A fix same session: commit `40e162b`, HEAD `adbc30c`. Fix-shipped ack at `incoming/read/2026-04-22-0812-scrmlTS-to-giti-giti-010-fix-shipped.md`. End-to-end verified via live `giti serve` browser trace: `403+Set-Cookie → retry → 200` per call; all three loaders complete on first page load. **Side error:** recompile+verify ran AFTER their fix pushed (timing unknown to me), so I wrote a 0805 "retraction" mis-framed as "bug never existed." Followed up with corrected ack at `2026-04-22-0814-...giti-010-acked-and-giti-009-filed.md`. scrmlTS pushed back with a timeline correction (`incoming/read/2026-04-22-0820-scrmlTS-to-giti-giti-010-timeline-correction.md`) explicitly noting the self-flagellation is over-tuned — dated SHA-stamped reports are adequate, stale-dist is normal, the real mistake was jumping to "bug was never there" rather than "fix may have just shipped upstream." Master-list lesson updated to match their narrower framing.
3. **GITI-009 CONFIRMED at runtime** — `bun run src/cli.js serve` dies with `Cannot find module './repro-06-relative-imports-helper.js' from 'dist/ui/repro-06-relative-imports.server.js'`. Repro: `ui/repros/repro-06-relative-imports.scrml` + helper. Compiler forwards source-relative import paths unchanged into flattened dist — they don't resolve.
4. **Server hardened** — `loadScrmlHandlers` now skips `repro-*` artifacts so intentionally-broken compiler-bug reproducers can't crash the server at import time.
5. **Repro 05 (CSRF) retained** — still a useful compile-time shape demonstrator even though the bug it was written for is gone. Keeping it.

6. **Browser verified** — user reloaded; the trace showed the full bootstrap+retry sequence (3× `403+Set-Cookie` then 3× `200` with matching cookie). `ui/status.scrml` renders correctly on first page load. Original three-errors-in-browser complaint resolved end-to-end.
7. **Web UI — history timeline** — `ui/history.scrml` shipped. `loadTimeline` server fn returns 50 entries; route `/_scrml/__ri_route_loadTimeline_1`. CSRF bootstrap+retry verified via curl. Nav links between status/history live. ~240 LOC.
8. **Web UI — bookmarks** — `ui/bookmarks.scrml` shipped. `loadBookmarkList` server fn → `engine.listBranches`; route `/_scrml/__ri_route_loadBookmarkList_1`. CSRF bootstrap+retry verified. Three-tab nav complete (Status / History / Bookmarks). ~210 LOC.

## Still open / next
- **Diff viewer** — needs an engine primitive for `jj diff <change>` if not already present, then a two-pane scrml UI. Master-list §E next item.
- **Landing dashboard** — compiler-gate + test results + queue per `giti land`.
- **Theme refactor done** — `ui/theme.css` hand-written, copied by `compileUi`, injected as `<link>` into every compiled HTML head before the per-page CSS. `@import` inside scrml `#{}` blocked by scrml CSS parser mangling at-rules (workaround: HTML link injection). history + bookmarks now 45% leaner; status kept standalone.
- **GITI-011 filed** — scrml CSS parser has no at-rule handling (@import, @media, @keyframes, @font-face, @supports, @page all mangle). Confirmed via probe against scrmlTS `8691f75`. Blocks responsive design + animations. Repro: `ui/repros/repro-07-css-at-rules.scrml`. Report: `scrmlTS/handOffs/incoming/2026-04-22-0841-giti-to-scrmlTS-giti-011-css-at-rules.md` + sidecar.
- **GITI-009** still open (scrmlTS queue, not blocking; workaround applied).
