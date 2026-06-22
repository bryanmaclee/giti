# UI Idiomatic Rewrite — Progress

Change-id: `ui-idiomatic-rewrite`
Driver: giti S15 (2026-06-22)
Brief: `../scrml-support/docs/deep-dives/giti-idiomatic-audit-2026-06-20.md` + inbox `2026-06-20-2109-scrml-to-giti-idiomatic-audit-rewrite-plan.md`
Compiler: `../scrml` @ `ca712295` (s212, self-id scrml-0.7.0)

## Validated template (current-compiler syntax — corrects audit examples)
- Enum block form: `type Phase:enum = { Loading; Loaded(data: T[]); Failed(err: string) }` (no `transitions{}` for Tier-1 match).
- State cell: `<phase> = Phase.Loading`
- Trigger: `on mount { @phase = loadX() }`
- Server fn returns the variant directly: `if (!res.ok) return Phase.Failed(res.error)` / `return Phase.Loaded(res.data)` — leverages giti Result-tuple contract; NO `!{}` operator needed for the dashboard loads.
- Block-match: `<match for=Phase on=@phase>` with element state-children `<Loading>…</Loading>`, `<Failed(err)>…</Failed>`, `<Loaded(d)>…</Loaded>` (NOT `.Variant :>`).
- Iteration: `<each in=coll key=@.id> … <empty>…</empty> </each>`; `@.field` = current item.
- `scrml promote` is NOT implemented ("impl pending") — Tier-0 sweep is manual.
- Doing full rewrite per-page in ONE pass (each-promotion + Phase-enum together), not two passes.

## Log (append-only)

- 2026-06-22 — Probe `/tmp/giti-idiom-probe/history-shape.scrml` compiled clean, node --check OK, match/each wired. Template validated.
- 2026-06-22 — CG-5 verified resolved: `@import url('theme.css')` emitted intact. history.scrml stale comment removed + scrmlTS→scrml (L14). Committed `a267163` (375 tests green).
- 2026-06-22 — **RESUMED.** Concurrent doctrine refactor committed as `724500b` (pa-base v1 + giti overlay); tree quiet. New pa.md commit rules confirmed consistent (explicit pathspec, manual `bun test` gate, no installed hook).
- 2026-06-22 — **history.scrml DONE** (task #2). TimelinePhase enum + variant-returning `loadTimeline` + `on mount` + `<match for=TimelinePhase on=@timeline>` + `<each in=entries key=@.changeId>`+`<empty>`. Dropped `${}` wrapper (bare top-level) → W-PROGRAM-REDUNDANT-LOGIC gone. Compiles clean (only SPA-inferred info), node --check OK on client+server.

- 2026-06-22 — **bookmarks.scrml DONE** (task #3). BookmarksPhase enum + variant-returning loader + `<match>` + `<each in=list key=@.name>`+`<empty>`. Nested `${if(b.active)lift}` badge → ternary-as-value `${ @.active ? <span…> : "" }` (markup-in-ternary compiles fine). scrmlTS→scrml (L10). Clean compile, node --check OK.

- 2026-06-22 — **status.scrml DONE** (task #4, flagship). 3 independent loads → 3 Phase enums (StatusPhase/BookmarksPhase/HistoryPhase) + `<match>` per section. 6 for-lift → `<each>`. Conditional content-sections (conflicts/public/private/mixed/bookmark) → ternary-as-value `${ cond ? <markup> : "" }` (Pillar 1), nesting `<each>` inside. `bookmark: string?` optional field for absence. Dropped unused `changed` field. **GITI-006/CG-6 defaults-dodge dissolved** (`.Loading` is the seed). Gotchas hit + fixed: (a) multi-statement `on mount {}` drops trailing stmts → split into 3 single-stmt `on mount` blocks (§6.7.1a); (b) W-DEPRECATED-SERVER-MODIFIER on loadStatus (process.cwd triggers server-inference) — KEPT `server` kw (loadHistory/loadBookmarks aren't auto-inferred, need it; consistent w/ committed files). Clean compile, node --check OK, 375 tests green.

- 2026-06-22 — **land.scrml DONE** (task #5). `running: true` loading-bool → `PreflightPhase.Loading` variant (the headline smell, killed). PreflightReport struct (4 gate sub-structs w/ optional fields for the union-shaped gates: `error: string?`, `fileCount: number?`, `skipped: boolean?`, `count: string?`). `<match for=PreflightPhase>`; banner + 3-way compiler badge + gate badges/details → ternary-as-value; 2 for-lifts → `<each>`. `.Failed` arm kept for symmetry (loadLandingPreflight captures gate errors as data, never top-level-fails — dead-but-harmless arm, no lint). Clean compile, node --check OK, 375 tests green.

- 2026-06-22 — **diff.scrml DONE** (task #6, deepest nesting). TWO axes as enums: DiffMode (WorkingCopy | Change(id)) for the working-copy-vs-selected fork (id as payload, kills `change: string?` truthy-checks), DiffPhase (Loading | Loaded(diff) | Failed) for the load + HistoryPhase for the picker. `<match for=DiffMode>` used in 3 fork sites (audit's "+ a <match> for the fork"); deepest case is `<match for=DiffMode>` nested inside a ternary inside a DiffPhase `.Loaded` arm — compiles fine. URL param → enum via `fn modeFromUrl()` / `fn changeIdFromUrl()` (used `fn` per I-FN-PROMOTABLE; pure). 1 for-lift → `<each>`. scrmlTS→scrml. Clean compile, node --check OK, 375 tests green.

- 2026-06-22 — **live.scrml DONE** (task #7) — **DEVIATION from audit (engine→match), compiler-forced.** Probed the audit's `<engine for=Phase>` on the channel cell: **`E-RI-002`** — a server-escalated fn (refreshStatus reads jj) may write a `<channel>` cell (special-cased client-held sync, §38.4) but CANNOT write an `<engine>` cell. So an engine's auto-cell can't be the channel-synced cell live.scrml needs (dropping the channel would kill cross-tab sync — the page's whole purpose). Best viable idiom: KEEP channel + `<snapshot>`, type `state` as `Phase` enum (Idle|Ok|Error — the 3 states the write path actually produces; no dead Refreshing), render via `<match for=Phase on=@snapshot.state>` (kills the raw-`${@snapshot.state}`-string-in-DOM smell + gives exhaustiveness). `${for…lift}` → `<each>`+`<empty>`. CG-1 (single top-level @snapshot write) + CG-3 (no-reassignment/ternaries) KEPT. Clean compile, node --check OK, 375 tests green. **→ FILE a gap report to scrml: engine cell cannot be a channel-synced / server-written cell (blocks the audit's engine recommendation for channel/SSE pages).**

### Notes / follow-ups
- W-DEPRECATED-SERVER-MODIFIER: the `server` keyword is deprecated when body uses a server-only resource. giti uses `server function` throughout; modernizing to inference-based is a separate repo-wide task, NOT part of this idiomatic rewrite. Loaders that only call getEngine() (history/bookmarks) are NOT auto-inferred and still REQUIRE the keyword.

### (earlier) — **PAUSED before Tier-1 rewrites.** Detected a concurrent git actor mutating the index during the session (pa.md/pa-base.md base+overlay doctrine refactor: pa.md edited→reverted, pa-base.md staged→unstaged, audit msg `git add -N`). Per-file commits to main are unsafe while another process churns the shared index. User chose "pause until tree is stable." RESUME when user confirms the tree is quiet. Validated template above is ready; next unit = history.scrml (task #2). When resuming, use path-limited commits (`git commit -- <files>`) as defense-in-depth.
