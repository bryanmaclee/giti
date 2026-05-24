# giti — Session 11 Hand-Off

**Date:** TBD (next session)
**Previous session file:** `handOffs/hand-off-10.md`
**Next hand-off filename:** `handOffs/hand-off-11.md`

## Caught-up state (through S10)

- **CLI:** 15 commands (added `check` in S10). 371 pass / 0 fail / 0 skip across 14 test files.
- **Engine:** jj-cli wrapper, **jj 0.41 installed + colocated** this session (was absent). Engine-bound integration tests now run.
- **Spec** `giti-spec-v1.md` ratified (1,531 lines).
- **Web UI:** 5 pages (status, history, bookmarks, diff, land). Currently broken at runtime by GITI-014 (zero-arg arrow object-literal) — **fix landed upstream scrmlTS S122, awaiting giti-side verification after a scrmlTS pull**.
- **scrml-as-logic dogfood:** 17 scrml modules in `src/lib/` (~865 LOC of scrml) now power giti's runtime, compiled `--mode library`. Many JS files reduced to thin re-export shims.

## S10 summary (21 commits, `3daea53..d59d459`)

1. GITI-012/013 verified CLOSED + workarounds removed
2. DRIFT-1: `null`→`not` sweep across UI pages
3. GAP-6 `giti check`, GAP-8 `giti history --since`
4. jj 0.41 install + colocate
5. 17-module scrml-as-logic dogfood (slices 6–21)
6. 5 compiler bugs filed upstream (GITI-014…018)

Full detail in `handOffs/hand-off-10.md` "SESSION 10 CLOSE SUMMARY".

## Compiler bug ledger (status at S10 close)

| ID | Status |
|---|---|
| GITI-006 | open (cosmetic) — workaround in place |
| GITI-009, 010, 011, 012, 013 | CLOSED (verified) |
| GITI-014 | **FIX LANDED upstream (scrmlTS S122 `18b90f12`, wrap `a2eb9096`)** — verify after scrmlTS pull |
| GITI-015 | open — `is some` ternary + computed LHS. Workaround: hoist to const. `repro-11` |
| GITI-016 | open — `match` identifier parse confusion. Workaround: rename. `repro-12` |
| GITI-017 | open — **SILENT CORRUPTION** `not` inside regex literals. Workaround: `n[o]t` char-class split. `repro-13` |
| GITI-018 | open — only first `scrml:` import rewritten in library mode. Workaround: anchor pattern. `repro-14` |

## Inbox at S11 entry

- `2026-04-26-0919-scrmlTS-to-giti-s42-close-fixes-and-kickstarter-v1.md` (`needs: fyi`) — **STILL UNREAD**. Informational: kickstarter v1, A1–A6 fixes, F4 routing-leak, examples 15–22. Action: archive or note, no code change required.
- All giti bug reports were processed by scrmlTS (in their `incoming/read/`).

## S11 priorities (suggested)

1. **Pull scrmlTS to S122 + verify GITI-014 fix** (user-driven pull). Recompile `ui/repros/repro-10` + the 5 UI pages, run `giti serve`, confirm real data renders. This unblocks the UI dogfood layer.
2. **Verify GITI-015/016/017/018** if scrmlTS shipped fixes; drop the workarounds in the affected `src/lib/*.scrml` modules where fixed.
3. **Continue dogfood** (optional): engine subprocess layer needs `Bun.spawn` via vendor: shim or injection; CLI command bodies; runCompiler/runTests.
4. **Refactor to scrml idiom** (optional): migrate async ports + Result tuples to `safeCallAsync` + `!{ }` (DF-10 follow-up).
5. **Theme dedupe** in `status.scrml` (long-pending, ~250 LOC chrome overlap).
6. **License selection** (pending — user S9: "as long as i can charge").
7. **Auth + multi-repo** (master-list §E — blocks hosted forge).

## Dogfood — how to regen a scrml lib module

```
bun run ../scrmlTS/compiler/src/cli.js compile src/lib/<name>.scrml -o src/lib --mode library
```
Emits `src/lib/<name>.js` (ESM, names preserved). `src/lib/_scrml/{path,fs,process}.js` shims ride along. `dist/` is gitignored.

Known workarounds baked into the scrml libs (drop when upstream fixes land):
- GITI-017: `/n[o]t .../` char-class split in `friendly-error.scrml`, `remotes.scrml`
- GITI-018: anchor-pattern stdlib imports in `resolve-compiler.scrml`, `remotes.scrml`, `scope-manifest.scrml`, `find-scrml-files.scrml`, `server-helpers` (n/a), etc.
- GITI-015: hoist-to-const before `is some` ternary in `cli-args.scrml`, `server-helpers.scrml`
- DF-10: explicit `async`/`await` kept in `save-routing-async.scrml` (untyped engine boundary)

## Not in scope unless user pushes

- Engine independence (§3.7 gate)
- Deploy target (blocked on auth)
- Live-follow / WebSocket dashboard

## Session 11 work log

_(append as work completes)_
