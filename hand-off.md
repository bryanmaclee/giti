# giti — Session 19 Hand-Off

**Date:** 2026-07-18
**Previous session file:** `handOffs/hand-off-18.md`
**Next hand-off filename:** `handOffs/hand-off-19.md`

## Caught-up state (entering S20)

- **Compiler:** `../scrml`. Churned **~6× this session** (S18 `7d5fda26` → `780e4342` → `01160fb8` → `c82550dd` → `99ae45ca` → `1e63bbb1` by wrap). **Re-verify HEAD at EVERY compile** — it moves multiple times per session now. Language v0.7.x, conformance-freeze churn live (fn-purity §48, async/await ban, structural-eq, route-inference).
- **CLI:** 15 commands, **375 pass / 0 fail** (14 files, 791 expect). Unchanged.
- **UI dogfood:** 7 scrml pages, **7/7 PAINT** — re-verified in a headless browser on the current churning compiler (`99ae45ca`) this session, not just S18. `browser-paint.mjs` now has an SSE-aware path (feed settles on `domcontentloaded`, not `networkidle`) → true **7/7 in a single main-harness run** (was 6/7 + a feed timeout).
- **Lib idiom:** all pure lib functions now use the enforced-pure **`fn`** form (21 fns / 12 modules promoted this session). Still `await`-free + `try/catch`-free UI. Only `server-helpers.scrml` + `save-routing-async.scrml` stay on `function`/async — GITI-037-blocked.
- **Git:** clean on `main`, HEAD **`64883a8`** at wrap-start; this wrap adds repro-34 + hand-off/master-list/maps commits, then push. **4 S19 work commits** pushed: `18e9bae` `555b5dd` `635e514` `64883a8`.
- **Maps:** refreshed via project-mapper at wrap (6c) → watermark advanced to S19 HEAD.

## GITI-bug ledger — CURRENT TRUTH (reconciled S19)

**CLOSED / cleared this session:**
- **GITI-036** (structural-eq helper tree-shaken out of client bundle) — **VERIFIED FIXED** @ scrml `01160fb8` (fix `4d0220c7`, PR #59). Runtime bundle now DEFINES `_scrml_structural_eq` (was 0→1); status browser-paints loaded data with **zero** structural-eq/ReferenceError console errors. No giti source change (idiomatic source retained through the bug). Note dropped.
- **GITI-016** (`match` identifier → E-SCOPE-001) — **workaround REMOVED.** `src/lib/friendly-error.scrml` restored `m`→`match`; recompiles clean (`is some` lowers correctly); 375/0. A 100%-scrml roadmap blocker cleared.

**OPEN — filed this session:**
- **GITI-037** (P2, gap) — **ANSWERED + BANKED upstream, not built.** scrml ruled (bryan S258): colorless async via compiler-inferred, typed-and-surfaced async (~80% built; Phase-1 seed-holes not dispatched). Silent Promise-leak persists until Phase 1 lands. Interim: the 2 lib async modules stay on committed `.js`. **Watch for scrml's "Phase 1 landed" ping** → then migrate `server-helpers.scrml` + `save-routing-async.scrml` (and promote their `fn`s for free). Reply in `handOffs/incoming/read/2026-07-15-from-scrml-...`.
- **E-ROUTE-001 over-fire** (P3 FYI, filed 2026-07-18) — route-inference warning fires on numeric regex-capture array access (`m[1]`, `m[2]`) inside an **object-literal value**, in a pure route-less lib module (`parse-status.scrml::parseStatus`). Characterized: object-literal position fires, ternary/const-bind does not. Non-blocking (warning, correct emit). Repro `ui/repros/repro-34-...`. Note in scrml inbox (their call).

**Still OPEN (unchanged):** GITI-006 (cosmetic `${@var.path}` pre-init — untested, low-pri; giti no longer triggers it).

**Still BLOCKED (compiler, not bugs — 100%-scrml roadmap):** DF-8 (cross-scrml `.scrml` import rewrite in lib mode); subprocess primitive (absent from `scrml:process` → jj wrapper stays JS, AND the AST-merge production driver can't spawn `scrml semdiff` yet).

## Headline S19 outcome — #6b semdiff INTEGRATED (§4.4-v3 boundary CLOSED)

**scrml landed the #6b semantic-diff primitive** (`scrml semdiff <base> <head> [--json]`, `780e4342` PR #91) — the compiler classification giti's S18 AST-merge *measured boundary* hit a wall on. **Integrated this session as slice-4** (`docs/ast-merge/prototype/slice4-semdiff/` + write-up `docs/ast-merge/slice4-semdiff-v3-validation.md`):

- The driver loosens the structural merge to combine **disjoint glue edits** (which *can* silently produce a type-break), then gates the candidate `M` with `scrml semdiff base M --json`, keying on **`diagnostics.added`** (errors M has that neither side had) = **giti-spec §4.4 v3 verbatim**.
- **Measured, strictly dominates both neighbors:** CLEAN merge → git auto-merges / slice-3 falls-through-blunt / **slice-4 accepts (exit 1)**; DANGLING merge (`.Sha` vs renamed `Ref{Digest}`) → git **ships it silently** (M fails E-TYPE-063) / slice-3 blunt / **slice-4 catches E-TYPE-063, refuses (exit 2)**.
- giti's `giti-rename-use` wall is regression-pinned in scrml's fixture suite. **Confirmation note sent to scrml** (loop closed, no mis-classification to file).
- **Productization DEFERRED** — wiring the driver into `giti merge`/`giti resolve` + `giti status --merge-log` (§4.3.4) is **subprocess-gated** (production merge driver is scrml; can't spawn `scrml semdiff` yet — giti's 2026-07-05 ask). User explicitly ranked this below the prototype.

## Threads in flight (open questions for S20)

1. **GITI-037 Phase-1 watch** — when scrml's colorless-async lands, migrate the 2 lib async modules off committed `.js` + promote their `fn`s. Unblocks the last of giti's await-free/100%-scrml goal.
2. **AST-merge productization** — the §4.4-v3 layer is a proven prototype (slice-4). Next level = `giti merge`/`giti resolve` CLI wire-in + `giti status --merge-log`. Gated on the subprocess primitive; a JS-side wire-in is possible but crosses the dogfood goal — a design fork (triggers role-dpa/deliberation) the user has twice deferred. Also open: slice-5 (real diff3 on same-segment glue edits + the same semdiff gate) if a general merger is wanted — lower novelty (the gate is the proven part).
3. **100%-scrml roadmap** — blockers: subprocess primitive, §64 tool-target, DF-8, GITI-037. GITI-016 cleared this session.
4. **giti proper** — auth + multi-repo → deploy (Hosted Forge, master-list §E, M4.1). Unopened; triggers role-dpa/deliberation when it starts.
5. **E-ROUTE-001** — watch for scrml's disposition on the FYI (may refine the warning to skip numeric-literal indices / route-less modules). No giti action needed.

## Cross-repo state (S19)

- **Outbound to scrml (`../scrml/handOffs/incoming/`, standing auth, giti does NOT commit scrml's tree):**
  - `2026-07-17-1651-...-6b-semdiff-integrated-boundary-closed.md` — #6b loop closed from the merge side; primitive verified, nothing to file.
  - `2026-07-18-1105-...-e-route-001-overfires-regex-capture-pure-lib.md` — P3 FYI + repro.
  - Both untracked in scrml's tree awaiting its next boot.
- **Inbound:** all drained at boot → `handOffs/incoming/read/` (scrml 036/037 reply · flogence #6b converged · scrml #6b semdiff LANDED).

## Push / commit / standing auth (unchanged)

- Commits + pushes to `main` require explicit per-session user auth; **PA pushes origin directly**. Pathspec commits. `bun test` is the gate (no commit hook). Standing auth: file cross-repo bug reports/FYIs to siblings without per-report permission (push still needs auth).
- **This session:** 4 work commits (above) + this wrap's commit, all pushed on user auth ("commit push" ×3, "file and wrap").

## Dogfood — regen a page / lib (verify HEAD first — it moves every compile)

```
bun run ../scrml/compiler/src/cli.js compile ui/<page>.scrml -o ui/dist                        # UI page
bun run ../scrml/compiler/src/cli.js compile src/lib/<name>.scrml -o src/lib --mode library     # lib (IN-PLACE — import paths resolve relative to -o dir; a distant -o emits long ../ paths)
```
`giti serve` compiles top-level `ui/*.scrml` → `dist/ui`, serves **127.0.0.1:3737**. Browser gate: `bun run tests/manual/browser-paint.mjs http://127.0.0.1:3737` (start serve first; now handles feed's SSE via a domcontentloaded path → true 7/7).
**Serve-management gotcha:** never `pkill -f "src/cli.js serve"` in the same command that starts serve — the pattern matches the running command's own shell → self-kill (exit 144). Kill via `lsof -ti tcp:3737 | xargs -r kill`.

## S19 WRAP

- **Tests:** 375 / 0 / 0 (14 files).
- **Landed + pushed:** GITI-036 re-verify + GITI-016 cleanup + inbox drain (`18e9bae`) · **slice-4 semdiff §4.4-v3** (`555b5dd`) · browser-paint SSE fix → true 7/7 (`635e514`) · **fn-promotion sweep** 21 fns/12 modules (`64883a8`) · this wrap (repro-34 + docs + maps).
- **Dogfood re-verification audit** @ `99ae45ca`: 15/17 lib compile clean (2 fails = GITI-037 async modules, expected) + 7/7 UI compile + 7/7 browser-paint + 375/0. No regression on the churning compiler. Only finding: E-ROUTE-001 (filed P3).
- **Maps:** refreshed (6c). **6b** worktrees: none created this session. **6d:** N/A (no `@generated` in giti).
- **user-voice:** no new durable directives — this session's user messages were task drives ("quick wins then semdiff", "commit push send note", "keep going", "keep pushing PAs choice", "file and wrap").
