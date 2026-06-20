# giti — Session 13 Hand-Off

**Date:** 2026-06-20
**Previous session file:** `handOffs/hand-off-12.md`
**Next hand-off filename:** `handOffs/hand-off-13.md`

## Caught-up state (entering S13)

- **Compiler:** scrmlTS v0.7.0 (`../scrmlTS` on `main`). Clean drop-in; all prior bugs closed.
- **CLI:** 15 commands. **371 pass / 0 fail** across 14 test files.
- **Web UI:** 7 scrml pages — status, history, bookmarks, diff, land, live, feed. `giti serve` works end-to-end.
- **scrml-as-logic dogfood:** 17 scrml lib modules power giti's runtime.
- **Git:** clean on `main`, last commit `e5ace38` (FSL-1.1-MIT license).

## Open items carried from S12

### Compiler bug ledger
| ID | Status |
|---|---|
| GITI-006 | open (cosmetic) — workaround in place |
| GITI-015, 016 | open — workarounds retained (`is some` ternary hoist; `match`→rename). GITI-016 is why `repros/` is excluded from `giti serve`. |
| GITI-027 | Part-A CLOSED; **Part-B deferred** (per-role SSR HTML stripping — scrmlTS S146 ratified A+D, impl pending; keep `localDev`+127.0.0.1 write-gate until it lands) |
| (others 017–026) | CLOSED — see hand-off-12.md |

### Inbox at S13 start
Three messages in `handOffs/incoming/`:
- `2026-05-29 resume-dogfooding` (needs:action) — **acted on in S12** (dogfood arc, GITI-020…027 filed). Ready to archive.
- `2026-05-23 giti-017-closed` (fyi) — done; one opportunistic note: revert `n[o]t a jj repo` char-class workaround → `not a jj repo` in `src/lib/friendly-error.scrml`. Ready to archive.
- `2026-05-17 deep-dives-canonical-home-move` (needs:action) — **NOT done.** No `docs/deep-dives/` dir exists in giti. Action: copy 5 `giti-*.md` DDs from `../scrml-support/docs/deep-dives/`, strip cross-ref annotation blocks, record in master-list, ack back into `scrml-support/handOffs/incoming/`. Surfaced to user at S13 start.

## S13 priorities (suggested, carried from S12)

1. **Deep-dives canonical-home move** (the genuine open `needs:action` — see inbox above).
2. **Lib `.server.js` orphan sweep** — §12.6 likely orphans plain-fs libs' committed `.server.js`. Re-emit 17 libs `--mode library`, `git rm` orphans. (Not urgent — 371/0.)
3. **Promote `ui/feed.scrml`?** SSE works client-side now. Decide nav slot vs dogfood example (redundant with channel `live` page).
4. **Watch GITI-027 Part-B** (per-role SSR content-stripping) — re-test `<auth role>` gating when scrmlTS ships it.
5. **Browser visual-verify** theme dedupe + live dashboard (token-correct statically; layout needs eyes).
6. **giti proper** — auth+multi-repo, license, deploy roadmap.

## Dogfood — how to regen a scrml lib / UI page

```
# lib module (ESM, names preserved):
bun run ../scrmlTS/compiler/src/cli.js compile src/lib/<name>.scrml -o src/lib --mode library
# UI page:
bun run ../scrmlTS/compiler/src/cli.js compile ui/<page>.scrml -o ui/dist
```
`giti serve` compiles top-level `ui/*.scrml` → `dist/ui` automatically (skips `repros/`).

## Push / commit

Per `pa.md`: commits + pushes to `main` require explicit per-session user auth; **the PA pushes origin directly** (master-coordination retired 2026-05-30).

## S13 log

**Deep-dives canonical-home move — DONE (2026-06-20).** Acted on the 2026-05-17 `needs:action` from scrmlTS-PA-machine-B.
- Created `docs/deep-dives/`; copied the 5 giti-domain DDs from `../scrml-support/docs/deep-dives/` (radical-doubt, vcs-model, collaboration-primitive, conflict-resolution, design-constraints-from-friction).
- Stripped the `GITI-CROSS-REF` annotation block from each (verified 0 remain).
- Recorded as canonical-giti in `master-list.md` §D; updated header date stamp.
- Dropped ack into `scrml-support/handOffs/incoming/2026-06-20-1644-giti-to-scrml-support-deep-dives-move-complete.md` (needs:action — asks them to flip §I to `[x][x]`).
- Archived the request msg → `handOffs/incoming/read/`.
- **6th DD also moved (user-authorized):** `giti-027b-per-role-ssr-content-stripping-2026-05-30.md` copied to `docs/deep-dives/`. No cross-ref block (postdated S98B annotation pass) — copied as-is. Recorded canonical in §D; ack message updated to note the move.
- **Committed** S13 (see commit below).
