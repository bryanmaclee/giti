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

**Concurrent doctrine refactor (committed `724500b`).** Mid-session an external actor
restructured `pa.md` (+pa-base.md) — the base+overlay vendoring. Detected real-time index
churn between git commands; paused, user confirmed "pause until tree stable," resumed once
it committed. Adopted **path-limited commits** (`git commit -- <files>`) defense-in-depth for
the rest of the session. New pa.md commit rules confirmed consistent (explicit pathspec;
manual `bun test` is the only gate — NO commit hook installed).

**CG-5 resolved (`a267163`).** `@import url('theme.css')` emits intact (NOT-REPRODUCED) —
dropped the stale `history.scrml` workaround comment + `scrmlTS`→`scrml`. Inbox msg
`2026-06-20-2112` moved to `read/`.

**Idiomatic UI rewrite — COMPLETE (8 commits `b088927`..`5f95868`).** Executed the scrml-PA
audit directive (inbox `2026-06-20-2109`). All 7 UI pages + remotes.scrml. Per-page commits,
375/0 after each. Full record: master-list "S15" section + `docs/changes/ui-idiomatic-rewrite/progress.md`.
- Tier-1 dashboards (history, bookmarks, status, land, diff) → `Phase:enum` + `<match for=Phase on=@x>` + `<each>`+`<empty>`; server fns return the variant; `on mount` loads. **GITI-006/CG-6 dissolved** (`.Loading` seed).
- Cycling pages (live, feed) → **DEVIATION**: `<match>` on a typed state field, NOT `<engine>`. Verified **`E-RI-002`** (engine cell can't be a server-written channel/SSE cell). Kept channels (cross-tab/stream sync). String-flag smell killed.
- remotes.scrml: try/catch RETAINED — `safeCall` (the idiomatic fix) emits invalid JS in `--mode library`. Documented.
- Verified end-to-end: all 7 pages compile clean + `node --check` + `giti serve` → 7/7 HTTP 200.

### Open items carried to S16

**3 compiler findings to REPORT to scrml** (drafted, NOT yet sent — needs user confirm per pa.md cross-repo-message rule):
1. `<engine>` cell can't be a server-written `<channel>`/SSE cell (`E-RI-002`) — blocks engine on channel/SSE pages.
2. `on mount { @x = watchStatus() }` → `E-CODEGEN-INVALID-JS` (SSE binding in on-mount); workaround module-top `${...}`.
3. `safeCall(...) !{}` → `E-CODEGEN-INVALID-JS` under `--mode library` (fine in program mode).
Repros for all 3 live under `/tmp/giti-idiom-probe/` this session — will need re-creating as committed repros when filing.

**Ledger reconciliation needed:** audit (S210) said CG-1/CG-3 (GITI-020/021) OPEN + feed inert (GITI-026 open); this repo's master-list says GITI-020/021/025/026 all CLOSED (pre-migration). NOT re-verified on the migrated compiler. **feed.scrml runtime SSE on the migrated compiler is UNVERIFIED** — quick SSE runtime probe is the open follow-up.

**Carried (unchanged):** GITI-027 Part-B still unshipped (keep write-gate); GITI-015/016 workarounds retained; `../scrmlTS/` legacy checkout on disk; optional `rm -rf src/lib/dist/`.

### Cross-repo sends (S15)
- **Filed bug report → scrml** (`../scrml/handOffs/incoming/2026-06-22-1443-giti-to-scrml-three-codegen-findings.md`, needs:action). The 3 codegen/RI findings (E-RI-002 engine-cell-write, SSE-binding-in-on-mount, safeCall-in-library-mode) with inline repros. giti-side repros committed at `ui/repros/repro-24..26`. (User gave standing authorization to file legit bug reports without per-report permission, S15.)

### Inbox at S15 close
- `2026-06-20-2109-...idiomatic-audit-rewrite-plan.md` → moved to `read/` (acted on, this rewrite).
- `2026-06-20-2112-...cg5...` → moved to `read/` (acted on).
