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
| GITI-012 | **FIX SHIPPED upstream (scrmlTS S41)** — verify next session | server-fn `==` helper missing. Repro at `ui/repros/repro-08-server-fn-eq.scrml`. Workaround: truthy/falsy checks. scrmlTS `6ba84be` lands two-layer fix (primitive shortcut in `emit-expr.ts` + helper inlining in `emit-server.ts`). Sidecar confirmed PASS upstream. |
| GITI-013 | **FIX SHIPPED upstream (scrmlTS S41)** — verify next session | Arrow body `f => ({...})` loses wrapping parens in emit. Repro at `ui/repros/repro-09-arrow-object-literal.scrml`. Workaround: explicit for-loop + push. scrmlTS `0af4eaf` (single-file fix in `emitLambda`). Sidecar confirmed PASS upstream. |

## Inbox

**Unread on entry:**
- `2026-04-25-1100-scrmlTS-to-giti-s41-fixes-and-kickstarter.md` (`needs: action`) — GITI-012/013 fixes, requests retest + workaround removal.
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

_(append as work completes)_
