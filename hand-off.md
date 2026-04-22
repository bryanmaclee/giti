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

1. **Server instrumentation** — opt-in via `GITI_SERVER_LOG=1`. Wraps top-level dispatcher + every scrml handler (IN/OUT/THROW), logs CSRF cookie/header state, static hits, 404s. Silent in tests — 289 pass / 9 skip / 0 fail unchanged. Uncommitted on main.
2. **GITI-010 diagnosed via live log trace** — compiler-generated CSRF scheme is not bootstrappable. First POST from cookie-less browser → 403 forever: 403 branch in generated `.server.js` omits `Set-Cookie`, success path is only minting site, nothing in emitted HTML plants a cookie. All three `ui/status.scrml` server fns 403 on first page load against scrmlTS `ccae1f6`.
3. **Repro written** — `ui/repros/repro-05-csrf-bootstrap.scrml` (trivial `ping` server fn; compiler emits same CSRF template shape, confirming bug is body-independent).
4. **Logged in master-list.md** — GITI-010 + GITI-009 added under new "Open (UI-blocking)" section; last-updated bumped to 2026-04-22 S7.
5. **Sent bug report to scrmlTS** — `scrmlTS/handOffs/incoming/2026-04-22-0639-giti-to-scrmlTS-csrf-bootstrap-bug.md` + sidecar `.scrml` reproducer. Report includes live server log trace, emitted-code excerpts, three option sketches (mint-on-403 + retry / bootstrap route / HTML meta injection); flagged (A) as best fit for giti architecture.

## Still open / next
- **Instrumentation not committed yet** — awaiting user OK to commit (authorization needed per pa.md commit rules).
- **Blocked on scrmlTS** for GITI-010 fix. Next UI screen can proceed in parallel only if it needs no server fn; otherwise blocked.
- **GITI-009 repro still deferred** — write + send when convenient.
- **Session-closing reply to scrmlTS covering S35 asks #1–3** — still pending (the original task before GITI-010 hijacked attention).
