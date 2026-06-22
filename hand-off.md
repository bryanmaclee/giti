# giti — Session 14 Hand-Off

**Date:** 2026-06-22
**Previous session file:** `handOffs/hand-off-13.md`
**Next hand-off filename:** `handOffs/hand-off-14.md`

## Caught-up state (entering S14)

- **Compiler:** lives at `../scrml` (renamed from `scrmlTS` ~2026-06). giti's gate resolution prefers `$SCRML_PATH`/`../scrml`, with legacy `$SCRMLTS_PATH`/`../scrmlTS` honored as fallback.
- **CLI:** 15 commands. **375 pass / 0 fail** across 14 test files (per S13 hand-off).
- **Web UI:** 7 scrml pages — status, history, bookmarks, diff, land, live, feed. `giti serve` works end-to-end.
- **scrml-as-logic dogfood:** 17 scrml lib modules power giti's runtime.
- **Git:** clean on `main`, last commit `b2fde19`.

## Open items carried from S13

### Compiler bug ledger
| ID | Status |
|---|---|
| GITI-006 | open (cosmetic) — workaround in place |
| GITI-016 | open — workaround retained (`match`→rename). Why `repros/` is excluded from `giti serve`. |
| GITI-027 | Part-A CLOSED; **Part-B deferred** (per-role SSR HTML stripping — keep `localDev`+127.0.0.1 write-gate until it lands) |

### Follow-ups still open (carried from S13)
- **`.claude/maps/` stale** — `primary.map.md` / `non-compliance.report.md` reference `scrmlTS`. Regenerate via `project-mapper` / `/map`.
- **Historical DD path refs** — `docs/deep-dives/giti-027b-...md` cites `scrmlTS/compiler/SPEC.md:...` external paths. Left as historical record.
- **`ui/history.scrml:14`** — one comment says "scrmlTS rewrites relative-import paths". Cosmetic; left to avoid a UI recompile.
- **Other sibling docs** may share the `/home/bryan/` stale-home-path bug (only fixed in giti's pa.md). Per-repo PAs own their own.

## S14 priorities (suggested, carried from S13)

1. **Lib `.server.js` orphan sweep** — §12.6 likely orphans plain-fs libs' committed `.server.js`. Re-emit 17 libs `--mode library`, `git rm` orphans. (Not urgent.)
2. **Promote `ui/feed.scrml`?** SSE works client-side. Decide nav slot vs dogfood example (redundant with channel `live` page).
3. **Watch GITI-027 Part-B** (per-role SSR content-stripping) — re-test `<auth role>` gating when scrml ships it.
4. **Browser visual-verify** theme dedupe + live dashboard.
5. **Regenerate `.claude/maps/`** (stale `scrmlTS` refs).
6. **giti proper** — auth+multi-repo, license, deploy roadmap.

## Inbox at S14 start
Empty (no unread in `handOffs/incoming/`).

## Dogfood — how to regen a scrml lib / UI page

```
# lib module (ESM, names preserved):
bun run ../scrml/compiler/src/cli.js compile src/lib/<name>.scrml -o src/lib --mode library
# UI page:
bun run ../scrml/compiler/src/cli.js compile ui/<page>.scrml -o ui/dist
```
`giti serve` compiles top-level `ui/*.scrml` → `dist/ui` automatically (skips `repros/`).

## Push / commit

Per `pa.md`: commits + pushes to `main` require explicit per-session user auth; **the PA pushes origin directly** (master-coordination retired 2026-05-30).

## S14 log

(session in progress)
