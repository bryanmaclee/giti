# giti — Master List

**Purpose:** Live inventory of the giti collaboration platform.

**Last updated:** 2026-05-24 (S10 close — 21 slices: GITI-012/013 closed, GAP-6 + GAP-8 shipped, 17 scrml-as-logic dogfood modules, 5 compiler bugs filed (014–018, 014 fixed upstream))

---

## A. CLI

**Entry:** `src/cli.js`, bin name: `giti`
**Commands:** 15 (save, switch, merge, undo, history, status, land, init, describe, sync, serve, private, remote, link-private, **check**)
**Tests:** 371 pass / 0 fail / 0 skip (14 test files). jj 0.41 installed + colocated this session.
**Engine:** jj-cli wrapper (jj 0.41)
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
- **GITI-017 (CLOSED S11)**: SILENT CORRUPTION class — `not` keyword substitution was applied INSIDE regex literals. `/not a jj repo/i` → `/!a jj repo/i` (boolean-negation lowering). `/(not) ...` → `/(null) .../` (absence-sentinel lowering). Compiled clean, parsed clean, ran the wrong regex. In friendlyError, 3 patterns were corrupted; only 1 was caught by tests. Repro at `ui/repros/repro-13-not-keyword-replaced-inside-regex.scrml`.
  - **S11 timeline:** scrmlTS first reported closed (`f181d60a`, 0606) → re-verify found it PARTIAL (absence-sentinel fixed, boolean-negation `not `→`!` still corrupting) → reopen sent → scrmlTS confirmed + retracted (0618). **Residual fix `3341f34d` (in HEAD `fa665e9d`)** extracted the regex/comment/string fence into shared `code-segments.ts` and routed BOTH lowering sites (`rewrite.ts` absence path + `expression-parser.ts::preprocessForAcorn` boolean path) through it.
  - **CLOSED verified S11 at scrmlTS `a91ad5de`:** clean probe `const re = /not a jj repo/i` → verbatim. Full repro-13 matrix all-verbatim (`not …`, `bookmark.*not found`, `(not)`, `nothing`, `n[o]t` control). **Workaround REMOVED** — 3 `/n[o]t …/` sites in `friendly-error.scrml` reverted to `/not …/`, recompiled `--mode library`, regexes emit verbatim, 371/0 tests pass. (`remotes.scrml` had no `n[o]t` sites.)

**Slice 13** — `classifyChanges`, `planBookmarkMoves`, `splitMessages` → `src/lib/save-routing-pure.scrml`. New surface verified: object destructure with renaming `{ public: pub, private: priv }`, spread in object literal `{ ...obj, x }` (tested separately). NEW HOLE:

- **DF-8: cross-scrml imports not rewritten in library mode.** `import { x } from "./foo.scrml"` is emitted literally to the .js output. Bun tries to load the `.scrml` file as JS and fails with "Export named 'x' not found". Workaround: use `.js` extension directly in scrml source — `import { x } from "./foo.js"`. Compiles AND runs. scrml's own internal import-graph analysis doesn't track the cross-file dep this way, but for library-mode emit where each file compiles independently and the .js exists at import-time, this is fine. Discoverability concern: scrml's own scrmlTS native parser uses `.scrml` imports (`./cursor.scrml`) — those probably go through scrmlTS's own build pipeline that does the rewrite, not the public compile path.

**Slice 14** — `resolveCompilerPath` → `src/lib/resolve-compiler.scrml`. Tests default params with destructure + multi-stdlib imports (scrml:path + scrml:fs + scrml:process) + injected/default-resolution pattern. NEW BUG:

- **GITI-018 (CLOSED S11)** — only the FIRST `scrml:` stdlib import in a file got rewritten to `./_scrml/X.js` in `--mode library` emit. Subsequent imports stayed as bare `scrml:fs` / `scrml:process` URLs that Bun can't resolve. Bonus pathology: when comments preceded the imports, even the first one didn't get rewritten. Repro: `ui/repros/repro-14-multi-stdlib-import-not-rewritten.scrml`.
  - **CLOSED verified S11 at scrmlTS `3a909c1d`** (fix `32c2fd39` in `api.js::rewriteStdlibImports`). Root cause was the `^import` anchor disallowing leading indentation (only the first import is de-indented to col 0 in library emit), not a missing `/g`. Fix captures + round-trips leading whitespace and tolerates leading comments. Clean 3-import probe → all rewritten to `./_scrml/X.js`, zero bare `scrml:`. **Anchor-pattern workaround REMOVED** from all 4 sites (`resolve-compiler.scrml`, `find-scrml-files.scrml`, `scope-manifest.scrml`, `remotes.scrml`) — plain `scrml:NAME` imports restored, recompiled `--mode library` (0 bare specifiers each), 371/0 tests pass.

**Slice 15** — `remotes.js` → `src/lib/remotes.scrml`. ~120 LOC. Heavily tested surface: `JSON.parse`/`JSON.stringify`, `try { } catch { }` (parameterless), `Array.isArray`, `.find`/`.some`/`.filter`/`.map`/`.includes`, multi-stdlib with the GITI-018 anchor pattern, fs I/O (`existsSync`/`readFileSync`/`writeFileSync`/`mkdirSync`).

**NEW finding (language design, not a bug)**: `W-TRY-CATCH-IN-SCRML-SOURCE` warning — scrml's error model (§19.1) is values-not-exceptions; `try`/`catch` is not idiomatic. Compiler accepts try/catch and emits it literally to JS (works at runtime), but warns that the proper scrml idiom is:
- `safeCall` / `safeCallAsync` from `scrml:host` for JS-host throws
- `!{ ... }` failable pattern matching
- `fail` keyword for domain errors
- `?` propagation operator
- `<errorBoundary>` state type

For dogfood purposes, the warning is informational — port functions kept the JS-style try/catch. Refactoring to the scrml idiom is a follow-up; the existing `{ ok, error }` discriminated-result tuples giti returns are already a values-not-exceptions shape that maps neatly onto `!{}` failable functions.

**Note**: I briefly applied the GITI-017 char-class workaround `n[o]t` to a STRING literal by mistake — strings are NOT affected by the corruption, only regex literals. Fix reverted, scoreboard amended. **CORRECTION (S11):** that belief was WRONG. The S11 recompile sweep surfaced a latent GITI-017 string corruption in committed output — `resolve-compiler.server.js` had `"Could not find the scrmlTS compiler"` compiled to `"Could !find …"` (the boolean-negation `not `→`!` lowering hit the string). The residual fix `3341f34d` fences strings too (shared `code-segments.ts`), so recompiling corrected it. Full 17-module re-sweep found this was the ONLY lurking instance. Takeaway: the boolean-negation `not ` corruption extended to string literals, not just regex — the original regex-only framing under-scoped it.

**Slice 16** — `scope.js` manifest I/O → `src/lib/scope-manifest.scrml`. 4 functions + 2 constants. `src/private/scope.js` is now a 24-line shim re-exporting from scope-manifest + scope-match. New surface verified clean: array spread `[...arr, x]`, `new Set(iterable)`, `Array.from()`, multi-line string concatenation with `+`. No new holes.

**Slice 17** — async save-routing helpers (`advanceBookmarks` + `autoSplitSave`) → `src/lib/save-routing-async.scrml`. Tests `async function` + explicit `await` in library mode.

**NEW finding (language design, not a bug)**:
- **DF-10** — `I-ASYNC-USER-SOURCE` info warning. Per §13.1, scrml user source SHALL NOT use the `async` keyword — the compiler auto-awaits statically-known `Promise<T>` callees per §13.2.1. The `async` modifier is reserved for stdlib (`scrml:*` namespace). User code is expected to read "flat and synchronous." For Promise<T> boundary wrapping at JS-host edges (untyped callees like `engine.setBookmark`), the spec idiom is `safeCallAsync` from `scrml:host` + `!{ ... }` failable pattern matching. Confirmed via experiment that auto-await ONLY fires when the compiler can statically prove the callee returns Promise<T> — for arbitrary JS-host objects with no scrml type info (giti's `engine`), the compiler doesn't insert awaits, so removing `async/await` from the source breaks the runtime. Kept explicit `async`/`await` in this port; accepted the info warning. Future port could refactor to the values-not-exceptions idiom (`safeCallAsync` + `!{ }`).

**Slice 18** — `findScrmlFiles` → `src/lib/find-scrml-files.scrml`. Replaced Bun.Glob (Bun-specific, not in scrml stdlib) with `scrml:fs.readdirSync + statSync` recursion. Function returns sync (the JS API was async because of Bun.Glob's async iterator) — JS callers using `await` keep working since `await` on a non-Promise returns the value.

**NEW finding — DF-11**: `scrml:fs.statSync(path)` returns `{ isFile, isDirectory, size, mtime } | not` where `isFile` and `isDirectory` are **booleans, not method calls** — a values-not-imperative API divergence from Node's `fs.Stats`. Also returns `not` (null) on ENOENT, so callers should `is not` guard before dereferencing. The scrml shim docs this in `_scrml/fs.js`. Discoverability issue, not a bug.

**Slice 19** — `mimeFor` + `composeScrmlFetch` + the MIME table → `src/lib/server-helpers.scrml`. Tests closures (a sync function returning an async closure) + MIME object lookup. Attempted to port `json` but `Response` constructor isn't in scrml's logic scope (no scrml stdlib exposes it; `scrml:host` only has `safeCall`/`safeCallAsync`). Left `json` in JS. Hit GITI-015 once on `MIME[ext] is some ? ...` — hoisted to `const hit = MIME[ext]; hit is some ? hit : ...`. Also hit the same module-semantics gotcha from slice 9 (re-export `export { x } from "..."` doesn't bind locally) when the server uses `composeScrmlFetch` internally — fixed with import + export pair.

**Slice 20** — `classifyFromStatus` → `src/lib/classify-from-status.scrml`. First scrml module **composing from multiple OTHER scrml modules** (`parse-status` + `save-routing-pure` + `scope-manifest`). 11 LOC of pure scrml. Tests spread `{ ...obj, key: val }` in return position. No new holes. `src/private/save-routing.js` is now down to **20 lines of pure re-export shims** (was 240 LOC of JS).

**Slice 21** — `ok`, `err`, `parseTestSummary` → `src/lib/result.scrml`. The Result-tuple builders are tiny (2 LOC each) but used throughout the engine layer (~30+ callsites). `parseTestSummary` extracts the "N pass" count from `bun test` output. Wired into `jj-cli.js` (ok/err) and `land.js` (parseTestSummary). No new holes.

**Dogfood scoreboard end S10 slice 21**:
- 17 scrml-authored modules in giti's runtime: duration, parse-status, scope-match, cli-args, save-message, bookmarks, format-status, friendly-error, save-routing-pure, resolve-compiler, remotes, scope-manifest, save-routing-async, find-scrml-files, server-helpers, classify-from-status, result
- ~865 LOC of scrml shipping
- 5 real compiler bugs filed upstream: GITI-014 (UI), GITI-015 (is-some ternary), GITI-016 (match-id), GITI-017 (regex not-substitution), GITI-018 (multi-stdlib import)
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

**Closed S11:**
- [x][x] **GITI-014** — CLOSED S11 (verified against scrmlTS `dc073b94`, fix `18b90f12` S122). Residual of GITI-013: the **zero-arg** arrow shape `() => ({...})` returning an object literal lost parens in client-emit. Fix paren-wraps all 5 thunk emit sites in `emit-logic.ts`. repro-10 now emits `_scrml_init_set("probe", () => ({error: null, count: 0}));` and `node --check` passes. All 5 UI pages recompiled clean.

**Filed + CLOSED S11 (same session):**
- [x][x] **GITI-019** — CLOSED S11 (fix `fa665e9d`, verified at `a91ad5de`). In the `for ... lift` loop emit path, a per-item text interpolation whose expression used top-level `||` (or `&&`) emitted illegal JS: the auto `?? ""` coalesce wrap was NOT parenthesized around the logical operand, producing `String(e.description || "(no message)" ?? "")` → `SyntaxError: missing ) after argument list` (ES2020 forbids mixing `??` with `||`/`&&` unparenthesized). Surfaced in 3 of 5 pages (status:234, history:64, diff:91) the moment GITI-014's fix unblocked those bundles. Fix: `emit-lift.js` now parenthesizes the source expr → `String((expr) ?? "")`; direct top-level interp path was already correct, untouched. Verified: repro-15 emits `String((e.description || "(no message)") ?? "")`, `node --check` clean; all 5 UI page client bundles now parse clean. Repro: `ui/repros/repro-15-interp-logical-or-coalesce-mix.scrml`.

### S11 re-verify sweep (all open bugs re-tested at scrmlTS `dc073b94`, 2026-05-24)
| Bug | Verdict at dc073b94 | Workaround disposition |
|---|---|---|
| GITI-014 (zero-arg arrow obj-literal) | ✅ CLOSED | removed |
| GITI-015 (`is some` ternary + computed LHS) | ❌ still broken — `args[i+1] is some ? …` emitted literally (only plain-identifier control lowers); repro-11 `--mode library` | hoist-to-const **stays** |
| GITI-016 (`match` identifier) | ❌ still broken — `E-SCOPE-001: Undeclared identifier is`; repro-12 | rename `match`→`m` **stays** |
| GITI-017 (`not` inside regex) | ✅ CLOSED — residual `3341f34d` verified at `a91ad5de`; full repro-13 matrix verbatim | `/n[o]t …/` **REMOVED** |
| GITI-018 (multi-`scrml:` import in library mode) | ✅ CLOSED — fix `32c2fd39` verified at `3a909c1d`; clean probe all rewritten, 0 bare | anchor-pattern **REMOVED** (4 files) |
| GITI-019 (lift-loop `||`+`??`) | ✅ CLOSED — fix `fa665e9d` verified at `a91ad5de`; all 5 UI bundles parse clean | n/a (never worked around) |
| GITI-006 (cosmetic `${@var.path}` pre-init) | open (not re-tested — cosmetic) | pre-seed defaults |

Net (end of S11): **GITI-014, 017, 018, 019 CLOSED** this session. GITI-015, 016 still open (workarounds retained). GITI-006 cosmetic. scrmlTS turned GITI-017-residual + GITI-019 + GITI-018 around within the session (parallel scrmlTS instance); verified at `a91ad5de` (017/019) and `3a909c1d` (018). Workarounds removed: `friendly-error.scrml` `/n[o]t …/` (017); anchor-pattern in `resolve-compiler`/`find-scrml-files`/`scope-manifest`/`remotes` (018). Tests 371/0 after each removal.

### S12 channel dogfood + server-fn codegen sweep (scrmlTS v0.6.7 / 18de30ba, 2026-05-29)

Resumed dogfooding on v0.6.7 per scrmlTS S140 resume message. Upgraded local
scrmlTS to v0.6.7 (clean ff to `feab1207`). Regression sweep: all 17 libs + 5 UI
pages recompile clean, emitted JS byte-identical, **371/0** tests — v0.6.7 is a
clean drop-in (GITI-014/017/018/019 stay closed).

Built `ui/live.scrml` — a live `jj` status page on a §38 `<channel>` (auto-synced
`<snapshot>` cell + `refreshStatus()` server fn reading the engine). Wired giti's
`Bun.serve` for the channel WS contract (`loadScrmlChannels`, WS-route dispatch
with the server instance, `globalThis._scrml_active_server`, `websocket:` handlers
in `src/server/index.js`). **Runtime-verified**: two WS clients both receive the
channel-cell `__sync` carrying real `jj status` (`state:"ok"`, actual changed
files), no echo storm. Harness: `tests/manual/channel-runtime.mjs`.

Four NEW compiler bugs filed (all Bug-51-class — compile exit-0):

| ID | Summary | Scope | Detection | Repro |
|---|---|---|---|---|
| **GITI-020** | `@cell` write nested in any block (`if`/`for`) in a channel server fn → client `_scrml_reactive_set`/`_scrml_init_set` (undefined in `.server.js`) instead of `broadcast(__sync)` | channel server fn | silent (node --check OK; runtime ReferenceError + no broadcast) | repro-16 |
| **GITI-021** | bare local reassignment `x = v` → spurious `const x = v`; shadows in blocks (silent drop) or redeclares same-scope (SyntaxError). Client w/ explicit `let` is correct; idiomatic bare-assignment form breaks both client+server | server fn (+ idiomatic client) | silent in block / loud same-scope | repro-17 |
| **GITI-022** | uninitialized `let x` + `x = v` → `let x = x = v` (TDZ self-ref) | server fn only | silent (node --check OK; runtime ReferenceError) | repro-18 |
| **GITI-023** | user-written optional chaining `?.` → `? . ` (broken JS); `o?.fn()`→`o ? . function()`. Compiler's own `?.` is fine | client + server expr path | exit-0 + unparseable emit | repro-19 |

Meta-insight: GITI-020/021/022 all live in the **server-function statement-lowering
path**, which is a separate, buggier code path than the client/program lowering
(the same source is correct client-side). GITI-023 is a distinct expression
lexer/parser issue (likely `?.` digraph vs scrml postfix `?` collision). All 4
delivered to `scrmlTS/handOffs/incoming/` with version-stamped sidecars; copies in
`handOffs/outgoing/`. Workarounds applied to `ui/live.scrml` (single tail `@cell`
write fed by single-assignment-`const` + ternaries; no `?.`). Still open from
before: GITI-015, 016 (workarounds retained), GITI-006 (cosmetic).

**S12 follow-up (scrmlTS reply, 2026-05-30, compiler now v0.7.0 / 4c9079d2):**
scrmlTS closed all four within a day. GITI-020/021/022 fixed by a single commit
`8e7f18fe` (the shared server-fn-body context-threading root I'd hypothesized);
GITI-023 already fixed in the v0.6.7→v0.7.0 native-parser optional-chain work.
**All 4 verified CLOSED** by recompiling the exact repros on v0.7.0:
GITI-020 (`broadcast(__sync)`, no `_scrml_reactive_set`), GITI-021 (`label = …`
reassign), GITI-022 (`let x;` + `x = 1;`), GITI-023 (`o?.a?.b` parses). `ui/live.scrml`
error-branch broadcast confirmed working at runtime.

| ID | Status (v0.7.0) | Disposition |
|---|---|---|
| GITI-020 | ✅ CLOSED — `8e7f18fe` | repro-16; live.scrml workaround now optional |
| GITI-021 | ✅ CLOSED — `8e7f18fe` | repro-17 |
| GITI-022 | ✅ CLOSED — `8e7f18fe` | repro-18 |
| GITI-023 | ✅ CLOSED — native-parser (pre-v0.7.0) | repro-19 |
| **GITI-024** | **OPEN (NEW)** — filed 2026-05-30 | repro-20; braces workaround applied to `scope-manifest.scrml` |

**GITI-024 (NEW):** v0.7.0's new `--validate-emit` parse gate (E-CODEGEN-INVALID-JS)
caught a latent server-split-emit bug in `scope-manifest.scrml`: a brace-less
`if (cond) continue` followed by an identifier-led statement emits `continue out;`
(next id eaten as a label) + orphaned `. push(line)` → invalid JS. Latent on v0.6.7
(emitted silently into the spurious, never-imported `.server.js`); the gate now hard-
fails the compile. Same subsystem as `8e7f18fe`. Trigger: `scrml:fs` import (→ server
split) + brace-less `continue` + identifier-led next line. **Workaround:** brace the
`continue` statements (applied to `scope-manifest.scrml`; the imported `scope-manifest.js`
artifact was already correct — gate-appeasement, not a runtime fix). Secondary note in
the report: plain `export function`s + `scrml:fs` emit a spurious HTTP-handler
`.server.js` that nobody imports. **Now on v0.7.0: all 17 libs + 6 UI pages compile
clean with the gate ON, 371/0.**

### S12 SSE dogfood (scrmlTS v0.7.0 / 4c9079d2, 2026-05-30)

Dogfooded the §37 SSE surface (`server function*` generators). Built `ui/feed.scrml`
— a live `jj` status feed: a no-arg `server function*` polls the engine on a 1s
interval and yields a named `event: status` SSE event. Added `src/lib/delay.js`
(Promise delay helper for poll pacing). **Server side fully works** (runtime-verified:
real jj status streamed as named events, correct framing/headers, flows through
giti's plain GET fetch path — no WS-style wiring needed, unlike channels). **Client
side is blocked by GITI-026.**

Two NEW silent-miscompiles (both Bug-51-class, server emit correct / client or param
wiring broken):

| ID | Summary | Detection | Repro |
|---|---|---|---|
| **GITI-025** | parameterized `server function*` yields nothing — server references the param as a free var (no `route.query` binding); client drops the call arg (binds it to the onMessage slot, EventSource URL has no query). No-arg generators work. | silent empty stream (ReferenceError swallowed by the stream try/catch) | repro-21 |
| **GITI-026** | client reactive binding `@cell = gen()` is dead — `_scrml_reactive_set("cell", stub())` stores the EventSource object; no per-event callback is passed, so events never update the cell (even the no-arg default-event case, the canonical §37.5.1 usage). Named `{event,data}` yields additionally unreachable (stub sets `onmessage` only, never `addEventListener(name)`). | runtime-proven via faithful EventSource: reactive_set called once with the EventSource obj, zero stream values delivered | repro-22 |

Both filed to `scrmlTS/handOffs/incoming/` with sidecars; copies in `handOffs/outgoing/`.
Method note: confirmed scrmlTS's SSE client tests only assert the emit *contains*
`onmessage`/`JSON.parse` — never runtime-test that events reach the cell — exactly the
emit-string-only gap the S140 resume message warned about. SSE running tally: server
surface solid; client consumption (both §37.5.1 reactive + §37.5.2 for/lift) needs the
stub→cell wiring fixed.

### S12 auth dogfood (scrmlTS v0.7.0 / 4c9079d2, 2026-05-30)

Dogfooded the §40 auth surface for giti's roadmap need (gate write controls behind
an `Owner` role; master-list §E hosted-forge blocker). **Static/diagnostic surface
is solid** (positive coverage): role-enum resolution works; `E-AUTH-GRAPH-003`
(variant not in enum), `E-AUTH-GRAPH-004` (no role/check), `W-AUTH-LOGIN-MISSING` +
`I-AUTH-REDIRECT-UNRESOLVED` (login-redirect inference), and `E-PAGE-INVALID-ATTR`
(`loginRedirect=` belongs on `<program>`, not `<page>`) all fire correctly. The
§40.9 per-role JS chunk classification (`--emit-per-route`) also works — the
Anonymous chunk omits the owner-only mounts; the Owner chunk includes them.

One HIGH/security finding:

| ID | Summary | Detection | Repro |
|---|---|---|---|
| **GITI-027** | `<auth role="X">` does not hide CONTENT from unauthorized viewers. DEFAULT compile mode (what giti's compile-on-serve uses): full no-op — gated markup + secret text in the served HTML, owner handler wired unconditionally, no role check, `UserRole` enum emitted-but-unused, NO warning. `--emit-per-route` mode: JS mount is role-split, but the single shared `*.html` still contains the gated markup verbatim (secret visible in view-source to anonymous). Runtime has no `<auth>`-element role gating. | runtime/emit: secret in HTML=1, handler wired=1, role-guards=0, W-AUTH=0 | repro-23 |

Filed to scrmlTS with sidecar; copy in `handOffs/outgoing/`. **giti CANNOT adopt
`<auth role>` for write-gating yet** — it would be a fully inert security gate in
the serve mode giti uses. giti keeps its `localDev` + 127.0.0.1 write-gate until
GITI-027 is resolved (the dogfood outcome: the surface giti needs from §40 isn't
usable for content-hiding yet). Pattern again matches the S140 emit-vs-runtime gap:
static auth analysis is well-tested; the runtime content-visibility behavior is not.

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
