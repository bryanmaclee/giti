# giti — Session 18 Hand-Off

**Date:** 2026-07-15
**Previous session file:** `handOffs/hand-off-17.md`
**Next hand-off filename:** `handOffs/hand-off-18.md`

## Caught-up state (entering S19)

- **Compiler:** `../scrml`. Verified this session against **`7d5fda26`**; scrml moved to **`211dc076`** by wrap — re-verify HEAD at next compile (it moves fast, ~daily). Language v0.7.x. Conformance-freeze churn is live (fn-purity §48, async/await ban, Tailwind-class lint, structural-eq).
- **CLI:** 15 commands, **375 pass / 0 fail** (14 files, 791 expect). Unchanged.
- **UI dogfood:** 7 scrml pages, **7 of 7 PAINT in a browser** — the first time ever (S15/16/17 chased this). status·history·bookmarks·diff·land·live via the main harness; **feed renders live SSE** (State: ok · Changed files: N) via an SSE-aware probe. Headline S18 outcome.
- **Git:** clean on `main`, HEAD **`513ef41`**, **ahead 3** of origin at wrap-start (this wrap adds hand-off/master-list/maps commits, then push).
- **Maps:** refreshed via project-mapper at wrap (6c). Watermark → S18 HEAD.
- **giti scrml idiom:** UI is now **`await`-free AND `try/catch`-free**. Lib layer still has async/await in 2 modules (blocked — see GITI-037).

## GITI-bug ledger — CURRENT TRUTH (reconciled S18)

**CLOSED / FIXED this session (verified against 7d5fda26):**
- **GITI-035** (feed SSE `${@cell = serverGen()}` null-clobber) — **FIXED upstream.** Emit no longer clobbers the typed seed; feed seeds `Phase.Idle` + the SSE callback sets streamed data. feed renders live end-to-end (browser-verified). This closed the 7/7 UI goal.
- **GITI-016** (`match` identifier → E-SCOPE-001) — **verified FIXED.** repro-12's exact trigger (`const match = raw.match(...)`) compiles clean. **Workaround `match`→`m` in `src/lib/friendly-error.scrml:41` is now REMOVABLE** (not yet done — quick S19 idiom cleanup). Also a 100%-scrml roadmap blocker now cleared.
- **repro-26** (`safeCall !{}` under `--mode library`) — confirmed FIXED; drove the remotes try/catch migration.

**OPEN — filed this session (both Bug-51 class, in `../scrml/handOffs/incoming/`):**
- **GITI-036** (P1) — status: a `==` in a client markup-interpolation (`${ d.scope == "empty" ? … }`) lowers to `_scrml_structural_eq(...)` in `*.client.js`, but the helper is **tree-shaken OUT of the client runtime bundle** → `ReferenceError` on match re-dispatch. status still paints (throw caught by subscriber-error handler); reactive updates error. Reproduces standalone (`scrml compile ui/status.scrml`). Idiomatic source RETAINED. **Watch for fix → re-verify status paints clean.** Diagnostic in the report: a near-identical minimal repro does NOT reproduce (helper included transitively) → the `==`→structural-eq lowering doesn't seed the runtime-inclusion set.
- **GITI-037** (P2, gap/question) — **no async idiom for plain (non-server) library functions.** `async`/`await` are hard errors (E-ASYNC/E-AWAIT-NOT-IN-SCRML), but a plain `export function` does NOT auto-await `safeCallAsync` (only `server function`s do, where the compiler owns the async wrapper). So `save-routing-async.scrml` / `server-helpers.scrml` can't migrate — recompiling them with safeCallAsync returns pending Promises (14 tests failed → reverted). They stay on their committed async/await `.js` (latent; works at runtime, won't recompile). **Blocks the last of giti's UI+lib await-free goal + a 100%-scrml step. Awaiting scrml's intended async-utility idiom.**

**Still OPEN (unchanged):**
- **GITI-006** (cosmetic `${@var.path}` pre-init) — untested, low-priority.

**Still BLOCKED (compiler, not bugs — 100%-scrml roadmap):**
- **DF-8** — cross-scrml `.scrml` imports NOT rewritten in `--mode library` (emit keeps `./x.scrml`) → the `.js`-import workaround stays (3 lib + 7 UI files). Re-verified still-blocked.
- **subprocess primitive** — absent from `scrml:process` (cwd/env/argv/platform/exit/uptime/memory only). jj wrapper (~600 LOC JS) stays JS.

## Threads in flight (open questions for S19)

1. **flogence #6b co-sign — REPLY SENT** (`../flogence/handOffs/incoming/2026-07-15-from-giti-reframe-cosign-6b-grounded-concurrency.md`). giti co-signs the converged **merge+review** #6b (sound cosmetic-vs-behavioral classification). Grounded in this session's measured boundary (not analysis). **Ball with flogence** to fold merge+review into one ask; **scrml already ledgered #6b agreed-in-principle behind its V1 freeze** (timing on scrml's clock). Also answered: the reframe (giti = collaboration-layer substrate; adopted with the amendment that conflict-as-data + private-scopes already differentiate today, AST-diff is the *semantic-tier* keystone) + concurrency (jj dissolves the local-mutex leg, not the cross-machine CAS; offered an `stm-concurrency-expert` DD).
2. **AST semantic merge (§4.3) — consumer-side ceiling REACHED.** `docs/ast-merge/`: slice 1 (struct field-add) + **slice 2 (enum variant-add, re-parse layer dropped)** + **slice 3 (multi-entity same-file, unified `mergeMembers`)** all built + gate-verified on shipped #6 member-emission. Everything past this (rename↔use / retype / behavioral) is **#6b-gated**. Next: either **productize** (wire a driver into `giti resolve` / `giti status --merge-log`, §4.3.4) or wait for #6b. Full write-up: `docs/ast-merge/slice2-enum-merge-and-measured-boundary.md`.
3. **GITI-036 / GITI-037** — watch scrml for fixes/answers (see ledger). 037 unblocks the 2 lib modules' async migration; 036 makes status paint clean.
4. **GITI-016 idiom cleanup** — restore `friendly-error.scrml` `m`→`match` (fixed upstream). Quick.
5. **browser-paint harness** — SSE/`networkidle` limitation: `feed` times out in the main harness (EventSource keeps the connection alive). Add a `domcontentloaded`+settle path for SSE pages so feed is verifiable in the main run. Small giti-side fix.
6. **100%-scrml roadmap** — giti is ~50/50 scrml/JS (~2,430 LOC scrml: 7 UI + 17 lib; ~2,600 LOC hand-written JS: engine/CLI/server). Blockers: subprocess primitive, §64 tool-target, DF-8, GITI-037. GITI-016 cleared this session.
7. **giti proper** — auth + multi-repo → deploy (Hosted Forge, master-list §E, M4.1). Unopened; triggers role-dpa/deliberation when it starts.

## Cross-repo state (S18)

- **Outbound to scrml (`../scrml/handOffs/incoming/`, standing auth, giti does NOT commit scrml's tree):** GITI-036 (structural-eq treeshake) · GITI-037 (no async-utility idiom). Both untracked in scrml's tree awaiting its next boot.
- **Outbound to flogence (`../flogence/handOffs/incoming/`):** the #6b grounded co-sign + reframe + concurrency reply.
- **Inbound:** all drained. The flogence S30 #6b message → `read/` (replied). The two 2026-06-24 FYIs → `read/` (already committed).

## Push / commit / standing auth (unchanged)

- Commits + pushes to `main` require explicit per-session user auth; **PA pushes origin directly**. Pathspec commits. `bun test` is the gate (no commit hook). Standing auth: file cross-repo bug reports to siblings without per-report permission (push still needs auth).
- **This session:** 3 work commits (`af84b1e` ast-merge · `2fae229` idiom migration · `513ef41` inbox) + this wrap's commits, pushed on user auth ("wrap and push").

## Dogfood — regen a page / lib

```
bun run ../scrml/compiler/src/cli.js compile ui/<page>.scrml -o ui/dist          # UI page (verify HEAD first)
bun run ../scrml/compiler/src/cli.js compile src/lib/<name>.scrml -o src/lib --mode library   # lib
```
`giti serve` compiles top-level `ui/*.scrml` → `dist/ui` (fail-fast; skips `repros/`), serves on **127.0.0.1:3737**. Browser gate: `bun run tests/manual/browser-paint.mjs http://127.0.0.1:3737` (start serve first; server must outlive the paint; land needs the 45s budget). **feed** needs the SSE-aware probe (domcontentloaded, not networkidle) — see thread 5.

## UI server-fn idiom (S18 — the new canonical shape)

```scrml
server function loadX() {
  const engine = getEngine()
  const res = safeCallAsync(() => engine.X(...)) !{
    | ::Thrown(msg) :> ({ ok: false, error: msg })
  }
  if (!res.ok) return XPhase.Failed(res.error)
  return XPhase.Loaded(res.data)
}
```
`await` is banned (E-AWAIT); the compiler auto-awaits `safeCallAsync` in server-fn context; the `::Thrown` arm coerces a host throw to the engine's `{ok:false,error}` shape so downstream logic is unchanged. Needs `import { safeCallAsync } from "scrml:host"`. **Does NOT work in a plain (non-server) function — GITI-037.**

## S18 WRAP

- **Tests:** 375 / 0 / 0 (14 files).
- **Landed + pushed:** AST-merge slices 2+3 + measured boundary (`af84b1e`) · UI await→safeCallAsync migration (0/7→7/7 paint) + remotes try/catch→safeCall (`2fae229`) · inbox drain (`513ef41`) · this wrap.
- **Maps:** refreshed (6c). **6b** worktrees: none created. **6d:** N/A (no `@generated` in giti).
- **user-voice:** no new durable directives — this session's user messages were task drives ("your rec / go / proceed / wrap and push") + the Q1/Q2 scrml-status question (answered inline) + the "hold the reply, give scrml time to cook" session decision (captured here, not a durable voice directive).
