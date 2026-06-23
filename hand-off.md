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

### Open follow-ups carried
- **Watch for scrml reply on GITI-028.** When the fix lands: recompile all 7 pages, re-run `tests/manual/sse-runtime.mjs` (expect frames as-emitted) + a loader-POST 200 check, then clear the runtime-broken flag.
- The 3 S15 findings (E-RI-002 / SSE-on-mount / safeCall-in-library) still awaiting scrml reply — independent of GITI-028.
- Everything else from "Open items carried from S15" above unchanged.
