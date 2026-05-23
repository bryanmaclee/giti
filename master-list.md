# giti — Master List

**Purpose:** Live inventory of the giti collaboration platform.

**Last updated:** 2026-04-22 (S7 — GITI-010 filed + fixed by scrmlTS (Option A) + verified live; GITI-009 confirmed at runtime)

---

## A. CLI (verified S86 in new location)

**Entry:** `src/cli.js`, bin name: `giti`
**Tests:** 88 pass (81 CLI + 7 jj integration)
**Engine:** jj-lib 0.40 wrapper

### Commands (all working)

- [x][x] `giti save [message]` — save current work
- [x][x] `giti switch <name>` — switch line of work
- [x][x] `giti merge <name>` — bring another line of work in
- [x][x] `giti undo` — undo last operation
- [x][x] `giti history` — show history
- [x][x] `giti status` — show changes
- [x][x] `giti land` — ship work (compiler + tests must pass)
- [x][x] `giti init` — initialize repo
- [x][x] `giti describe <hash> <msg>` — update save description
- [x][x] `giti sync` — push + pull

### Source files

- `src/cli.js`
- `src/commands/` — 10 files
- `src/engine/index.js`, `interface.js`, `jj-cli.js`

**Total:** 1,079 LOC

---

## B. Spec

- [x][x] `giti-spec-v1.md` — 1,531 lines, debate-ratified. AUTHORITATIVE.
  - 5-function surface (save/switch/merge/undo/history) over invisible jj-lib engine
  - jj conflict-as-data
  - Layered collaboration (Landing → Stack → TypedChange)
  - Real-time keystroke conflict detection
  - scrml state types for all forge entities
  - §3.7 engine independence gate

---

## C. Tests

- [x][x] `tests/cli.test.js` — 81 tests
- [x][x] `tests/jj-integration.test.js` — 7 tests

---

## D. Docs (repo-scoped)

- [x][x] `docs/gauntlet-teams/` — reference data from teams gauntlet

**All other giti research + friction audits + debates live in `scrml-support/docs/deep-dives/`:**
- `giti-vcs-model-2026-04-09.md`
- `giti-collaboration-primitive-2026-04-09.md`
- `giti-conflict-resolution-2026-04-09.md`
- `giti-radical-doubt-2026-04-09.md`
- `giti-design-constraints-from-friction-2026-04-10.md`
- `pa-agent-git-friction-audit-2026-04-10.md`
- `git-e-platform-2026-03-30.md` (historical — before rename to giti)

---

## E. Open work

### M4.1 — Hosted Forge (target: beta tester access)
- [x][x] **Bun HTTP API (read-only)** — `/api/health`, `/api/version`, `/api/status`, `/api/history` (S3)
- [x][x] **Bun HTTP API (local-dev writes)** — `/api/save`, `/api/switch`, `/api/merge`, `/api/undo` gated on `--local-dev`, bound 127.0.0.1 (S3)
- [x][x] **Compiler gate in `land`** — resolves `$SCRMLTS_PATH` or `../scrmlTS`, globs `.scrml`, skips when none (S3)
- [x][x] **Web UI — status dashboard** — `ui/status.scrml` (540 LOC) live end-to-end S7; CSRF bootstrap verified in browser after GITI-010 fix. All three loaders (status/history/bookmarks) render on first page load.
- [x][x] **Web UI — history timeline** — `ui/history.scrml` ships dedicated timeline page. `loadTimeline` server fn fetches 50 entries; CSRF bootstrap+retry verified via curl (S7).
- [x][x] **Web UI — bookmarks** — `ui/bookmarks.scrml` ships full bookmark listing including remote-tracking. `loadBookmarkList` server fn → `engine.listBranches`; CSRF bootstrap+retry verified (S7).
- [x][x] **Web UI — shared theme** — `ui/theme.css` (hand-written) carries shared chrome. `compileUi` copies it into `dist/ui/` and post-injects `<link rel="stylesheet" href="theme.css">` into every compiled HTML head before the per-page CSS link (cascade: theme = base, page = overrides). history/bookmarks trimmed to page-specific CSS only. status.scrml retains its own standalone chrome — compatible via later-in-cascade override. (Tried `@import url('theme.css')` inside scrml `#{}` first; scrml's CSS parser mangles at-rules — HTML link injection is the workaround.)
- [x][x] **Web UI — diff viewer** — v1 shipped: `ui/diff.scrml` with two-pane layout (change picker left, diff pane right). URL-driven selection via `?change=<id>`; client reads `URLSearchParams(location.search)` and passes as server-fn arg. New engine primitive `engine.diffChange(changeId)` wraps `jj diff -r <id>`. Compiler's internal `route.query` injection turned out to be author-inaccessible (E-SCOPE-001); client-side URL read is the author-accessible route. Nav link across all four pages.
- [ ][ ] **Web UI — diff viewer + file browser**
- [ ][ ] **Web UI — landing dashboard** — compiler gate results, test results, landing queue
- [x][x] **Compile-on-serve pipeline** — Bun.serve compiles `ui/*.scrml` → dist, serves at `/` (S3)
- [x][x] **scrml per-file fetch composition** — `composeScrmlFetch` + `loadScrmlHandlers` wired into `createHandler`/`startServer`; first-match-wins, null falls through to `/api/*` (S6, commit `c530779`)
- [ ][ ] **Auth + multi-repo** — user accounts, repo creation, access control (blocks non-local hosting)
- [ ][ ] **Deploy** — Fly.io or VPS (blocked on auth)
- [ ][ ] **GAP-1–11 implementations** — content-loss detection, protected contexts, granular undo (remaining)
  - [x][x] **GAP-6 `giti check`** — Spec §9.6. CLI dry-run for landing. Default = compiler + tests. `--quick` = compiler only. `--diff` = list .scrml files changed in working copy (no compile/test). Exit 0/1. `src/commands/check.js`. 13 tests pass.
  - [x][x] **GAP-8 `giti history --since`** — Spec §2.5 normative #6. Time-window filter. Durations: `30m`/`2h`/`1d`/`7d` (positive integer + `m|h|d`). Filters client-side after engine fetch (cap 1000). `parseDuration` + `parseTimestamp` exported helpers. 21 tests pass (parseDuration / parseTimestamp / CLI integration).

### G. Dogfood findings — scrml-as-logic (S10)

User direction: "scrml is not just for ui … if it can be written in js, it should be writeable in scrml. we need to dogfood the whole language."

**First experiment (S10 slice 6):** Ported `parseDuration` + `parseTimestamp` from `src/commands/history.js` to `src/lib/duration.scrml`. Compiled with `scrml compile … --mode library`. Re-imported into history.js via `import { parseDuration, parseTimestamp } from "../lib/duration.js"`. All 21 history tests pass against the scrml-authored implementation.

**What worked unmodified:** `typeof`, regex literals, `s.match(/.../) `, `parseInt`, object index `{...}[key]`, unary `+` coerce, `new Date(...)`, `.getTime()`, string `+` concat, `is not` absence check (lowered correctly to `(x === null || x === undefined)`), early returns, comments.

**Holes / friction surfaced (not bugs):**

- **DF-1: `--mode library` is opt-in.** Default `browser` mode mangles function names (`_scrml_makeCursor_1`) and emits no `export`, so .scrml output is unimportable from existing JS. Library mode emits proper ESM with names preserved. Discoverability + ergonomics: a `// @scrml-mode library` directive (or a `<library>` marker) would let the compile-gate pick the right mode automatically.
- **DF-2: Compile-gate uses browser mode.** `giti check` / `giti land` invoke `scrml compile <file>` with no mode flag → browser default for every file, including pure-logic files. So the gate validates the file COMPILES but produces output we don't use. We manually re-run with `--mode library` to get the import-target. Friction; fix is automation, not language work.
- **DF-3: `${ }` indent overhead.** Canonical shape for pure-logic files puts everything inside a single `${ ... }` block, so all top-level code lives at 4-space indent. Compiles fine; cosmetic.
- **DF-4: Re-export shim needed.** Existing JS tests import `parseDuration` from `history.js`. To keep tests untouched, history.js does `export { parseDuration, parseTimestamp }` re-export of the scrml-compiled module. Minor; an `export *` form would shrink it. Probably already supported — untested.
- **DF-5: Numeric separators untested.** Original JS used `60_000` / `3_600_000`. I removed underscores in scrml (used `60000`). Unknown whether scrml accepts numeric separators in literals.

**Not-bug behavioral note:**
- In library mode, `==` is left as `==` in output (not lowered to `===` per GITI-012's primitive shortcut). Either library mode skips the lowering, or `parseInt(...)` return type couldn't be proven primitive. JS semantics of `==` for the values in play are identical to `===` here; no behavioral change.

**Status:** First scrml-authored module shipped in giti's runtime path. Dogfood pipeline functional.

**Second port (S10 slice 7):** `parseStatus` (jj-status parser, ~50 LOC) → `src/lib/parse-status.scrml`. New surface exercised cleanly: for-of, `continue`, ternary chain, `let` + `not` (lowered to `null`), regex `.match` with capture groups + `is some` check, regex `.test(...)/i` case-insensitive, `!str.startsWith(...)` negation, short-circuit `&&`, object shorthand. No holes. Re-export shim in `src/commands/status.js` keeps all 17 callers unchanged.

**Third port (S10 slice 8):** glob-matching helpers (`normalizeRelPath`, `matchGlob`, `isPrivatePath`, `partitionByScope`, internal `globToRegExp`) → `src/lib/scope-match.scrml`. ~100 LOC. Exercises while-loop with hand-managed `i = i + 1`, string concat with `+=`-style accumulator, dynamic `new RegExp(...)`, multi-branch `if`/`else if`/`else`, `String.indexOf(needle, from)` two-arg form. Re-export shim in `src/private/scope.js` retains 7 callsites.

**Holes found in slice 8 — DOWNGRADED in slice 9:**

- **DF-6 (downgraded → discoverability)**: bare `node:path` rejected with `E-IMPORT-005`. scrml requires `scrml:` (stdlib), `./...scrml` (relative), or `vendor:...` (shim'd). BUT scrml's stdlib is broad — `scrml:path` exists and exposes `sep`, `join`, `resolve`, `dirname`, `basename`, `extname`, `relative`, `normalize`. Original "hole" was just me not surveying stdlib. `scrml:path` import in slice 8's `scope-match.scrml` compiles cleanly and produces a `_scrml/path.js` sibling at runtime. Catalogued scrml stdlib coverage: `fs`, `path`, `regex`, `crypto`, `http`, `time`, `host`, `process`, `format`, `data`, `auth`, `oauth`, `cron`, `redis`, `router`, `store`, `test`, `compiler`.
- **DF-7 (still real but scoped)**: `vendor:foo` requires a hand-authored `src/vendor/foo.scrml` shim. Per-package setup tax — only matters for npm packages NOT in scrml stdlib.

**Fourth port (S10 slice 9):** `extractSince` + `parseSyncArgs` → `src/lib/cli-args.scrml`.

**First REAL compiler bug found in dogfood — GITI-015**: `x is some ? a : b` in TERNARY position fails to lower when LHS is a computed member access (`args[i + 1] is some ? ... : ...`). The same `is some` in if-predicate position (even with computed access) lowers correctly. Author workaround: hoist the computed access into a `const next = args[i + 1]` local first. Filed to scrmlTS as `2026-05-23-0703-giti-to-scrmlTS-giti-015-is-some-ternary-with-computed-lhs.md` with sidecar repro `ui/repros/repro-11-is-some-ternary.scrml`.

**Slice 9 also incidentally surfaced a JS-module-semantics gotcha** (not a scrml bug): `export { foo } from "./bar.js"` is re-export ONLY — it doesn't bind the name locally. If the module also *uses* the imported name, you need `import { foo } from "..."; export { foo };`. Caught fast (test red within seconds); fixed in the same slice.

**Slices 10–11 added** generateMessage, parseSaveFlags, bookmarksForPush + PUBLIC_BOOKMARK/PRIVATE_BOOKMARK constants, formatStatus. Exercised: template literals `${var}`, `.split.pop()` chain, `.filter(arrow).length`, `.join`, conditional embed inside template, `export const`, destructuring function params, unicode codepoint `⚠` inside template. All clean.

**Slice 12 — `friendlyError` port surfaced TWO new compiler bugs:**

- **GITI-016 (open)**: variable name `match` triggers `E-SCOPE-001: Undeclared identifier is` when combined with surrounding context (still resists single-construct minimization; reliable repro at `ui/repros/repro-12-match-identifier-parse-confusion.scrml`). Workaround: rename `match` → `m`. Hypothesis: `match` is also a scrml markup keyword (`<match>` for if-else lowering) and the parser gets confused about which token to expect.
- **GITI-017 (filed)**: SILENT CORRUPTION class — `not` keyword substitution is applied INSIDE regex literals. `/not a jj repo/i` → `/!a jj repo/i` (boolean-negation lowering). `/(not) ...` → `/(null) .../` (absence-sentinel lowering). Compiles clean, parses clean, runs the wrong regex. In friendlyError, 3 patterns were corrupted; only 1 was caught by tests. Repro at `ui/repros/repro-13-not-keyword-replaced-inside-regex.scrml`. Workaround: split the token via a one-char class — `/n[o]t a jj repo/i` survives.

**Dogfood scoreboard end S10 slice 12**:
- 8 scrml-authored modules in giti's runtime: duration, parse-status, scope-match, cli-args, save-message, bookmarks, format-status, friendly-error
- ~365 LOC of scrml shipping
- 3 real compiler bugs filed upstream: GITI-014 (UI), GITI-015 (is-some ternary), GITI-016 (match-id), GITI-017 (regex not-substitution)
- All Dogfood-Friction items DF-1 through DF-7 still catalogued; DF-6 downgraded (scrml:path stdlib)
- 371 pass / 0 fail throughout
- [x][x] **Private scopes slice 1** (spec §12) — `.giti/private` manifest I/O, glob matching, `giti private {add,remove,list}` commands, `land` refusal on private diff, 40 tests
- [x][x] **Private scopes slice 2** — remote scope config (`.giti/remotes.json`), `giti remote {add,remove,set-scope,list}`, `giti link-private`, `giti sync --remote NAME`, push refusal on public remote when working copy has private changes, private→public scope flip requires `--unsafe`. 48 tests.
- [x][x] **Private scopes slice 3** — engine primitives (`setBookmark` with create-fallback, `bookmarkExists`, `changedFilesInRange`); save-time scope classification + bookmark routing (`main` + `_private`); mixed-commit refusal with clear error; commit-range-aware push safety. 33 new tests (22 routing + 11 engine).
- [x][x] **Private scopes slice 4** — engine `push({remoteName, bookmarks})` + `fetch({remoteName})` primitives; sync computes bookmarks-to-push from remote scope (public → [main], private → [main, _private]); `link-private` auto-creates `_private` bookmark at `bookmarks(main)`; `.giti/private` manifest un-ignored (rides `_private` via slice 3 routing). 16 new tests.
- [x][x] **Private scopes slice 5** — `engine.split` + `engine.newChange` primitives; `giti save --split` auto-splits mixed WC into two commits (public + private) and advances main + _private accordingly; `giti private status` annotates pending changes by scope with bookmark-advance hints. 25 new tests.
- [ ][ ] **Private scopes slice 6** (optional) — `giti private check <pattern>` dry-run, real-jj integration harness, fetch-side `_private` auto-tracking, OQ-9 retroactive privatization
- [ ][ ] **Engine independence gate** — when scrml compiler does AST-level conflict resolution, revisit jj

### UI policy (S3)
- Web UI is **scrml-only** — no vanilla HTML/JS fallback
- Compiler bugs blocking the UI → P0 on scrmlTS (cross-repo escalation via user)
- See pa.md "compiler bug escalation path"

### giti-blocking compiler bugs

**Status (S6, 2026-04-21):** All originally blocking bugs now fixed by scrmlTS. UI work unblocked. One cosmetic issue (GITI-006) remains open.

Batch 1 — sent 2026-04-20 12:10 → `scrmlTS/handOffs/incoming/2026-04-20-1210-giti-to-scrmlTS-server-function-codegen-bugs.md`. Compiler version at send: `acc56be` (S32 phase 3c). All 5 fixed by scrmlTS commits `881b411` / `e585dba` / `e5f5b22` / `d23fd54`; verified PASS against current tip.

- [x][x] **GITI-BLOCK-001** — `<request>` tag emitted empty-URL fetch + unawaited promise in reactive. Repro: `ui/repros/repro-01-request-minimal.scrml`
- [x][x] **GITI-BLOCK-002** — `E-SCOPE-001` false positive on `import { x } from '.js'` inside server-function body. Repro: `ui/repros/repro-02-js-import.scrml`
- [x][x] **GITI-BLOCK-003** — server-only imports leaked into `.client.js`
- [x][x] **GITI-BLOCK-004** — `lift <bare-expr>` in server function lowered to `document.createTextNode` on the server
- [x][x] **GITI-BLOCK-005** — `${serverFn()}` in markup fired once at module top, never re-wired to DOM

Batch 2 — sent 2026-04-20 16:14 → `scrmlTS/handOffs/incoming/2026-04-20-1614-giti-to-scrmlTS-two-new-bugs-from-status-scrml.md`. Both fixed by scrmlTS commits `b8f3b51` + `3f79d71`.

- [x][x] **GITI-007** — CSS bare-tag descendant combinator (`nav a { }`) misparsed as `prop: ; selector { }`. Repro: `ui/repros/repro-04-css-bare-tag-compound.scrml`
- [x][x] **GITI-008** — lift-branch text tokens emitted as separate `createTextNode` calls, stripping whitespace ("Hello world" → "Helloworld"). Repro: `ui/repros/repro-03-lift-whitespace.scrml`

**Open (cosmetic only):**
- [ ][ ] **GITI-006** — markup `${@var.path}` emits a bare module-top `_scrml_reactive_get(...).value` that throws `undefined.path` before async reactive init resolves. Workaround: pre-seed `@state` with full default shapes. Applied in `ui/status.scrml`. Low-priority — filed as "ride or ticket, your call."

**Open (UI-blocking):**
- [x][x] **GITI-009** — CLOSED upstream S8 (workaround removed).
- [x][x] **GITI-011** — CLOSED upstream S8 (workaround removed).
- [x][x] **GITI-010** — Compiler-emitted CSRF scheme was not bootstrappable. Filed S7 with live server-log trace + minimal repro (`ui/repros/repro-05-csrf-bootstrap.scrml`). scrmlTS shipped Option-A fix same session: server now `Set-Cookie`s on 403, client wraps every server-fn in `_scrml_fetch_with_csrf_retry` (single retry). Commit `40e162b`, scrmlTS HEAD `adbc30c`. Verified end-to-end via live `giti serve` browser trace S7: `403+Set-Cookie → 200` per call, three loaders complete on first page load. Out of scope: auth-middleware CSRF path (separate fix).
- [x][x] **GITI-012** — CLOSED S10 (verified against scrmlTS `cbfefef`). server-fn `==` helper missing → fix landed scrmlTS `6ba84be` (S41). repro-08 compiles clean, lowers `==` on primitives to `===`. Workaround removed from `ui/land.scrml`.
- [x][x] **GITI-013** — CLOSED S10 (verified against scrmlTS `cbfefef`). Arrow body `f => ({...})` paren-stripping → fix landed scrmlTS `0af4eaf` (S41). repro-09 compiles clean. Workaround (explicit for-loop+push) replaced with natural `.map()` form in `ui/land.scrml`.

**Compile drift (closed S10):**
- [x][x] **DRIFT-1** — CLOSED S10 (scrmlTS `cbfefef`). All 5 UI pages had `null` literals (carryover from before scrml tightened §42.7 to require `not` for absence). Mechanical sed substitution `: null` → `: not` across `status`, `history`, `bookmarks`, `diff`, `land`. All 5 now compile clean; tests still 324/0.

**Open (UI-blocking, filed S10):**
- [ ][ ] **GITI-014** — Residual of GITI-013: the **zero-arg** arrow shape `() => ({...})` returning an object literal still loses parens in client-emit. Compiles fine, parses fails at runtime (`Uncaught SyntaxError: Unexpected token ':'`). Affects every reactive-state declaration with an object initializer (`@var = { ... }`). All 5 giti UI pages currently regress — pages render empty defaults; awaited fetches never wire to DOM because reactive init throws. Repro: `ui/repros/repro-10-zero-arg-arrow-object-init.scrml`. Filed to scrmlTS 2026-05-23 (`giti-to-scrmlTS-giti-014-zero-arg-arrow-object-init.md`).

### Lesson from GITI-010 (narrow)
If recompilation-after-filing shows the bug gone, the fix may have just shipped on the upstream — check `git log` in scrmlTS for commits touching the relevant codegen since the report time before concluding the original report was wrong. GITI-010's 0805 "retraction" mis-attributed a fresh upstream fix (`40e162b`, pushed ~5 min earlier) as "bug was never there." scrmlTS explicitly flagged the self-flagellation as over-tuned; dated SHA-stamped reports are adequate and stale-dist is normal. The 0814 corrected ack supersedes both the retraction and the mis-framing.


### Cleanup (post-split)
- [ ][ ] Non-compliance audit
- [ ][ ] Cold project map

---

## F. Cross-repo

- **scrmlTS** — compiler gate target
- **scrml-support** — all giti research + history
- **scrml8** — frozen archive
