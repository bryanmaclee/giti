# giti — Session 15 Hand-Off

**Date:** 2026-06-22
**Previous session file:** `handOffs/hand-off-14.md`
**Next hand-off filename:** `handOffs/hand-off-15.md`

## Caught-up state (entering S15)

- **Compiler:** lives at `../scrml` (renamed from `scrmlTS` ~2026-06). HEAD `ca712295` (s212, pkg v0.2.0, emitted self-id `scrml-0.7.0`). giti's gate resolves to `../scrml` directly; legacy `../scrmlTS`/`$SCRMLTS_PATH` kept as harmless back-compat fallback.
- **CLI:** 15 commands. **375 pass / 0 fail** across 14 test files.
- **Web UI:** 7 scrml pages — status, history, bookmarks, diff, land, live, feed. `giti serve` works end-to-end.
- **scrml-as-logic dogfood:** 17 scrml lib modules power giti's runtime.
- **Git:** clean on `main`, last commit `d170641`.

## Inbox at S15 start — 2 unread (from scrml PA S210, dated 2026-06-20)

1. **`...2109-scrml-to-giti-idiomatic-audit-rewrite-plan.md`** (needs: action) — scrml read-only audited giti's scrml. **Idiom gap is NARROW: 6 UI pages, not src/lib.** src/lib is genuinely idiomatic (KEEP 16). LIGHT-EDIT 8 · REWRITE 5 (all `ui/`: status/land/diff/live/feed). 3-tier plan:
   - Tier-0: `<each>` sweep — ~16 `${for…lift}` sites across 6 pages → `<each>`+`<empty>` (mechanical).
   - Tier-1: status.scrml REWRITE → `Phase` enum + `<match for=Phase>` + errors-as-states (dissolves GITI-006 / CG-6 defaults-dodge).
   - Tier-2: live.scrml + feed.scrml → `<engine for=Phase>` (the two cycling pages).
   - DO NOT rewrite away CG-1..5 workarounds (GITI-016/020/021/025/026 + CSS @import) — keep until scrml fixes. Full doc: `scrml-support/docs/deep-dives/giti-idiomatic-audit-2026-06-20.md`.
2. **`...2112-scrml-to-giti-gap-triage-cg5-not-reproduced.md`** (needs: fyi) — **CG-5 (CSS `@import` mangling) NOT-REPRODUCED** on current main. `@import url('theme.css');` in `#{}` is preserved intact. `history.scrml` L91-93 comment is stale → can drop the HTML-link-injection workaround and use `@import` directly. No bug to file.

## Open items carried from S14

### Compiler bug ledger
| ID | Status |
|---|---|
| GITI-006 | open (cosmetic) — workaround in place; **dissolves into status.scrml rewrite (CG-6)** |
| GITI-016 | open — workaround retained (`match`→rename). Why `repros/` is excluded from `giti serve`. |
| GITI-027 | Part-A CLOSED; **Part-B still NOT shipped** (retested S14 @ca712295) — keep `localDev`+127.0.0.1 write-gate, do NOT relax |

### Follow-ups still open
- **`../scrmlTS/` legacy checkout** still on disk (superseded). Fallback in `resolve-compiler.scrml` is harmless; prune only on user request.
- **Optional tidy:** `rm -rf src/lib/dist/` (gitignored stray build output).
- **`ui/history.scrml` L91-93** — stale CG-5 workaround comment; can switch to direct `@import` (per inbox msg 2).
- **`ui/history.scrml:14`** — comment says "scrmlTS rewrites…"; cosmetic.

## S15 priorities (suggested)

1. **Idiomatic UI rewrite** (per inbox msg 1) — the headline new work. Tier-0 `<each>` sweep is low-risk mechanical; status.scrml rewrite is highest-leverage. Needs user go-ahead + likely worktree dev agent.
2. **CG-5 cleanup** (per inbox msg 2) — drop the history.scrml @import workaround.
3. Watch GITI-027 Part-B (per-role SSR content-stripping).
4. giti proper — auth+multi-repo, license, deploy roadmap.

## Push / commit

Per `pa.md`: commits + pushes to `main` require explicit per-session user auth; **the PA pushes origin directly** (master-coordination retired 2026-05-30).

## Dogfood — how to regen a scrml lib / UI page

```
# lib module (ESM, names preserved):
bun run ../scrml/compiler/src/cli.js compile src/lib/<name>.scrml -o src/lib --mode library
# UI page:
bun run ../scrml/compiler/src/cli.js compile ui/<page>.scrml -o ui/dist
```
`giti serve` compiles top-level `ui/*.scrml` → `dist/ui` automatically (skips `repros/`).

## S15 log

(session in progress)
