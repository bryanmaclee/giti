# giti — Master List

**Purpose:** Live inventory of the giti collaboration platform.

**Last updated:** 2026-07-19 (S20 — **GITI-037 CLOSED** upstream (scrml `1c577da5`, colorless-async Seam-A Phase 1, PR #108). `save-routing-async.scrml` **migrated off committed `.js`** to plain colorless source: 6 `safeCallAsync` sites across a for-of body + 3 nested `if` blocks, all correctly emitting `await`. Lib compile **16/17** (was 15/17). Second blocked module `server-helpers.scrml` hit **GITI-038 (NEW, P1, Bug-51, filed)** — `safeCallAsync` inside a *returned function expression* drops the return + over-propagates `async` to the outer factory; escapes the very fail-closed backstop that catches the arrow/const-bind forms. Dogfood re-verify @ `1c577da5`: 16/17 lib + 7/7 UI compile + **7/7 browser-paint** + 375/0, no regression. `scrml:path` shim refreshed upstream (POSIX separator normalization; no-op on Linux).)

**Prior:** 2026-07-18 (S19 — compiler churned ~6× (`7d5fda26`→`1e63bbb1`); re-verify HEAD every compile. **#6b `scrml semdiff` LANDED** (scrml `780e4342`) → integrated as **slice-4** (`docs/ast-merge/prototype/slice4-semdiff/`), the §4.4-v3 compiler-validated merge layer keying on `semdiff diagnostics.added`; **the S18 measured boundary is CLOSED from the merge side** (accepts clean rename, catches use-breaking one via E-TYPE-063 — strictly dominates git-silent-ship + slice-3-blunt). **GITI-036 VERIFIED FIXED** (structural-eq treeshake; status paints clean). **GITI-016 workaround REMOVED** (`match` id fixed upstream). **fn-promotion sweep**: 21 pure lib fns `function`→`fn` across 12 modules (source-only, .js byte-identical). **browser-paint** now SSE-aware → true 7/7 in one run. **Dogfood re-verify audit** @ `99ae45ca`: 15/17 lib clean (2 = GITI-037 async), 7/7 UI compile+paint, no regression; filed **E-ROUTE-001** P3 FYI (over-fires on regex-capture in object-literal). GITI-037 ANSWERED+BANKED upstream (colorless-async Phase 1 not built). 375/0.)

---

## A. CLI

**Entry:** `src/cli.js`, bin name: `giti`
**Commands:** 15 (save, switch, merge, undo, history, status, land, init, describe, sync, serve, private, remote, link-private, **check**)
**Tests:** 375 pass / 0 fail / 0 skip (14 test files). jj 0.41 installed + colocated.
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

### `docs/deep-dives/` — canonical giti-domain deep-dives (moved S13, 2026-06-20)

Relocated from `scrml-support/docs/deep-dives/` per the 2026-05-17 canonical-home-move request (scrmlTS-PA-machine-B). Cross-ref annotation blocks stripped on copy. scrml-support retains `#cross-ref` carryover copies (may grow stale); giti is now canonical. On update: write the substantive change here, back-port a summary to scrml-support only if it carries cross-cutting scrmlTS implications.

- [x][x] `docs/deep-dives/giti-radical-doubt-2026-04-09.md` — what's wrong with git/GitHub (parent DD)
- [x][x] `docs/deep-dives/giti-vcs-model-2026-04-09.md` — git vs jj vs custom (decision: Casey/Handmade, 50.5 > Fossil 46.5)
- [x][x] `docs/deep-dives/giti-collaboration-primitive-2026-04-09.md` — PRs vs stacked diffs vs novel
- [x][x] `docs/deep-dives/giti-conflict-resolution-2026-04-09.md` — text markers vs structured vs compiler-assisted (compiler-assisted ratified; AST con-res is a scrml-compiler milestone)
- [x][x] `docs/deep-dives/giti-design-constraints-from-friction-2026-04-10.md` — constraints from PA agent/git friction
- [x][x] `docs/deep-dives/giti-027b-per-role-ssr-content-stripping-2026-05-30.md` — GITI-027 Part-B (per-role SSR content elision); records the S146 disposition (A canonical-now, D strategic direction, B rejected). No cross-ref block (postdated the S98B annotation pass).

**Still in `scrml-support/docs/deep-dives/` (not part of the move):**
- `pa-agent-git-friction-audit-2026-04-10.md` — source audit feeding the constraints DD
- `git-e-platform-2026-03-30.md` (historical — before rename to giti)

---

## E. Open work

### M4.1 — Hosted Forge (target: beta tester access)
- [x][x] **Bun HTTP API (read-only)** — `/api/health`, `/api/version`, `/api/status`, `/api/history` (S3)
- [x][x] **Bun HTTP API (local-dev writes)** — `/api/save`, `/api/switch`, `/api/merge`, `/api/undo` gated on `--local-dev`, bound 127.0.0.1 (S3)
- [x][x] **Compiler gate in `land`** — resolves `$SCRML_PATH` or `../scrml` (legacy `$SCRMLTS_PATH`/`../scrmlTS` still honored), globs `.scrml`, skips when none (S3; rename-adapted S13)
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
- [ ][ ] **GITI-006** — markup `${@var.path}` emits a bare module-top `_scrml_reactive_get(...).value` that throws `undefined.path` before async reactive init resolves. Workaround was: pre-seed `@state` with full default shapes. **Workaround DISSOLVED S15** — the idiomatic rewrite replaces the defaults-dodge with a `Phase:enum` seeded at `.Loading` (no bare module-top `${@x.y}` read remains in `status.scrml`/`history.scrml`/`land.scrml`/etc.). The underlying compiler behavior may still exist; giti no longer triggers it.

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

### S12 live-follow dashboard SHIPPED (2026-05-30)

Pivoted the channel dogfood into a real giti feature: **`ui/live.scrml` is now the
live-follow dashboard**, served by `giti serve` and runtime-verified end-to-end
through the actual pipeline (`startServer` → `compileUi` → `dist/ui` →
`loadScrmlChannels` → `Bun.serve({websocket})`): `/live.html` serves 200, two WS
clients both receive the channel-cell snapshot sync carrying real `jj` status.
Built on **channels** (works); the SSE `feed.scrml` is server-only until GITI-026.

**Serve-blocker fixed (`compile-ui.js`):** `giti serve` was broken — `compileUi`
directory-compiled all of `ui/` (fail-fast), and `ui/repros/repro-12` (GITI-016,
still open) fails with `E-SCOPE-001`, plus v0.7.0's `--validate-emit` gate would
trip other repros. Fix: `compileUi` now compiles only the top-level `ui/*.scrml`
page entry files, skipping the `repros/` subdir (reproducers are not app pages;
mirrors the `repro-` skip in `loadScrmlHandlers`/`loadScrmlChannels`). Real page
failures still fail loud (P0 policy). Nav: `Live` link added to all six pages
(`status`/`history`/`bookmarks`/`diff`/`land`/`live`). `feed` is intentionally NOT
in nav (its SSE client is dead under GITI-026 — won't advertise a non-updating
page). 371/0.

**Theme dedupe LANDED (long-pending, DEFERRED since S11):** `theme.css` is now the
single source of truth for design tokens + chrome; `status.scrml` dropped its
143-line duplicated `:root`/chrome block; token vocabulary unified to
`--fg`/`--ok`/`--err`/`--warn`/`--priv`/`--mono`/`--sans`/`--accent-2` (old
`--text`/`--error`/`--success` retired). Verified: every `var(--…)` referenced by
any page is defined in `theme.css` (no undefined tokens, no stale refs); all pages
compile clean. Browser visual-verify still advisable; token-correctness is
statically confirmed.

### S12 close — all filed bugs resolved (scrmlTS reply 2026-05-30-1500, verified)

scrmlTS turned around all four newly-filed bugs same day (pushed origin/main, then
`7be403dd`). Verified each against my repros:

| ID | Fix | Verified |
|---|---|---|
| GITI-024 | `8b50c89b` — break/continue label heuristic compared `tok.line` (nonexistent; line is `tok.span.line`) so the guard always fired. + **§12.6 `3b825808`**: body-content-escalated plain `export function`s (fs/`?{}`) no longer emit a spurious HTTP-handler `.server.js` — only explicit `server function`/`route=` do. | repro-20 `continue;`+`out.push`; `scope-manifest.scrml` emits NO `.server.js` ✓ |
| GITI-025 + 026 | `e2dcde7b` — SSE: server binds params from `route.query`; client encodes args in the EventSource URL; reactive binding is a per-event callback (not the EventSource obj); named-event `addEventListener`. | repro-21 server `const from = route.query["from"]`, client `_scrml_sse_…(5, d=>set)`; feed.client.js `addEventListener("status")` + callback ✓ |
| GITI-027 | Part-A `53203851` — NEW `W-AUTH-CONTENT-NOT-GATED` warning (footgun now loud, honest in both modes). Part-B (per-role SSR HTML stripping) **deferred** to design deliberation (scrmlTS S146 ratified A+D; impl pending). **Retested S14 2026-06-22 vs migrated `../scrml`@`ca712295` (s212, pkg v0.2.0): Part-B still NOT shipped** — secret content (`owner-only-marker-12345`) still emitted verbatim in served HTML in BOTH default and `--emit-per-route` modes; no serve-layer role-elision artifact. Part-A warning still fires (now cites §34, §40.9.5 + explicit "per-route does not withhold HTML"). JS role-split still works (anon/owner chunks differ). **giti keeps `localDev`+127.0.0.1 write-gate.** | repro-23 fires the warning ✓; secret-in-HTML=1 both modes |

**Workaround dropped:** GITI-024 braces in `scope-manifest.scrml` reverted to natural
braceless `continue`; orphaned `scope-manifest.server.js` removed (no longer emitted
under §12.6). **`ui/feed.scrml` SSE now works client-side** (GITI-026 fixed) — left
out of nav to avoid a duplicate live-status page; promote if wanted. Compiler bug
ledger: **GITI-020–027 all CLOSED** except GITI-027-B (deferred) + the older open
GITI-015/016 (workarounds retained), GITI-006 (cosmetic).

**S13 follow-up:** §12.6 likely orphans other plain-fs libs' committed `.server.js`
(find-scrml-files, etc.); a lib-wide `--mode library` re-emit + orphan sweep is
deferred (stale artifacts are unused — tests 371/0 — not urgent).

### S15 — idiomatic UI rewrite (2026-06-22, compiler `../scrml`@`ca712295`)

Executed the scrml-PA idiomatic audit's rewrite directive (`scrml-support/docs/deep-dives/giti-idiomatic-audit-2026-06-20.md`; inbox `2026-06-20-2109`). All 7 UI pages + 1 src/lib edit. Per-file commits, recompile + 375/0 tests after each. Progress journal: `docs/changes/ui-idiomatic-rewrite/progress.md`.

**Landed (Tier-1 dashboards → Phase enum + `<match for=Phase on=@x>` + `<each>`+`<empty>`):**
- history, bookmarks, status (3 loads → 3 enums), land (killed `running:true` bool → `.Running`), diff (DiffMode + DiffPhase + HistoryPhase; working-copy-vs-selected fork → `<match for=DiffMode>`, id as payload).
- Server fns return the variant directly off the engine Result tuple (no `!{}` needed for dashboard loads). Loads trigger via `on mount {}`. **GITI-006/CG-6 defaults-dodge dissolved** (cells seed at `.Loading`).
- Conditional content-sections + badges → ternary-as-value `${ cond ? <markup> : "" }` (Pillar 1).

**Cycling pages (live, feed) — DEVIATION from audit's `<engine>`, compiler-forced:** verified **`E-RI-002`** on the current compiler — a server-escalated fn may write a `<channel>`/SSE cell but NOT an `<engine>` cell, so an engine can't drive the synced cell these pages need (dropping the channel would kill cross-tab/stream sync). Used typed `Phase` state field + `<match for=Phase on=@cell.state>` instead (kills the raw-string-in-DOM `state:"ok"/"error"` flag) + `<each>`. This is independent of GITI-020/021/026.

**remotes.scrml — try/catch RETAINED (compiler-gap):** the idiomatic replacement is `safeCall` (scrml:host), but `safeCall(...) !{}` emits invalid JS in `--mode library` (remotes' mode; fine in program mode). Reverted to the working try/catch, documented + flagged. Now also warns `W-TRY-CATCH-IN-SCRML-SOURCE`.

**3 NEW compiler findings (to report to scrml — see hand-off):**
1. `<engine>` cell can't be a server-written `<channel>`/SSE cell (`E-RI-002`).
2. `on mount { @x = watchStatus() }` (SSE binding in on-mount) → `E-CODEGEN-INVALID-JS`; workaround = module-top `${ @x = watchStatus() }`.
3. `safeCall(...) !{}` → `E-CODEGEN-INVALID-JS` under `--mode library` (fine in program mode).

**Ledger reconciliation (audit vs this repo's master-list):** the audit (S210) treated CG-1/CG-3 (GITI-020/021) as OPEN and feed as inert (CG-4/GITI-026 open). This repo's S12-close record says **GITI-020/021/025/026 were all CLOSED** (`8e7f18fe` / `e2dcde7b`, 2026-05-30, on scrmlTS v0.7.0 **before** the scrml migration). Not re-verified on the migrated compiler this session. **feed.scrml's actual runtime SSE on the migrated compiler is UNVERIFIED** — a quick SSE runtime probe is the open follow-up; the idiomatic shape is correct either way (compiles + serves 200).

**Verification:** all 7 pages compile clean (only `W-PROGRAM-SPA-INFERRED` info) + every emitted JS `node --check` OK; `giti serve` boots and all 7 pages serve HTTP 200 end-to-end; **375/0** throughout. CG-5 (CSS `@import` mangling) confirmed NOT-REPRODUCED — stale `history.scrml` comment dropped.
> ⚠ **S16 correction:** "serve HTTP 200 end-to-end" verified only the **static GET page-load**, NOT the loader **POST**s. The loaders were runtime-broken by GITI-028 (enum defs emitted to client bundle only). **GITI-028 now FIXED + verified** (scrml `83afdcdb`, S216) — see the S16 section below. Source was correct all along; it was a compiler bug. Idiomatic source retained; loaders now return 200.

### Lesson from GITI-010 (narrow)
If recompilation-after-filing shows the bug gone, the fix may have just shipped on the upstream — check `git log` in scrmlTS for commits touching the relevant codegen since the report time before concluding the original report was wrong. GITI-010's 0805 "retraction" mis-attributed a fresh upstream fix (`40e162b`, pushed ~5 min earlier) as "bug was never there." scrmlTS explicitly flagged the self-flagellation as over-tuned; dated SHA-stamped reports are adequate and stale-dist is normal. The 0814 corrected ack supersedes both the retraction and the mis-framing.

### S16 — SSE probe → GITI-028 (whole-UI runtime miscompile), 2026-06-23, compiler `../scrml`@`df6f747b` (s214, v0.7.0)

Ran the deferred feed.scrml SSE runtime probe (the S15 verification debt). It uncovered a far broader bug than feed.

**GITI-028 (CLOSED — fixed scrml `83afdcdb` S216, verified 2026-06-23):** page-local `enum` definitions were emitted into the **client bundle only**, never the **server bundle**. Any `server function` that references an enum variant (bare `X.Ok` OR payload `X.Loaded({...})`) hits an undefined identifier → `ReferenceError: X is not defined` at runtime. Compile exit-0; `node --check` exit-0 — silent Bug-51 class.
- **Regular server fn** → 500. **`server function*` (SSE)** → throw swallowed by the stream try/catch → **0 frames** (the "inert feed" symptom).
- **Blast radius: ALL 7 UI pages.** Every S15-rewritten loader is runtime-broken (status/history/bookmarks/land/diff 500; live/feed 0 frames). The enum-typed-Phase + server-fn-returns-variant shape is exactly what the S210 idiomatic audit directed — the compiler can't compile the idiom it recommended. Regression in effect (pre-S15 plain-object loaders worked).
- **Runtime proof:** feed SSE route 0 frames as emitted, 3 real frames once `globalThis.Phase` injected (isolates the cause); `loadStatus` handler threw `StatusPhase is not defined` with valid CSRF. Minimal repro `ui/repros/repro-27-enum-undefined-in-server-bundle.scrml` (both variant shapes throw `ReferenceError: Load is not defined`).
- **Meta-pattern:** same server-function-lowering-path gap as GITI-020/021/022 (`8e7f18fe`) — the client/program path emits the enum def, the server path doesn't.
- **Disposition (user dir S16, option A):** filed P0 to scrml (`../scrml/handOffs/incoming/2026-06-23-1223-giti-to-scrml-enum-undefined-in-server-bundle.md`); **idiomatic source RETAINED** (don't contort source around a compiler bug); `localDev`+127.0.0.1 write-gate unaffected, stays.
- **RESOLUTION (same day):** scrml fixed in **under 4h** — `83afdcdb` (S216): `generateServerJs` now emits page-local enum-variant objects into `*.server.js`, reachability-gated + byte-identical to the client bundle. **Verified on local `../scrml@5e3a1dbf`** (contains `83afdcdb`; giti compiles against this local checkout): all 7 pages compile exit-0, server bundles carry the enum defs, every emitted JS `node --check` clean; feed SSE route delivers 3 real frames **as emitted** (no `globalThis.Phase` crutch); `loadStatus` returns **200** with a real `Loaded` variant; 375/0. **Server-side runtime + emit verified PA-side; full browser paint of all 7 pages is the remaining USER-verify** (serve + browser pass). scrml's fix is local-landed but **not yet pushed to scrml origin** — irrelevant to giti (we use the local checkout); a push notice will follow.
- **Separate scrml gap (does NOT affect giti):** `g-enum-toenum-not-lowered-server-side` (MED) — server-side `X.toEnum(row.field)` DB-coerce throws. giti uses zero `.toEnum(` (no `<db>`/`?{}` paths), confirmed by grep; replied fyi.
- **Harness:** `tests/manual/sse-runtime.mjs` (two-phase: as-emitted vs Phase-injected). Reusable for any future SSE re-verify. Replies: filed `2026-06-23-1616-giti-to-scrml-bug51-verified-no-toenum.md`.

**Ledger reconciliation (resolved):** GITI-026 (SSE client reactive binding) **is** genuinely still CLOSED — the emitted `feed.client.js` wires the correct per-event callback + `addEventListener("status")`. feed is dead for the NEW, distinct reason above (server-side enum), not GITI-026. GITI-025 (param wiring) not re-exercised (feed's generator is parameterless) but the server route binds `route.query` correctly.


### S16b — browser paint → 3 client-render codegen bugs (GITI-029/030/031), 2026-06-23, compiler `../scrml`@`7c01b22a` (v0.7.0)

After GITI-028 (server-side) was fixed + verified, ran the browser-paint pass S15 never did: **headless Chromium** (`tests/manual/browser-paint.mjs`, playwright via `../scrml/node_modules`) over `giti serve`, running the real client JS + inspecting the painted DOM + screenshots (`/tmp/giti-paint/*.png`). **Result: 6 of 7 pages do NOT render correctly** — loaders return 200 (GITI-028 works) but the client-side rendering of the S15 idiomatic constructs is broken. Three distinct compiler bugs, all Bug-51 (exit-0, `node --check` clean, silent). Filed together: `../scrml/handOffs/incoming/2026-06-23-2018-giti-to-scrml-three-client-render-codegen-bugs.md`.

| ID | Bug | giti pages | Repro |
|---|---|---|---|
| **GITI-029** (**FIXED — scrml S217, verified local `062165a5`**) | a `//` comment line directly before `on mount {}` → the whole block emits as **literal HTML text**; hook never fires | status (3 loaders) | repro-28 |
| **GITI-030** (**FIXED — scrml S217**; but see §4.17 note) | `<each>` body `${@.FIELD}` where FIELD is the `key=@.FIELD` field → emitted as literal text node. Corruption fixed. **BUT §4.17:** `<code>`/`<pre>` are RAW-CONTENT — `${...}` inside them ships verbatim BY DESIGN. giti must move interpolated fields OUT of `<code>` → `<span>`+mono CSS. **giti-source change still needed** (status Recent-saves changeId, bookmarks name, diff changeId, history changeId). | bookmarks/diff/history/status `<code>` columns | repro-29 |
| **GITI-031** (**FIXED — scrml S217, verified local**) | `<match for=P on=@cell.subfield>` ignored the `.subfield` access. Now reads `_scrml_reactive_get("cell").state` (deep paths too). live renders "State: idle" ✅ | live (`@snapshot.state`), feed (`@status.state`) | repro-30 |
| **GITI-032** (OPEN — filed 2026-06-24 0801) | `${ cond ? <markup> : "" }` (ternary-markup) inside a `<match>` arm: single → `E-CODEGEN-INVALID-JS`; multiple → exit-0 but arm render = pure whitespace (sections dropped). Works at top level; `<each>`-in-arm works | status "Current status" panel (5 `${ d.X ? <section> : "" }` → empty); likely land too | repro-31 |

- **feed also CRASHES** (`Cannot read properties of null (reading 'changed')`): the `${ @status = watchStatus() }` SSE binding emits `_scrml_reactive_set("status", null)`, clobbering the typed seed. Downstream of the already-filed S15 finding #2 (SSE-binding-in-on-mount). feed needs GITI-031 + that finding.
- **Per-page browser-paint verdict (re-painted on S217 `062165a5`):** status ⚠ (Bookmarks + Recent-saves render real data ✅; "Current status" panel empty — **GITI-032**; Recent-saves changeId shows literal — **§4.17 `<code>`**) · bookmarks/history/diff ⚠ (render, but `${@.x}`-in-`<code>` columns show literal — §4.17) · land ❌ (loader 200, Loaded arm blank — GITI-032 ternary-markup) · live ✅ (**State: idle renders** — GITI-031 fixed) · feed ❌ (still crashes `null.state`/`null.changed` — the SSE seed-clobber, S15 finding #2, separate from GITI-031).
- **S217 resolution (2026-06-23 overnight, verified local `062165a5`):** scrml FIXED GITI-029/030/031. My GITI-029 source workaround (comment relocation, applied earlier S16) was **REVERTED** — compiler now handles the original form. Remaining giti-side work: (a) §4.17 `<code>`→`<span>` cleanup to display the id/name columns; (b) GITI-032 (Current-status + land panels) — wait for compiler OR restructure the Loaded arms off conditional-markup; (c) feed SSE seed-clobber (finding #2, still open upstream).
- **Disposition (user dir S16, option A — same as GITI-028):** filed; **idiomatic source RETAINED** (trivial source workarounds exist — relocate the comment / don't display the key field / split the enum into a whole-cell — but per policy fix the codegen, not the source). Resume browser-verify when fixes land. **land's blank-content is not yet root-caused** — open triage item.
- **Method correction:** S15's "all 7 pages serve HTTP 200 end-to-end" + my own earlier "loaders return 200 → GITI-028 verified" were both **server-side only**. A real browser render is the only check that catches this class. `tests/manual/browser-paint.mjs` is now the reusable gate.

### S17 — GITI-033 landed → 6/7 UI paint; full re-verify sweep; flobase; AST-merge pillar (2026-07-06, compiler `../scrml`@`59dc5287`, s241, v0.7.1)

The compiler moved ~27 sessions (s214→s241) between S16 and S17. Session re-grounded the whole ledger against the current gate, then rode GITI-033's landing to the best UI-render state yet.

**GITI-033 (CLOSED — scrml `690d7739`, s241):** `<each>` item-accessor `@.` inside a ternary-markup consequent → E-CODEGEN-INVALID-LOGIC (renamed from -INVALID-JS in s237). Blocked status + land from compiling. Filed S17, fixed same-day. repro-32. **Latent bonus:** the fix also closed a silent quote-loss miscompile (string literals in a text-position `${cond ? "a":"b"}` were dropped → comparison to undefined identifier, silent always-false; status:122 `${d.scope=="empty"?…}` was affected — now correct).

**Full re-verify sweep vs s239/s241 (ledger reconciliation):**
- **GITI-015** (`is some` ternary, computed LHS) → **verified FIXED** (repro-11 all cases lower to `(x!==null&&x!==undefined)?…`; giti source already direct-form, no workaround present). The S11-era "still broken" ledger rows above are superseded.
- **repro-25 defect** (SSE-binding-in-`on mount` compile error) → **FIXED** (valid ESM). **repro-26 defect** (`safeCall !{}` library-mode) → **FIXED** (valid ESM).
- **repro-24 / E-RI-002** → **reclassified: enforced-as-designed.** scrml verified `<engine for=T server=@source>` (§51.0.E) is the wired server-authoritative-engine form and resolves E-RI-002; live/feed can move back to `<engine>` off the Phase-cell workaround (optional enhancement).
- **GITI-016** (`match` id) → still OPEN; scrml STAGING (`b42492aa`). **GITI-034** (attr-interp nested-quote, scrml-filed) → giti NOT affected.

**diff E-FN-004 (giti-side fix):** s241 added a purity rule rejecting `fn` bodies that read `window.location`. Refactored diff's two url-reading `fn`s → `function changeParam()` + pure `fn modeFromParam(param)`.

**§4.17 `<code>`/`<pre>` cleanup:** confirmed empirically that BOTH `<code>` and `<pre>` are raw-content (ship `${...}` verbatim; only `<span>`/`<p>` interpolate). Moved every interpolated field out — inline `<code>`→`<span class="mono">` (new theme.css `.mono` utility), block `<pre class="X">`→`<div class="X">` (`.diff-pane`/`.gate-error` CSS already had `white-space:pre`). Fixed the literal `${@.changeId}` columns on status/history/diff and the diff-pane / land gate-error blocks.

**Browser-paint re-verify (the gate that catches what compile hides): 6 of 7 PAINT CLEAN** — status · history · bookmarks · diff · land · live. (S16 was 6-of-7-broken.) Findings: **land** was a false-timeout — its on-mount preflight runs the REAL gate (compile-all + full `bun test`, ~20s+); harness now gives land a 45s nav budget and it paints (textLen 114k). status's earlier 404 was transient. **feed** ❌ → **GITI-035 (NEW, OPEN, filed `2026-07-06-0959`):** `${ @cell = serverGenerator() }` emits a spurious `_scrml_reactive_set(cell, null)` clobbering the typed seed → runtime `null.<field>` crash. repro-33 (byte-identical). Feed is the last page between us and 7/7. Harness also made portable (cross-machine `$HOME`/glob; default port 3737).

**flobase:** giti assembled via `/flobase` — `.pa-base/profile` + fenced `.claude/CLAUDE.md`. Lean module set; individualisation reuses `../scrml-support/pa-profile-bryan.md`. Next boot = cheap rehydrate. Authority defers to `pa.md`.

**AST semantic merge (spec §4.3) — the engine-independence-gate pillar (§3.7) moved from spec-stage to a built slice.** Operator-directed flogence↔giti tag-team. `docs/ast-merge/`: (a) **v0 shared note** (`v0-approach-d-shared-note.md`, §6 filled by flogence); (b) **BUILT + gate-verified first-slice prototype** (`prototype/` — `.scrml` state-type field-add merge on the compiler's `--emit-block-analysis` sidecar, consumer path, NO compiler `--merge` entrypoint: git conflicts → driver combines disjoint fields → merged file compiles clean; collision → conflict); (c) **joint compiler-ask v0** (`compiler-ask-v0.md`, **co-signed by flogence**, carried to scrml as **oracle ask #6**) — two additive `--emit-block-analysis` items: [PRIMARY] field-level member emission (per-member spans + typeText, records + enum variants), [secondary] tight `bodySpan`. `--merge`/type-diff entrypoint deferred to v3/§4.4. AST source DECIDED: scrml-parser primary + tree-sitter fallback. Ball with scrml (feasibility-read).

**100%-scrml roadmap** filed to scrml (`2026-07-05-1339`): subprocess primitive + §64 tool-target + cross-scrml library imports + close GITI-016 = the path to giti-authored-entirely-in-scrml (excl. jj). Awaiting scrml.

### S18 — 7/7 UI paint (await-ban migration); AST-merge slices 2+3 + measured boundary; 2 bugs filed (2026-07-15, compiler `7d5fda26`)

Boot found the compiler had moved ~9 days (s241→`7d5fda26`) with conformance-freeze tightening. Session opened on the AST-merge pillar, then a "what's unblocked?" sweep uncovered a blanket UI regression and drove it to the best UI state yet.

**7/7 UI PAINT — first ever.** scrml promoted source-level `await` from the old I-ASYNC warning to a hard error **`E-AWAIT-NOT-IN-SCRML`** (§19.9.8). Every UI server fn used `await engine.X()` → **all 7 pages failed to compile (0/7)** on the current compiler; `giti serve` was broken. Migrated every server fn to `safeCallAsync(() => engine.X()) !{ | ::Thrown(msg) :> ({ok:false, error:msg}) }` (compiler auto-awaits safeCallAsync in server-fn context; the Thrown arm coerces a host throw to the engine's `{ok:false,error}` shape → downstream unchanged). All 7 compile; **headless browser-paint → 7/7 render real data**, including **feed's live SSE** (GITI-035 fixed upstream). The main harness can't verify feed (SSE keeps `networkidle` from firing) — used an SSE-aware `domcontentloaded` probe.

**`remotes.scrml` try/catch → `safeCall`.** repro-26 (lib-mode `safeCall !{}` codegen bug) verified FIXED → migrated `loadRemoteConfig` to the idiomatic `safeCall`/`::Thrown` failable. giti UI scrml is now **`await`-free AND `try/catch`-free**.

**Unblock sweep (verified @ 7d5fda26):**
- **GITI-035** (feed null-clobber) → **CLOSED** (feed renders live).
- **GITI-016** (`match` id) → **verified FIXED**; `match`→`m` workaround in `friendly-error.scrml` now removable (a 100%-scrml blocker cleared). *(cleanup deferred to S19.)*
- **DF-8** (cross-scrml `.scrml` import rewrite in lib mode) → **still blocked** (emit keeps `./x.scrml`).
- **subprocess primitive** → **still absent** (`scrml:process` has no spawn). jj wrapper stays JS.

**NEW compiler bugs filed to scrml (standing auth):**
- **GITI-036** (P1, Bug-51) — status `==` in a client markup-interpolation lowers to `_scrml_structural_eq(...)` but the helper is tree-shaken OUT of the client runtime bundle → `ReferenceError` on match re-dispatch. Reproduces standalone; status still paints (throw caught). Idiomatic source retained. `2026-07-15-from-giti-GITI-036-...md`.
- **GITI-037** (P2, gap) — no async idiom for plain (non-server) library fns: `async` banned + plain fns don't auto-await `safeCallAsync` (only server fns do). **Blocks migrating `save-routing-async.scrml` + `server-helpers.scrml`** (attempted → 14 test fails → reverted to committed async/await `.js`; latent). `2026-07-15-from-giti-GITI-037-...md`.

**AST semantic merge (§4.3) — consumer-side ceiling reached.** On the shipped **#6 member-emission** (`--emit-block-analysis` now emits `typeShape` + `members[]` + tight `bodySpan` — verified on the real sidecar): built **slice 2** (`docs/ast-merge/prototype/slice2-enum/` — enum variant-add merge, re-parse layer dropped, typeText collision detect) + **slice 3** (`slice3-multi/` — multi-entity same-file merge; structs+enums unified under one `mergeMembers` path; glue-change guard). Then **measured the #6b boundary**: the driver goes unsound/blunt at **rename↔use / arg-retype / constant-footprint-behavioral** — a clean rename and a use-breaking rename are byte-identical at the member level; only the compiler (`E-TYPE-063`) separates them = §4.4 v3 / #6b. **giti's merge hits the same wall flogence's review (semdiff) did, independently** → grounds the #6b co-sign. Write-up: `docs/ast-merge/slice2-enum-merge-and-measured-boundary.md`.

**flogence #6b — grounded co-sign SENT** (`../flogence/handOffs/incoming/2026-07-15-from-giti-reframe-cosign-6b-grounded-concurrency.md`): co-sign the converged **merge+review** #6b (sound cosmetic-vs-behavioral classification), grounded in the measured boundary; + the collaboration-layer reframe (adopted, with the amendment that conflict-as-data + private-scopes already differentiate today) + concurrency read (jj dissolves the local-mutex leg, not the cross-machine CAS). scrml already ledgered #6b agreed-in-principle behind its V1 freeze; ball with flogence to fold the converged ask.

**giti scrml/JS split (Q1/Q2):** ~50/50 — ~2,430 LOC scrml (7 UI + 17 lib) vs ~2,600 LOC hand-written JS (engine/CLI/server). UI fully modern-idiomatic; 100%-scrml is compiler-gated (subprocess, §64, DF-8, GITI-037).

### S19 — #6b semdiff integrated (§4.4-v3 boundary CLOSED); quick-win closures; fn-promotion; dogfood re-verify (2026-07-18, compiler churned `7d5fda26`→`1e63bbb1`)

Boot found three post-S18 replies: GITI-036 fixed, GITI-037 answered, and — the strategic one — the **#6b semantic-diff primitive LANDED** on scrml (`780e4342`, PR #91), the compiler classification S18's AST-merge *measured boundary* was hard-blocked on.

**#6b `scrml semdiff` INTEGRATED — slice-4 (§4.4-v3).** Built `docs/ast-merge/prototype/slice4-semdiff/` (+ write-up `docs/ast-merge/slice4-semdiff-v3-validation.md`). The driver loosens the structural merge to combine **disjoint glue edits** (which can silently type-break), then gates candidate `M` with `scrml semdiff base M --json`, keying on **`diagnostics.added`** = giti-spec §4.4 v3 verbatim ("type errors introduced by the merge, not pre-existing"). **Measured, strictly dominates both neighbors:** CLEAN merge → git auto-merges · slice-3 falls-through-blunt · **slice-4 accepts (exit 1)**; DANGLING merge (`.Sha` vs renamed `Ref{Digest}`) → git **ships it SILENTLY** (M fails E-TYPE-063) · slice-3 blunt · **slice-4 catches E-TYPE-063, refuses (exit 2)**. giti's `giti-rename-use` wall is regression-pinned in scrml's fixture suite. **docs/ast-merge/ now has 4 built slices** (1 struct field-add, 2 enum, 3 multi-entity, 4 semdiff-validated). Confirmation sent to scrml; no mis-classification to file. **Productization** (`giti merge`/`giti resolve` wire-in + `giti status --merge-log`) **DEFERRED** — subprocess-gated (production driver is scrml; can't spawn `scrml semdiff` yet).

**Quick-win closures.** **GITI-036** (structural-eq treeshake) VERIFIED FIXED @ `01160fb8` (fix `4d0220c7`, PR #59): runtime bundle DEFINES `_scrml_structural_eq` (0→1); status browser-paints loaded data, zero ref-errors. No giti source change (idiomatic source retained). **GITI-016** (`match` id → E-SCOPE-001) workaround REMOVED in `friendly-error.scrml` (fixed upstream; `is some` lowers clean). **GITI-037** ANSWERED + BANKED upstream (bryan S258: colorless typed-and-surfaced async, ~80% built, Phase-1 not dispatched) — 2 lib async modules stay on committed `.js` until it lands.

**fn-promotion idiom sweep.** 21 pure functions `function`→`fn` (the enforced-pure form; compiler `I-FN-PROMOTABLE`) across 12 lib modules. Source-only — `fn` lowers to the same `export function` emit, so every module `.js` is byte-identical (verified); 375/0. Cascade: promoting `globToRegExp`→`fn` unlocked its caller `matchGlob`. Only `server-helpers.scrml` (2 fns) keeps `function` — GITI-037-blocked (promotes for free once colorless-async lands).

**browser-paint SSE fix.** `browser-paint.mjs` now settles SSE pages (feed) on `domcontentloaded`, not `networkidle` (which never fires on an open EventSource) → **true 7/7 in the main run** (was 6/7 + a feed timeout). S18 thread 5 closed.

**Dogfood re-verification audit** @ `99ae45ca` (compiler churned ~6× this session). 15/17 lib compile clean (2 fails = `save-routing-async` + `server-helpers`, GITI-037 async modules, hard-error on `await` — expected); 7/7 UI compile + **7/7 browser-paint on the current HEAD**; 375/0. **No regression on the churning compiler.** One finding: **E-ROUTE-001** over-fires on numeric regex-capture array access (`m[1]`, `m[2]`) inside an object-literal value, in a pure route-less lib module (`parse-status`) — characterized (object-literal position fires, ternary does not), filed P3 FYI with repro `ui/repros/repro-34-e-route-001-computed-capture-in-object-literal.scrml`. Non-blocking (warning, correct emit).

**S19 commits:** `18e9bae` (036 re-verify + 016 cleanup + inbox drain) · `555b5dd` (slice-4 semdiff) · `635e514` (browser-paint SSE) · `64883a8` (fn-promotion sweep) · wrap (repro-34 + docs + maps). **375/0.**

### S20 — GITI-037 closed → colorless-async migration; GITI-038 filed (2026-07-19, compiler `1c577da5`)

Boot found scrml's overnight notice: **GITI-037 FIXED** — colorless-async Seam-A Phase 1 (`1c577da5`, PR #108). The local `../scrml` checkout was already sitting on that exact commit, so the fix was immediately available.

**`save-routing-async.scrml` MIGRATED (S18-era blocker cleared).** Dropped `async`/`await` entirely; every engine call now goes through the established S18 UI idiom `safeCallAsync(() => engine.X()) !{ | ::Thrown(msg) :> ({ok:false, error:msg}) }`. The compiler emitted `export async function` + `await` at **all 6 sites** — including inside a `for`-of body and three nested `if` blocks (`d8c814d5`'s nested-statement-position descent). No Promise leak; `node --check` clean; **375/0**. Lib compile **15/17 → 16/17**. The `::Thrown` arm additionally coerces a host throw into the engine's own `{ok,error}` result shape, so downstream readers are unchanged.

**`fn` promotion DECLINED for this module (deliberate).** The compiler emits `I-FN-PROMOTABLE` for both `advanceBookmarks` and `autoSplitSave` (it labels them "ghost pattern"), but both drive repo-mutating `engine` I/O — they are impure. The lint can't see through the opaque `engine` param. Promoting would assert a purity contract the functions don't honor, so both stay on `function`. S19's "promotes for free once colorless-async lands" expectation applies only to genuinely-pure fns; it does not apply here.

**GITI-038 (NEW, P1, Bug-51, OPEN — filed `2026-07-19-1030`):** `safeCallAsync` inside a **returned function expression** silently miscompiles. `return function d(){ safeCallAsync(…) !{} }` emits `export async function factory(){ return; async function d(){…} }` — the return value is **dropped** (factory returns `undefined`; runtime-proven `Promise { undefined }`) and the async color **over-propagates** to the outer factory, which awaits nothing. Exit-0, `node --check` clean. Isolation matrix: sync `safeCall` in the same shape emits correctly (rules out the `!{}` lowering); a bare untyped call emits correctly (rules out the return-closure shape); the **arrow** and **const-bind** forms of the same situation correctly **fail closed** with `E-ASYNC-STDLIB-IN-SYNC-CALLBACK`. So the `return function name(){}` form is the one shape that escapes Phase 1's no-silent-leak backstop. Repro `ui/repros/repro-35-safecallasync-in-returned-closure-drops-return.scrml` (failing case + both controls in one file). **Blocks `server-helpers.scrml`** (`composeScrmlFetch` is exactly this shape) — module stays on committed `.js`; idiomatic source RETAINED per option A, not contorted.

**Design constraint recorded (for the eventual `server-helpers` migration):** `composeScrmlFetch`'s consumer (`src/server/index.js`) deliberately **re-throws** handler errors (`instrumentScrmlHandlers`, lines 107–109) so a broken scrml route surfaces as a 500 rather than silently falling through to `/api/*`. A naive `!{ | ::Thrown(msg) :> not }` migration would swallow that and regress error visibility. The migration needs a shape that preserves throw-propagation — open design question, not just a codegen wait.

**Dogfood re-verify @ `1c577da5`** (compiler churned `1e63bbb1` → `1c577da5` since S19): 16/17 lib compile · 7/7 UI compile · **7/7 browser-paint** (all pages render real data, incl. feed's live SSE) · 375/0. **No regression.** All 15 other lib `.js` artifacts byte-identical. Two non-findings: `scrml:path` shim refreshed upstream (POSIX separator normalization via `toPosixSep` — no-op on Linux, rode along on recompile); the lone browser console 404 is `/favicon.ico` (none shipped, cosmetic).

### Cleanup (post-split)
- [ ][ ] Non-compliance audit — *(S19 dogfood re-verify covered compiled-artifact currency: all sources compile clean on current HEAD, UI paints 7/7. A doc-vs-spec non-compliance pass is still open.)*
- [ ][ ] Cold project map — *(S19 did an incremental project-mapper refresh at wrap; a full cold regen is still open.)*

---

## F. Cross-repo

- **scrml** — compiler gate target. **Renamed from `scrmlTS` (~s210, 2026-06).** Now lives at `../scrml` (`compiler/src/cli.js`); `../scrmlTS` no longer exists. Older log entries below referencing "scrmlTS @SHA" / `scrmlTS/handOffs/...` are historical records under the prior name — left as-is.
- **scrml-support** — all giti research + history
- **scrml8** — frozen archive
