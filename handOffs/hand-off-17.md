# giti — Session 17 Hand-Off

**Date:** 2026-07-06
**Previous session file:** `handOffs/hand-off-16.md`
**Next hand-off filename:** `handOffs/hand-off-17.md`

## Caught-up state (entering S18)

- **Compiler:** `../scrml` @ `59dc5287` (s241, language **v0.7.1**). Moved ~27 sessions during S17 (s214→s241); re-verify HEAD at next compile as always.
- **CLI:** 15 commands, **375 pass / 0 fail** (14 files). Unchanged this session.
- **UI dogfood:** 7 scrml pages. **6 of 7 now paint clean in a browser** (status · history · bookmarks · diff · land · live) — the exact inversion of S16's "6-of-7-broken." Only **feed** is red (GITI-035, filed). This is the headline S17 outcome.
- **Git:** clean on `main`, HEAD `ccad5ba`, **ahead 1** of origin at wrap-start (wrap commit + push to follow).
- **flobase:** giti is now **flobase-assembled** — `.pa-base/profile` (boot manifest) + `.claude/CLAUDE.md` (fenced region) exist. **Next boot is a cheap rehydrate off `.pa-base/profile`** (no more cold re-derivation). Authority still defers to `pa.md`. Module set: CORE + stack-pack-scrml + role-pa + maps + continuity:light (no delta-log — hand-off is the carrier).
- **Maps:** refreshed via project-mapper at wrap (step 6c) — watermark advanced to the S17 HEAD.

## GITI-bug ledger — CURRENT TRUTH (reconciled S17 via full re-verify sweep)

**CLOSED this session:**
- **GITI-033** (each-item `@.` accessor inside ternary-markup → E-CODEGEN-INVALID-LOGIC) — **scrml FIXED `690d7739`** (s241); status + land compile clean. repro-32. *Also closed a latent quote-loss bug* (string literals in text-position `${cond ? "a":"b"}` were dropping quotes → silent always-false; status:122 was affected — now correct).
- **GITI-015** (`is some` ternary, computed LHS) — **verified FIXED** on s239 (repro-11 all cases lower clean; giti source already used the direct form — no workaround to revert). Ledger had it stale-open.
- **repro-25 defect** (SSE-binding-in-`on mount` → E-CODEGEN-INVALID-JS) — **compile FIXED** (valid ESM now). *NB: the RUNTIME half is GITI-035, still open — see below.*
- **repro-26 defect** (`safeCall !{}` under `--mode library`) — **FIXED** (valid ESM).
- **diff E-FN-004** (new s241 purity rule: `fn` reading `window.location`) — **fixed giti-side** (`fn modeFromUrl/changeIdFromUrl` → `function changeParam()` + pure `fn modeFromParam(param)`).

**OPEN:**
- **GITI-035** (NEW, filed S17 `2026-07-06-0959`) — `${ @cell = serverGenerator() }` emits a spurious `_scrml_reactive_set(cell, null)` that clobbers the typed seed → runtime `null.<field>` crash. **Root of feed's non-render.** repro-33 (byte-identical emit). Bug-51 class. **This is the ONLY thing between us and 7/7 UI paint.** Watch for scrml fix → re-run browser-paint.
- **GITI-016** (identifier `match` → E-SCOPE-001, now via E-EQ-005 first) — still open; `match`→`m` workaround stays. **scrml is STAGING it** (`b42492aa` "stage GITI-016/residual-D briefs"). repro-12.
- **GITI-006** (cosmetic `${@var.path}` pre-init) — untested, cosmetic, low-priority.

**Reclassified:**
- **repro-24 / E-RI-002** (server-escalated fn can't write an `<engine>` cell) — **NOT a bug; enforced-as-designed.** scrml verified the resolution path: **`<engine for=T server=@source>` (§51.0.E)** drives an engine from server-authoritative state guard-free and resolves E-RI-002. (See §51.0.E answer, `read/2026-07-06-0923`.) So live/feed CAN move back to `<engine>` off the Phase-cell workaround — **optional enhancement, not done yet** (see threads).

**Not-affected (filed by scrml, giti clear):** GITI-034 (attribute-position `${}` with nested quote/brace) — giti's attr interps have no nested string literals.

## Threads in flight (open questions for S18)

1. **feed → 7/7 UI paint** — blocked on **GITI-035** (scrml). When it lands: `tests/manual/browser-paint.mjs` over all 7 → expect 7/7. This closes the UI-dogfood render goal that S15/S16/S17 chased.
2. **AST semantic merge (spec §4.3) — the pillar.** flogence↔giti operator-directed tag-team. Landed this session: `docs/ast-merge/` = the v0 shared note (§6 filled by flogence) + a **BUILT + gate-verified first-slice prototype** (`.scrml` state-type field-add merge on `--emit-block-analysis`, consumer path, no compiler `--merge` needed) + the **joint compiler-ask v0** (`compiler-ask-v0.md`, **co-signed by flogence**). flogence **carried the ask to scrml as oracle ask #6** (feasibility-read; my 2026-07-05 solo ask flagged superseded). **Ball with scrml.** The ask = two additive `--emit-block-analysis` items: (1) [PRIMARY] field-level member emission (per-member spans + typeText, for record fields + enum variants); (2) tight `bodySpan`. **Next when scrml responds:** build slice 2 (enum variant-add merge) off member-emission; the `--merge` entrypoint + compiler type-diff is deferred to giti-spec v3/§4.4. This is the §3.7 engine-independence-gate work.
3. **100%-scrml roadmap** — filed to scrml (`read/2026-07-05-1339`): to author giti entirely in scrml (excl. jj), the compiler needs a **subprocess primitive** (unblocks the 471-LOC jj wrapper), **§64 Standalone-Tool-Target** maturity (CLI + HTTP-server entrypoints), **cross-scrml imports in library mode** (deletes the JS shims), + close GITI-016. Awaiting scrml. (§64 landed s238-239 — partial.)
4. **§51.0.E live/feed → `<engine>` migration** — OPTIONAL enhancement now unblocked (see reclassified E-RI-002). `<engine for=Phase server=@source initial=.Idle>` where `@source` is server-owned. Would move live/feed off the typed-Phase-cell + `<match>` workaround. Not urgent.
5. **giti proper** — auth + multi-repo → deploy (Hosted Forge, master-list §E, M4.1). The real product horizon once the UI dogfood settles. Will trigger role-dpa/deliberation when opened.

## Cross-repo state (S17)

- **Outbound to scrml:** GITI-033 (fixed) · repro-sweep reconciliation (`0742`) · 100%-scrml roadmap (`1339`) · GITI-035 (`0959`) · §51.0.E question (answered). All in scrml's `read/`.
- **Outbound to flogence:** tag-team accept · v0-built ping · ask co-sign request. flogence co-signed + carried oracle ask #6 to scrml.
- **Inbound (all drained to `read/`):** scrml GITI-033-landed, §51.0.E answer; flogence §6-fill + ask co-sign+carry. Inbox EMPTY at wrap.

## Push / commit / standing auth (unchanged)

- Commits + pushes to `main` require explicit per-session user auth; **PA pushes origin directly**. Pathspec commits. `bun test` is the gate (no commit hook). Standing auth: file cross-repo bug reports to siblings (`../scrml`, `../flogence`) without per-report permission (push still needs auth).

## Dogfood — regen a page / lib

```
bun run ../scrml/compiler/src/cli.js compile ui/<page>.scrml -o ui/dist          # UI page
bun run ../scrml/compiler/src/cli.js compile src/lib/<name>.scrml -o src/lib --mode library   # lib
```
`giti serve` compiles top-level `ui/*.scrml` → `dist/ui` (fail-fast; skips `repros/`), serves on **127.0.0.1:3737**. Browser gate: `tests/manual/browser-paint.mjs http://127.0.0.1:3737` (start serve + paint in ONE shell — the server must outlive the paint; land needs the 45s budget the harness now gives it).

## S17 WRAP

- **Tests:** 375 / 0 / 0 (14 files).
- **Landed + pushed (pre-wrap):** diff E-FN-004 fix + repro-32 · flobase assembly · AST-merge note + prototype + ask (+ flogence co-sign) · §4.17 `<code>`→`<span>` cleanup · repro-33 + browser-paint portability/land-budget · inbox drains. (~10 commits.)
- **Maps:** refreshed (6c). **6d:** N/A (no regen scripts / `@generated` in giti). **Worktrees:** none created.
- **user-voice:** see meta-docs note in the wrap (this session's user messages were task drives — "keep going", "run it", "inbox", "push it" — plus two load-bearing forks answered via /flobase + AST-merge questions, captured in the profile + note decisions logs, not durable voice directives).
