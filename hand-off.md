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

### GITI-014 VERIFIED CLOSED (priority #1)
- scrmlTS already pulled to **S125** (`dc073b94`); fix commit `18b90f12` (S122) present.
- repro-10 recompiled → emit now `_scrml_init_set("probe", () => ({error: null, count: 0}));`, `node --check` passes.
- All 5 UI pages recompiled to `ui/dist/` — all compile clean (warnings only).
- Ledger updated: GITI-014 moved to "Closed S11".

### GITI-019 FOUND (new UI-blocking compiler bug)
- Recompiling the pages past the old GITI-014 break surfaced a new SyntaxError in **3 of 5** client bundles (status, history, diff).
- Emit: `String(e.description || "(no message)" ?? "")` — illegal JS (`??` can't mix with `||`/`&&` unparenthesized). `node --check` → `missing ) after argument list`.
- Root: `for ... lift` loop path wraps per-item interpolation in `String(expr ?? "")` without parenthesizing a `||`/`&&` operand. Correct: `String((expr) ?? "")`.
- Direct (non-loop) reactive interpolation NOT affected — takes `el.textContent = expr` path.
- Minimal repro: `ui/repros/repro-15-interp-logical-or-coalesce-mix.scrml` (confirmed reproduces).
- Source sites: `ui/status.scrml:234`, `ui/history.scrml:64`, `ui/diff.scrml:91` — all the `${e.description || "(no message)"}` idiom.
- Ledger updated; per escalation path, NOT worked around in JS. Awaiting user to drive P0 handoff to scrmlTS.
- bookmarks + land client bundles parse clean (not affected).

### GITI-017 re-verify → PARTIAL FIX (still open)
- scrmlTS sent fix-landed (`f181d60a`, in HEAD `dc073b94`). Re-verified: fix is **partial**.
- ✅ absence-sentinel `/(not).../`→`/(null).../` is fixed (now verbatim).
- ❌ boolean-negation `/not <space>.../`→`/!.../` **STILL corrupts**. Clean probe: `const re = /not a jj repo/i` → `/!a jj repo/i`.
- scrmlTS's own "Verification" claim (`/not a jj repo/i` verbatim) does NOT reproduce at `dc073b94`.
- Workaround `/n[o]t .../` KEPT in `friendly-error.scrml` + `remotes.scrml` — did NOT revert.
- Ledger updated (GITI-017 → "PARTIAL FIX — still open").

### Cross-repo messages SENT this session (to scrmlTS/handOffs/incoming/)
1. `2026-05-24-0611-giti-to-scrmlTS-giti-019-interp-or-coalesce-mix.md` (+ .scrml sidecar) — `needs: action` — new bug.
2. `2026-05-24-0613-giti-to-scrmlTS-giti-017-partial-fix-boolean-negation-still-broken.md` (+ .scrml sidecar) — `needs: action` — reopen partial fix.

### Inbox processed
- Archived `2026-04-26 S42-close` (FYI) → read/.
- Archived `2026-05-24-0606 GITI-017 fix-landed` (acted on) → read/.
- Inbox now empty.

### S11 re-verify sweep (priority #2) — all open bugs re-tested at `dc073b94`
- GITI-015 (is-some ternary + computed LHS): ❌ still broken — `args[i+1] is some ? …` emitted literally in repro-11 `--mode library`. Workaround stays.
- GITI-016 (`match` identifier): ❌ still broken — `E-SCOPE-001: Undeclared identifier is`. Rename workaround stays.
- GITI-018 (multi-stdlib import, library mode): ❌ still broken — clean probe shows only 1st `scrml:` import rewritten; `_scrml/` shims for all 3 emitted but imports 2+3 stay bare. Anchor workaround stays.
- (GITI-014 closed, GITI-017 partial — above.)
- **Net: only GITI-014 closed. No workarounds removed except 014's.** Sweep recorded in master-list "S11 re-verify sweep" table.

### State at this point
- Working tree: uncommitted (master-list, hand-off, new ui/repros/repro-15-*). No commit authorized yet.
- scrmlTS inbox holds 2 unread giti messages (GITI-019 + GITI-017 reopen) awaiting their next session / user P0 handoff.
- **GITI-017 loop CLOSED:** scrmlTS replied 0618 (`...giti-017-CORRECTION-reopened-partial.md`, archived) — independently confirmed the partial fix, retracted their 0606 all-clear, reopened `GITI-017-residual` on their side (boolean-negation regex fence), confirmed my diagnosis, said keep the workaround.

### GITI-017-residual + GITI-019 BOTH FIXED + CLOSED (same session)
scrmlTS (parallel instance) turned both around within the hour. Message `2026-05-24-0717-...giti-017-residual-AND-019-fix-landed.md` (archived). Local scrmlTS advanced to `a91ad5de` (contains both fixes — confirmed ancestors).
- **GITI-019** (fix `fa665e9d`): repro-15 now emits `String((e.description || "(no message)") ?? "")`, `node --check` clean. All 5 UI page client bundles recompiled + parse clean (status/history/diff unblocked).
- **GITI-017-residual** (fix `3341f34d`): root cause was a SECOND lowering site (`expression-parser.ts::preprocessForAcorn`) unfenced; fix routes both sites through shared `code-segments.ts`. Clean probe + full repro-13 matrix all verbatim.
- **Workaround removed:** 3 `/n[o]t …/` sites in `src/lib/friendly-error.scrml` reverted to `/not …/`; recompiled `--mode library` (regexes verbatim); **371/0 tests pass**.
- Ledger: GITI-014, 017, 019 → CLOSED. Still open: GITI-015, 016, 018 (workarounds kept), GITI-006 (cosmetic).

### State at S11 work-pause
- UI no longer compiler-blocked at the bundle-parse level — all 5 pages' client bundles parse clean. Theme dedupe (status.scrml) is now UN-gated: status/history/diff can be browser-verified (still needs a token-naming design call before churning 5 files).
- Working tree being committed now (user authorized commit + push). Push routes via master coordination (giti + scrmlTS affected).
- Theme dedupe (status.scrml): DEFERRED — needs token-naming design call + visual verify of status/history/diff, which are GITI-019 runtime-blocked. Pick up after GITI-019 lands.
