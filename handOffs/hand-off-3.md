# giti — Session 3 Hand-Off

**Date:** 2026-04-11
**Next hand-off filename:** `handOffs/hand-off-3.md`

## Caught-up state (from sessions 1-2)
- Split from scrml8 complete
- CLI: 10 commands, 1,079 LOC, jj-lib 0.40 wrapper
- Spec: `giti-spec-v1.md` ratified, 1,531 lines
- S2 cold project-mapper run: 0 non-compliant docs
- 2 pre-existing risks in `error.map.md` (land hardcoded path; fragile sync.js detection)

## Session 3 work — shipped

### 1. Bun HTTP API scaffold
- `src/server/index.js` — `createHandler` factory, `Bun.serve` wrapper, always bound 127.0.0.1
- Read routes: `GET /api/health`, `/api/version`, `/api/status`, `/api/history`
- Write routes: `POST /api/save`, `/api/switch`, `/api/merge`, `/api/undo` — gated on `localDev` (no auth yet)
- `src/commands/serve.js` → `giti serve [--port N] [--local-dev]` + `GITI_LOCAL_DEV=1` env
- `tests/server.test.js` — 33 route tests

### 2. `land` compiler gate (closes S2 risk #1)
- `resolveCompilerPath` — `$SCRMLTS_PATH` env or `../scrmlTS` sibling
- `findScrmlFiles` — Bun.Glob for `**/*.scrml` under cwd
- `runCompilerDefault` rewritten — shells `bun run <cli.js> compile <files>`, skips gate when no `.scrml` files
- `tests/land.test.js` — 6 tests for path resolution + glob

### 3. scrml UI compile-on-start pipeline
- `src/server/compile-ui.js` — shells scrmlTS compiler, emits `dist/ui/`, throws on compile error (fail-loud per escalation policy)
- `startServer` now async; compiles before binding
- Static file serving for non-`/api` GETs from `dist/ui/` with MIME types + path-traversal guard
- `giti serve` prints "Compiling UI…" banner + friendly escalation hint on compile failure
- `ui/status.scrml` iteration 1 — static shell (dark theme)
- 7 static-UI tests

### 4. Policy + documentation
- `pa.md` — added "giti UI is scrml-only; compiler bugs that inhibit giti are P0 in scrmlTS; escalation path through user"
- `master-list.md` — new UI policy section, "giti-blocking compiler bugs" tracker
- User appended cross-repo dropbox mechanism to `pa.md` (~L143–194) as a narrow file-drop for PA-to-PA coordination (not a broader architectural debate — PA initially misread this)

## Session 3 work — iteration 2 (partial) + first compiler bug discovery

**Goal:** wire `ui/status.scrml` to real data via scrml's native `server function` + `<request>` pattern.

**Good news — scrml design fits giti perfectly:**
- `import { getEngine } from '../src/engine/index.js'` in a `.scrml` file IS preserved in the generated `.server.js` — the compiler lets giti's engine module be called from `server function` bodies
- Generated `.server.js` exports mountable `{ path, method, handler }` objects — can be mounted into existing `Bun.serve` alongside `/api/*`
- Compiler auto-generates double-submit cookie CSRF protection

**Blocker — first confirmed giti-blocking compiler bug:**

**Bug GITI-BLOCK-001 — `<request>` state machine not wired to route fetch.**

Repro: `ui/repros/repro-01-request-minimal.scrml` (15 lines, single `server function` + single `<request>`).

The compiler emits both:
1. `_scrml_fetch_loadValue_4()` — correct URL, method, CSRF header. **Never called.**
2. `_scrml_request_req1_fetch()` — actually called by `<request>` mount. Body: `fetch("", { method: "GET" })`. Empty URL, wrong method.

Impact: all client-side data fetching in giti UI is broken. Cannot proceed past static shell.

**Secondary issues observed in the fuller status.scrml (not yet minimized, logged for follow-up):**
- `<#statusReq>.data is not` lowers to unparseable JS (`. (data === null || data === undefined)`)
- Markup inside nested `${}` `lift` conditionals leaks as raw source fragments into `.client.js`
- Server-only imports (`getEngine`, `parseStatus`) appear in `.client.js` too — will 500 in browser

**Status:** revert status.scrml to iteration-1 static shell? Or leave iteration-2 source in place as the "reproduce secondary issues" sample? Left iteration-2 source in place for now — `bun run ... compile ui/ -o dist/ui/` still succeeds, just the resulting client.js is broken. Revisit at next session start.

## Escalation pending user approval

Dropbox message drafted to be written into `/home/bryan/scrmlMaster/scrmlTS/handOffs/incoming/` — not yet sent (awaiting user sign-off on exact content). Content summarized in the handoff above:
- GITI-BLOCK-001 as the P0 with repro path
- Secondary issues listed as "related, will file separately if needed"
- `needs: action`

When user approves, filename:
`2026-04-11-<HHMM>-giti-to-scrmlTS-request-codegen-unwired.md`

## Test status (end of session 3)

`bun test` — **118 pass, 0 fail, 9 skip** (120 total across 4 files)
- `tests/cli.test.js` — 81 tests (pre-existing engine tests, untouched)
- `tests/jj-integration.test.js` — 7 tests (pre-existing, untouched)
- `tests/server.test.js` — 33 tests (NEW — routes, local-dev gate, static UI)
- `tests/land.test.js` — 6 tests (NEW — compiler path resolution, glob)

## Next up (S4)

1. **Confirm + send the dropbox escalation** for GITI-BLOCK-001 (first real use of the cross-repo dropbox)
2. **Decide giti work while compiler fix lands:**
   - Option A: narrow the secondary issues into individual repros (repro-02, repro-03, repro-04) so scrmlTS gets full picture in one handoff
   - Option B: pick up non-`<request>`-dependent work (revisit `sync.js` fragile detection — S2 risk #2; GAP-1–11 implementations; history-page layout sketch in HTML-only iteration-1 style)
   - Option C: (rejected by policy) hand-write the client JS to unblock the demo
3. **When GITI-BLOCK-001 is fixed in scrmlTS:** resume status.scrml iteration 2; add route-mounting in `server/index.js` to mount `.server.js` route exports at `/_scrml/*`; verify end-to-end in browser
4. Long-standing: Web UI history timeline, diff viewer, landing dashboard, auth design
