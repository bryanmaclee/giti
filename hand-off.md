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

**Maps regenerated + pa.md fixed (committed `4ffe1ba`).** `.claude/maps/` were stale
(2026-04-11, commit 3c4a7c3): 10 commands/88 tests, named scrmlTS as current, omitted
the scrml dogfood + server layers. Regenerated cold via project-mapper. pa.md "Current
state" corrected to 15 commands / ~375 tests / ~2,495 LOC + scrml-dogfood line; layout
diagram expanded. non-compliance.report.md: pa.md entry marked RESOLVED; 5 deep-dive
"location" flags annotated as intentional false positives (canonical-home move, S13).

**Compiler migration confirmed landed (2026-06-22).** Mid-sweep I read a stale disk
(`../scrml` looked like the self-host repo with no `compiler/`; `../scrmlTS` still present)
and flagged an apparent scrmlTS/scrml contradiction. User clarified: all of scrmlTS was
migrated INTO `../scrml`; the old self-host repo moved out (now `../scrml-self-host/`).
scrml PA then synced this disk — `../scrml/compiler/src/cli.js` now exists (HEAD
`ca712295`, s212, v0.2.0). giti's gate now resolves to `../scrml` directly (no fallback).
The `4ffe1ba` maps/pa.md naming `../scrml` canonical were correct all along.

**Lib `.server.js` orphan sweep — COMPLETE, clean.** Verified against the migrated
`../scrml` compiler:
- Zero committed `.server.js` orphans (already clean from S13). `git ls-files '*.server.js'` empty.
- Fresh `--mode library` compile of all 17 libs emits a single `.js` each — **no `.server.js`**.
  §12.6 concern fully resolved.
- **Zero drift** — in-place re-emit of all 17 libs → 0 git changes (byte-identical to committed).
  (A temp-dir compile falsely showed 2 "drifts" — that's the relative-import-rewrite artifact;
  in-place `-o src/lib` is the only correct drift check.)
- `src/lib/delay.js` kept — legit hand-written host helper imported by `ui/feed.scrml`.
- Stray gitignored build cruft remains on disk at `src/lib/dist/ui/*.server.js` (untracked,
  harmless; a compile that landed in the wrong dir). Not removed — tidy-only, optional.

**GITI-027 Part-B retest — still NOT shipped (2026-06-22).** Recompiled repro-23 against
the migrated `../scrml`@`ca712295` (s212, pkg v0.2.0, output self-id `scrml-0.7.0`):
- **Default mode:** secret `owner-only-marker-12345` + owner button still emitted verbatim
  in served HTML. Part-A `W-AUTH-CONTENT-NOT-GATED` warning still fires (now cites §34,
  §40.9.5 and explicitly notes `--emit-per-route` does NOT withhold HTML).
- **`--emit-per-route`:** JS role-split works (Anonymous 503B / Owner 566B chunks differ,
  anon omits owner mount) BUT the single shared `*.html` still contains the secret verbatim.
  No serve-layer / SSR role-elision artifact emitted.
- **Verdict:** Part-B unresolved. `<auth role>` is still JS-behavior-only; content ships to
  all viewers. **giti's `localDev`+127.0.0.1 write-gate stays load-bearing** — no giti code
  change, do NOT relax it. master-list GITI-027 row re-stamped with retest result.

**FYI sent to scrml (2026-06-22).** Dropped `2026-06-22-0832-giti-to-scrml-compiler-version-mismatch.md`
into `../scrml/handOffs/incoming/` (needs:fyi). Compiler reports two version strings:
`compiler/package.json` = `0.2.0` vs emitted `chunks.json` `compiler` field = `scrml-0.7.0`.
Non-blocking for giti (gate resolves by path, not version); flagged before anything downstream
pins on a version. Exact repro commands in the message.

### Still open / follow-ups
- `../scrmlTS/` legacy checkout still on disk (superseded by `../scrml`). giti's
  `resolve-compiler.scrml` keeps `../scrmlTS`/`$SCRMLTS_PATH` as back-compat fallback —
  harmless, left in place. Prune only if user wants the legacy path dropped.
- Optional tidy: `rm -rf src/lib/dist/` (gitignored stray build output).
