# giti — Session 12 Hand-Off

**Date:** 2026-05-30
**Previous session file:** `handOffs/hand-off-11.md`
**Next hand-off filename:** `handOffs/hand-off-12.md`

## Caught-up state (through S12)

- **Compiler:** upgraded to **scrmlTS v0.7.0** (`../scrmlTS` on `main`, currently `7be403dd`). Clean drop-in for giti — all prior bugs stay closed, no regressions.
- **CLI:** 15 commands. **371 pass / 0 fail** across 14 test files.
- **Web UI:** **7 pages** — status, history, bookmarks, diff, land, **live (NEW)**, feed (NEW, not in nav). Consistent `Live` nav across all six product pages.
- **`giti serve` works** end-to-end (was broken on v0.7.0 until the compileUi fix below).
- **scrml-as-logic dogfood:** 17 scrml lib modules power giti's runtime.

## S12 summary — dogfood arc + live-follow dashboard

Resumed dogfooding on v0.7.0 per scrmlTS's S140 resume message; swept four runtime-tier surfaces and filed **8 compiler bugs** (GITI-020…027). The recurring pattern (flagged by the resume message): static/emit-string analysis is well-tested, the **runtime/client tier is where the silent-miscompiles cluster**.

**Surfaces swept:**
- **Channels (§38)** — works end-to-end. → **shipped `ui/live.scrml` as the live-follow dashboard** (channel `<snapshot>` cell + `refreshStatus()`; broadcasts to every open tab; runtime-verified through the real `giti serve` pipeline: two WS clients both receive real `jj` status). Wired giti's `Bun.serve` for the channel WS contract (`loadScrmlChannels`, WS-route dispatch with the server instance, `globalThis._scrml_active_server`).
- **Server-fn codegen** — GITI-020/021/022/024 (all in the server-fn body statement-lowering path).
- **SSE (§37)** — server works; client was broken (GITI-025/026), now FIXED. `ui/feed.scrml` is a working SSE live-status feed.
- **Auth (§40)** — diagnostics solid; content-gating is the gap (GITI-027).

**Also landed:** theme dedupe (deferred since S11 — `theme.css` now single source of truth, token vocab unified to `--fg`/`--ok`/`--err`/…); `compileUi` serve-blocker fix (compile top-level `ui/*.scrml` only, skip `repros/`); push-flow change (PA pushes origin directly on user auth — master-coordination retired).

Full detail in `master-list.md` (S12 sections) and `handOffs/hand-off-11.md`.

## Compiler bug ledger (status at S12 close)

| ID | Status |
|---|---|
| GITI-006 | open (cosmetic) — workaround in place |
| GITI-015, 016 | open — workarounds retained (`is some` ternary hoist; `match`→rename). GITI-016 is why `repros/` must be excluded from `giti serve`. |
| GITI-017, 018, 019 | CLOSED (S11) |
| GITI-014 | CLOSED (S11) |
| GITI-020, 021, 022 | CLOSED — scrmlTS `8e7f18fe` (server-fn body context-threading) |
| GITI-023 | CLOSED — native-parser optional-chain (pre-v0.7.0) |
| GITI-024 | CLOSED — `8b50c89b` + §12.6 `3b825808` (spurious `.server.js` dropped) |
| GITI-025, 026 | CLOSED — `e2dcde7b` (SSE param + client binding) |
| GITI-027 | Part-A CLOSED (`53203851`, `W-AUTH-CONTENT-NOT-GATED` warning); **Part-B deferred** (per-role SSR HTML stripping — scrmlTS S146 ratified A+D, impl pending; keep giti's `localDev`+127.0.0.1 write-gate until it lands) |

All S12-filed bugs verified against their repros (`ui/repros/repro-16…23`). Cross-repo copies in `handOffs/outgoing/`.

## Inbox at S12 close

- Empty of unread action items. Three older FYI messages remain in `handOffs/incoming/` (deep-dives move, GITI-017-closed, resume-dogfooding) — informational, can archive.

## S13 priorities (suggested)

1. **Lib `.server.js` orphan sweep** — §12.6 likely orphans other plain-fs libs' committed `.server.js` (find-scrml-files, resolve-compiler, remotes, etc.). Re-emit all 17 libs `--mode library`, `git rm` orphans, refresh `.js`. (Not urgent — stale artifacts are unused, 371/0.)
2. **Promote `ui/feed.scrml`?** SSE now works client-side (GITI-026 fixed). Decide whether the SSE feed earns a nav slot or stays a dogfood example (currently redundant with the channel `live` page).
3. **Watch for GITI-027 Part-B** (per-role SSR content-stripping) — re-test `<auth role>` content gating when scrmlTS ships it; this unblocks real auth-gated write controls (master-list §E hosted-forge).
4. **Browser visual-verify** the theme dedupe + the live dashboard (token-correctness is statically confirmed; layout needs eyes).
5. **Continue dogfood / giti proper** — remaining untested surfaces, or giti roadmap (auth+multi-repo, license, deploy).

## Dogfood — how to regen a scrml lib / UI page

```
# lib module (ESM, names preserved):
bun run ../scrmlTS/compiler/src/cli.js compile src/lib/<name>.scrml -o src/lib --mode library
# UI page:
bun run ../scrmlTS/compiler/src/cli.js compile ui/<page>.scrml -o ui/dist
```
`giti serve` compiles top-level `ui/*.scrml` → `dist/ui` automatically (skips `repros/`).

## Push / commit

Per `pa.md` (updated S12): commits + pushes to `main` require explicit per-session user auth; **the PA pushes origin directly** (master-coordination flow retired 2026-05-30).
