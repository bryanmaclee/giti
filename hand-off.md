# giti — Session 16 Hand-Off

**Date:** 2026-06-23
**Previous session file:** `handOffs/hand-off-15.md`
**Next hand-off filename:** `handOffs/hand-off-16.md`

## Caught-up state (entering S16)

- **Compiler:** lives at `../scrml` (renamed from `scrmlTS` ~2026-06). As of S15: HEAD `ca712295` (s212, pkg v0.2.0, emitted self-id `scrml-0.7.0`). giti's gate resolves to `../scrml` directly; legacy `../scrmlTS`/`$SCRMLTS_PATH` kept as harmless back-compat fallback. **Re-verify compiler HEAD at next compile** (may have advanced since S15).
- **CLI:** 15 commands. **375 pass / 0 fail** across 14 test files (per S15 close).
- **Web UI:** 7 scrml pages — status, history, bookmarks, diff, land, live, feed. All rewritten to idiomatic `Phase:enum` + `<match for=Phase>` + `<each>`/`<empty>` in S15. `giti serve` works end-to-end (7/7 HTTP 200).
- **scrml-as-logic dogfood:** 17 scrml lib modules power giti's runtime.
- **Git:** clean on `main`, HEAD `e96668f`, fully synced with origin (0/0).
- **Maps:** `.claude/maps/` stamped at `b2fde19` — **15 commits STALE** (predates the S15 UI rewrite). Refresh via `project-mapper` before any dev/writer dispatch.

## Inbox at S16 start

- **Empty** (`handOffs/incoming/` has only `read/`). Last drained: S15.

## Open items carried from S15

### Compiler-bug ledger
| ID | Status |
|---|---|
| GITI-006 | open (cosmetic) — workaround DISSOLVED by S15 status.scrml rewrite (Phase enum seeded `.Loading`); underlying behavior may still exist, giti no longer triggers it |
| GITI-015 | open — `is some` ternary + computed LHS; hoist-to-const workaround retained |
| GITI-016 | open — `match` identifier `E-SCOPE-001`; rename `match`→`m` workaround retained. Why `repros/` is excluded from `giti serve` |
| GITI-027 Part-B | still NOT shipped (retested S14 @ca712295) — keep `localDev`+127.0.0.1 write-gate, do NOT relax |

### 3 codegen/RI findings FILED to scrml (S15) — awaiting reply
Filed `../scrml/handOffs/incoming/2026-06-22-1443-giti-to-scrml-three-codegen-findings.md` (needs:action). giti-side repros committed at `ui/repros/repro-24..26`:
1. `<engine>` cell can't be a server-written `<channel>`/SSE cell (`E-RI-002`) — blocks `<engine>` on channel/SSE pages.
2. `on mount { @x = watchStatus() }` (SSE binding in on-mount) → `E-CODEGEN-INVALID-JS`; workaround = module-top `${ @x = watchStatus() }`.
3. `safeCall(...) !{}` → `E-CODEGEN-INVALID-JS` under `--mode library` (fine in program mode). Blocks the idiomatic try/catch replacement in `remotes.scrml`.

### Verification debt
- **feed.scrml runtime SSE on the migrated compiler is UNVERIFIED.** Idiomatic shape compiles + serves 200, but the actual SSE event-to-cell delivery was not runtime-probed on `../scrml` post-migration. **Ledger reconciliation:** the S210 audit treated GITI-020/021 (CG-1/CG-3) as OPEN and feed as inert (GITI-026 open); this repo's master-list records GITI-020/021/025/026 all CLOSED (`8e7f18fe`/`e2dcde7b`, on scrmlTS v0.7.0 **before** the scrml migration). Not re-verified on the migrated compiler. A quick SSE runtime probe is the open follow-up.

### Carried (unchanged, low-priority)
- `../scrmlTS/` legacy checkout still on disk (superseded). Fallback in `resolve-compiler.scrml` harmless; prune only on user request.
- Optional tidy: `rm -rf src/lib/dist/` (gitignored stray build output).
- `ui/history.scrml:14` — comment says "scrmlTS rewrites…"; cosmetic.

## S16 priorities (suggested)

1. **feed.scrml SSE runtime probe** + ledger reconciliation (verify GITI-026/025 still closed on migrated compiler). Closes the only verification debt from S15.
2. **Watch for scrml reply** to the 3 filed findings (E-RI-002 / SSE-on-mount / safeCall-in-library). When fixed: drop the `<match>`-instead-of-`<engine>` deviation on live/feed, and the try/catch in remotes.scrml.
3. **giti proper** — auth+multi-repo, license, deploy roadmap (the hosted-forge blocker; master-list §E).
4. Refresh `.claude/maps/` (15 commits stale).

## Push / commit

Per `pa.md`: commits + pushes to `main` require explicit per-session user auth; **the PA pushes origin directly** (master-coordination retired 2026-05-30). Manual `bun test` is the only gate (NO commit hook installed). Use explicit pathspec commits.

## Standing authorizations
- **File legit cross-repo bug reports to siblings without per-report permission** (S15 standing auth; push still needs auth). Reports carry minimal version-stamped repro + expected-vs-actual.

## Dogfood — how to regen a scrml lib / UI page

```
# lib module (ESM, names preserved):
bun run ../scrml/compiler/src/cli.js compile src/lib/<name>.scrml -o src/lib --mode library
# UI page:
bun run ../scrml/compiler/src/cli.js compile ui/<page>.scrml -o ui/dist
```
`giti serve` compiles top-level `ui/*.scrml` → `dist/ui` automatically (skips `repros/`).

## S16 log

**SSE probe → GITI-028 (whole-UI runtime miscompile). 2026-06-23, compiler `../scrml`@`df6f747b` (s214, v0.7.0).**
Ran the deferred feed.scrml SSE runtime probe (the S15 verification debt). It uncovered a P0 compiler bug far broader than feed.

- **Finding (GITI-028, OPEN, P0):** page-local `enum` defs are emitted into the **client bundle only**, never the **server bundle**. Any `server function` referencing an enum variant (bare `X.Ok` or payload `X.Loaded({...})`) → `ReferenceError: X is not defined` at runtime. Compile + `node --check` both exit-0 → silent Bug-51 class. Regular server fn → 500; `server function*` SSE → throw swallowed by stream try/catch → **0 frames** (the "inert feed" symptom S15 wrongly dismissed as a harness artifact).
- **Blast radius: ALL 7 UI pages.** Every S15-rewritten loader is runtime-broken. The enum-typed-Phase + server-fn-returns-variant idiom is exactly what the S210 audit directed → the compiler can't compile the idiom it recommended. Regression in effect (pre-S15 plain-object loaders worked).
- **Proof:** feed SSE 0 frames as-emitted, 3 real frames with `globalThis.Phase` injected (isolates cause); `loadStatus` threw `StatusPhase is not defined` w/ valid CSRF. Minimal repro both shapes throw.
- **Ledger reconciliation RESOLVED:** GITI-026 (SSE client binding) genuinely still CLOSED — emitted `feed.client.js` wires the correct per-event callback + `addEventListener`. feed is dead for the NEW distinct server-side-enum reason, not GITI-026. GITI-025 not re-exercised (parameterless generator) but route binds `route.query` correctly.

**Disposition — user dir S16: option A (file P0, keep source, wait).**
- Filed P0 → `../scrml/handOffs/incoming/2026-06-23-1223-giti-to-scrml-enum-undefined-in-server-bundle.md` (standing auth). scrml PA picks it up / commits on its side.
- Idiomatic source RETAINED (don't contort source around a compiler bug). UI flagged runtime-broken-pending-fix in master-list (S16 section + S15 Verification correction banner). `localDev`+127.0.0.1 write-gate unaffected, stays.
- Resume UI verification when scrml ships the fix.

### Artifacts created this session (UNCOMMITTED — need user auth to commit/push)
- `ui/repros/repro-27-enum-undefined-in-server-bundle.scrml` — minimal repro (both variant shapes).
- `tests/manual/sse-runtime.mjs` — two-phase SSE runtime harness (as-emitted vs Phase-injected); reusable for post-fix re-verify.
- `master-list.md` — S16 section + GITI-028 ledger + S15 Verification correction banner + header.
- `hand-off.md` (this rotation) + `handOffs/hand-off-15.md` (archived S15).
- Cross-repo: scrml inbox bug report (in scrml's tree, committed by scrml PA).

**GITI-028 RESOLVED same day — scrml `83afdcdb` (S216), verified.**
scrml turned it around in <4h. Fix: `generateServerJs` emits page-local enum-variant objects into `*.server.js` (reachability-gated, byte-identical to client bundle) + new `E-CG-016` collision guard. **Verified on local `../scrml@5e3a1dbf`** (contains `83afdcdb`; giti compiles against this local checkout, so verified without waiting for origin push):
- all 7 pages compile exit-0, server bundles carry enum defs, every emitted JS `node --check` clean, 375/0;
- feed SSE delivers 3 real frames **as emitted** (phase-1 of the harness, no Phase crutch); `loadStatus` returns **200** with a real `Loaded` variant carrying live jj status.
- **Server-side runtime + emit verified PA-side. Full browser paint of all 7 pages = remaining USER-verify** (serve + browser pass).
- scrml fix is local-landed, **NOT pushed to scrml origin** yet (push notice will follow) — irrelevant to giti.
- Replied to scrml: `2026-06-23-1616-giti-to-scrml-bug51-verified-no-toenum.md`. Moved `2026-06-23-1537-…bug51-resolved.md` → `read/`.

**Separate scrml gap — does NOT affect giti:** `g-enum-toenum-not-lowered-server-side` (server-side `X.toEnum(row.field)` throws). giti uses zero `.toEnum(` (grep-confirmed; no `<db>`/`?{}` paths). Replied fyi — no escalation needed on giti's account.

**Browser paint (S16b) → 3 MORE client-render compiler bugs (GITI-029/030/031). compiler `7c01b22a`.**
Ran the real browser pass S15 never did — headless Chromium (`tests/manual/browser-paint.mjs`, playwright borrowed from `../scrml/node_modules`, chromium-1228) over `giti serve`, painted DOM + screenshots (`/tmp/giti-paint/*.png`). **GITI-028's server fix works (loaders 200), but 6 of 7 pages don't render.** Triaged each to a minimal repro:
- **GITI-029** — `//` comment directly before `on mount {}` → block emits as literal HTML text, hook never fires. (status: 3 loaders under a comment → stuck "Loading…".) repro-28.
- **GITI-030** — `<each>` body `${@.FIELD}` where FIELD == `key=@.FIELD` → literal `createTextNode("${_scrml_each_item.FIELD}")`. (bookmarks/diff/history key column.) repro-29.
- **GITI-031** — `<match for=P on=@cell.subfield>` dispatches the whole cell, drops `.subfield` → no arm matches → blank. (live `@snapshot.state`, feed `@status.state`.) repro-30.
- feed ALSO crashes (`null.changed`) — SSE seed-clobber, downstream of S15 finding #2.
- All Bug-51 (exit-0, node --check clean, silent). Filed one report: `../scrml/handOffs/incoming/2026-06-23-2018-giti-to-scrml-three-client-render-codegen-bugs.md`. Repros committed `ui/repros/repro-28/29/30`.
- **Disposition: option A** (keep idiomatic source, file, wait). Trivial source workarounds exist but per policy fix codegen.
- **OPEN triage item: land's blank content** not yet root-caused (on-mount fires/200, Loaded match arm content empty; NOT comment-preceded so not GITI-029). Needs a focused bisect next.

**S217 UPDATE (2026-06-24): scrml FIXED GITI-029/030/031 overnight** (verified local `../scrml@062165a5`). 029 (comment-before-on-mount) + 031 (`<match on=@cell.subfield>` deep path) confirmed fixed via repro recompile; live now renders "State: idle". **GITI-029 source workaround REVERTED** (`git checkout ui/status.scrml`) — compiler handles the original form, no workaround needed. **GITI-030 fixed BUT** §4.17: `<code>`/`<pre>` are raw-content, `${...}` ships verbatim by design → giti must move interpolated fields out of `<code>`→`<span>` (status changeId, bookmarks name, diff/history changeId). **GITI-032 still OPEN** (Current-status + land panels). **feed still crashes** (SSE seed-clobber, finding #2). Re-painted all 7 on S217: status (Bookmarks+Recent-saves render, Current-status empty), live ✅, feed ❌crash. Message `2026-06-23-2224-...FIXED.md` → read/.

— historical (now superseded by the S217 update above) —
**GITI-029 source workaround was APPLIED to status.scrml (user dir "apply the on fix").**
Relocated the comment off the on-mount lines (comment now above the seeds; blank line before the 3 `on mount` blocks). Browser-verified on the post-fix compile:
- on-mount text leak GONE; all 3 loaders fire. **Bookmarks + Recent saves panels now render real data** (was: all 3 stuck on "Loading…").
- **Two residuals surfaced** (separate from GITI-029, pre-existing, only now visible because the loaders fire):
  1. **Recent saves `${@.changeId}` column leaks** — GITI-030 (key-field). Expected.
  2. **"Current status" panel renders EMPTY** — root-caused to **GITI-032 (NEW compiler bug, filed)**: `${ cond ? <markup> : "" }` inside a `<match>` arm is broken. A single one → `E-CODEGEN-INVALID-JS`; multiple (status has five `${ d.X ? <section> : "" }` blocks) → exit-0 but `render_Loaded(d)` returns pure whitespace (all sections dropped, `d` ignored). Works at top level; `<each>`-in-arm works (so bookmarks/recent-saves render). NOT a source-rename (I tried `data`→`d`; reverted — the binding was never the cause). **Not source-fixable without abandoning the idiomatic conditional-markup pattern** (would need a restructure). Repro `ui/repros/repro-31`; filed `../scrml/handOffs/incoming/2026-06-24-0801-giti-to-scrml-conditional-markup-in-match-arm.md`.
     - Secondary latent note in that report: arm payload binds by DECLARED param name, so `<Loaded(d)>` vs `Loaded(data:…)` will mismatch once GITI-032 is fixed — align names then.
- status.scrml EDIT = the GITI-029 fix ONLY (the `data`→`d` rename was reverted). Carries a `// GITI-029 WORKAROUND` comment to revert once upstream-fixed.

### Open follow-ups carried
- **"Current status" panel** blocked on **GITI-032** (filed). Options when picked up: wait for compiler fix, OR restructure status.scrml's Loaded arm to avoid conditional-markup-in-match-arm (e.g. always-render the each-sections + drop the `${cond?…:""}` wrappers; the pure-conditional bits — clean msg / on-bookmark / mixed hint — need a different construct). Also align the `<Loaded(d)>`/`Loaded(data)` param name.
- **Watch for scrml reply on GITI-029/030/031/032** (+ the still-open S15 findings E-RI-002 / SSE-on-mount / safeCall-in-library). When fixes land: recompile + re-run `tests/manual/browser-paint.mjs` over all 7 pages (expect real paint, no `${_scrml_each_item}` leaks, no blank match, no crash).
- **Root-cause land.scrml blank Loaded content** (the one symptom not yet minimized).
- **`tests/manual/browser-paint.mjs` is the reusable browser-render gate** — the only check that catches this class (server-200 ≠ renders).
- The 3 S15 findings (E-RI-002 / SSE-on-mount / safeCall-in-library) still awaiting scrml reply — independent of GITI-028. (Note: `../scrml` HEAD `5e3a1dbf` mentions a `g-e-ri-002-targeted-diagnostic` — scrml may be working the E-RI-002 thread.)
- Everything else from "Open items carried from S15" above unchanged.
