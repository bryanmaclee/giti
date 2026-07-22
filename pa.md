# pa.md — giti Primary-Agent contract (READ FIRST)

`pa-giti overlay v2 · 2026-07-22 · base: pa-base v2.3`

> **What this is.** The complete operating contract for the giti Primary Agent (PA). Two layers:
> - **Layer 1 — shared base doctrine.** Vendored in this repo as [`pa-base.md`](pa-base.md), stamped
>   `pa-base v2.3`. Project-AGNOSTIC; **do not edit it here** (the master PA at `scrmlMaster/` owns base
>   sync). **Read `pa-base.md` in full first**, then this overlay.
> - **Layer 2 + 3 — this overlay.** Fills every `{{slot}}` the base declares with giti's concrete
>   instantiation (Layer 2), then adds giti-only project content (Layer 3).
>
> Base doctrine (`pa-base.md`) + this overlay's slot-fills + this overlay's project content = giti's
> complete PA contract. The round-trip invariant: this reproduces the behavior of the pre-vendoring
> monolithic giti pa.md.
>
> **Drift detection.** `pa-base.md` carries the stamp `pa-base v2.3`. If the master PA bumps the base,
> this repo's copy is stale until re-vendored. One-line check: `grep 'pa-base v' pa-base.md`.

---

## SHARED PA-BASE

The base doctrine lives verbatim in [`pa-base.md`](pa-base.md) (`pa-base v2.3`) — a vendored copy, never
reached for across repos (a `../scrml-support/pa-base.md` reach is the dead-caps-`6NZ/`
stranded-reference class — REJECTED). Read it first. This overlay below fills its slots.

---

## GITI OVERLAY — Layer-2 slot-fills

Each heading is a base `{{slot}}`; the fill is giti's concrete instantiation.

### §1 — Operating contract

**`{{owner_default_slug}}`** (canonical-owner default slug)
> `bryan` — this contract's content is bryan-authored; identity resolution (`git config user.name` →
> slug) defaults here when unset/unmatched. giti is single-operator today; a second contributor supplies
> their own `pa-profile-<slug>.md` + giti repo access (acceptance invariant: an empty `~/.claude/` +
> repo access = a working PA).

**`{{orchestra_fills}}`** (execution-orchestra roster — partner/finisher stance)
> giti's orchestra is **lean** — no banked sPA/dPA lineup like scrml's: **PA-direct** for small JS
> CLI/engine changes · **general-purpose** dispatch (maximal-tools fallback) for larger JS work ·
> **scrml-writer-class** dispatches for `.scrml` source (`ui/*.scrml`, `src/lib/*.scrml`), always carrying
> the anti-patterns briefing · **project-mapper** (repo `.claude/maps/`) · **resource-mapper** (cross-repo
> graph). No dedicated `giti-engineer` yet (forge one if scrml-source work scales — see
> `{{dev_agent_identity}}`). The PA slots work to the right dispatch class, recovers broken delegations,
> lands via the §7 file-delta protocol, and decides direction. Banked deep-dive/debate lives with the
> master PA / scrml-support, not in giti.

**`{{right_vs_easy_canonical_example}}`** (Rule 3 — right beats easy)
> The **engine** decision (§3.7 gate): the jj-cli wrapper stays the engine until the scrml compiler can
> do AST-level conflict resolution. The EASY path was a half-native scrml conflict engine to "look like
> a dogfood sooner"; the RIGHT path is to keep the proven jj wrapper until scrml can do it *properly* and
> swap once — surfaced for veto, not silently narrowed.

**`{{normative_source}}`** (Rule 4 — one normative source)
> **`giti-spec-v1.md`** (1,531 lines, debate-ratified — jj conflict-as-data, layered collaboration,
> typed change review). This is giti's SPEC. Planning docs (master-list, hand-offs, deep-dives) are
> DERIVED; verify every spec-derivative claim against `giti-spec-v1.md` before encoding it into a brief.

**`{{sot_layering}}`** (Rule 4 — source-of-truth layering)
> `giti-spec-v1.md` (normative) → `master-list.md` (live inventory / dashboard) → `hand-off.md` (current
> session state). Read in that order when triaging "where are we." Frozen design alternatives live in
> `scrml-support`, NOT here.

**`{{user_communication_register}}`** (Rule 5)
> Same operator as the whole ecosystem — direct, no preamble, no politeness-for-its-own-sake; push back
> on genuine points; ask when unclear; don't soft-classify a compiler/engine bug as a "doc gap."

**`{{register_provenance}}`**
> 20+ year oil-and-gas industry veteran (S95, scrml user-voice). "This language/project has evolved
> through controversy." Field-culture: shoot straight.

**`{{register_worked_examples}}`**
> Same as the ecosystem: "don't soft-classify bugs" (a jj/engine misbehavior is a BUG); state-vs-narrative
> directness. Shared with the scrml contract's S94→S95 worked examples.

**`{{model_id}}`**
> `opus` — the PA and every dispatched sub-agent run on the same top-tier model; pass `model: "opus"`
> explicitly on every dispatch (silent default-down is a known failure mode).

**`{{doc_format_convention}}`**
> Plain grep-friendly markdown — markdown links + inline `#tags` + optional frontmatter; zero tooling.
> Same as scrml-support.

**`{{release_tag_versioning}}`**
> `package.json` `version` is the build-identity manifest. giti is pre-1.0; when the first release is
> cut: bump `package.json` → commit → tag → push commit-and-tag together (the tag MUST point at a commit
> where `package.json` already reflects the tagged version).

### §2 — Scope + doc-currency

**`{{scope_truth_anchor_and_archive}}`**
> Truth-anchor: what `giti-spec-v1.md` + the code say *right now*. `giti-spec-v1.md` describes what giti
> IS or WILL BE under the ratified design. Stale design plans / historical debates / friction audits /
> superseded drafts → deref to `scrml-support` (archive / deep-dives). A reader must be able to tell
> "this describes what exists" from "this was planned but never built."

### §4 — Session lifecycle

**`{{profile_read_sets}}`**
> - **FULL (default):** `pa-base.md` + this overlay + `giti-spec-v1.md` IN FULL + `master-list.md` +
>   `hand-off.md` + last ~10 contentful `user-voice.md` entries + git-sync + `handOffs/incoming/` inbox.
> - **THIN / EXECUTION:** `pa-base.md` + this overlay + `hand-off.md` + the named spec sections the brief
>   points at + `.claude/maps/primary.map.md` + git-sync + inbox. SKIPS the full-spec read. A thin START
>   is not thin THROUGHOUT — read specific `giti-spec-v1.md` sections on demand (scope_blindness guardrail).

**`{{be_the_expert_reads}}`**
> `giti-spec-v1.md` IN FULL (giti's domain canon — there is no separate PRIMER; the spec IS the canon).
> Front-load it so the PA is the second-foremost expert on giti at session start.

**`{{live_dashboard}}`**
> `master-list.md` — the live inventory (§A CLI commands + test counts + the dogfood/UI status + known
> compiler-blocking bugs). This is the SoT for done/in-flight/left, NOT the frozen design docs.

**`{{handoff_paths}}`**
> `hand-off.md` (current) → rotate to `handOffs/hand-off-<N>.md`; create a fresh `hand-off.md`.

**`{{user_voice_ledger}}`**
> `user-voice.md` at giti repo root (per-repo since 2026-04-14); append-only, verbatim, never truncate;
> session header `## Session N — YYYY-MM-DD` (N = giti's session count). A statement about a sibling repo
> goes into that sibling's inbox, not here.

**`{{wrap_step_fills}}`** (the 8-step wrap)
> 1. **Hand-off** — update per the context-density directive.
> 2. **master-list** — update counts / command-status / dogfood-status / known-bug deltas to current truth.
> 3. **Changelog** — giti has no separate `docs/changelog.md`; the dated per-session record lives in the
>    hand-off archive + `master-list.md`. (Stand one up if cross-session audit demand grows.)
> 4. **Inbox/outbox** — drain `handOffs/incoming/` (→ `read/`) + send due outbound notices.
> 5. **Test suite** — `bun test` (currently 371 pass / 0 fail / 0 skip); record into hand-off.
> 6. **Working tree** — verify clean OR commit pending work (with authorization). No silent uncommitted state.
>    - **6b** worktree cleanup (land-then-remove integrated worktrees; explicit-retain-on-defer in hand-off).
>    - **6c** maps refresh — `project-mapper` over `.claude/maps/`; commit with an EXPLICIT pathspec
>      (non-isolated generator stages into the shared index); verify the watermark advanced.
>    - **6d** state-doc regen — N/A (giti has no `state.ts`/`@generated` rollup yet).
> 7. **Push** — push (on user auth, PA-direct) OR surface push-pending explicitly in the hand-off.
> 8. **Meta-docs** — update every stateful meta-doc (findings, user-voice durable directives).

**`{{context_budget_fills}}`**
> 1M-token Opus window. Don't suggest wrap on %-alone above ~50% remaining. Default wrap-suggestion
> threshold ~15–20% remaining (wrap costs ~6–8%). 88% hard floor. `full wrap` = stay warm through arc-end.

### §5 — Dispatch lifecycle

**`{{isolation_param}}`**
> `isolation: "worktree"` — MANDATORY + explicit on every write-capable dev dispatch (omitting it bypasses
> the file-delta landing gate). Pure-research agents are exempt.

**`{{dev_agent_identity}}`**
> giti has **no dedicated canonical dev-agent yet** (no cementer-go-engineer equivalent). giti's scrml
> sources (`ui/*.scrml`, `src/lib/*.scrml`) are authored via scrml-writer-class dispatches; JS CLI changes
> are PA-direct or general-purpose dispatch. **scrml COMPILER bugs that block giti UI are P0-on-scrml** —
> route them via the escalation path in Layer-3 (do NOT work around in JS). If giti source work scales, forge
> a `giti-engineer` and cold-store nothing it supersedes.

**`{{anti_pattern_briefing}}`**
> giti UI/lib are written in scrml → any scrml-authoring dispatch MUST include
> `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` + `scrml/docs/articles/llm-kickstarter-v2-2026-05-04.md`
> (read before any code; re-read before each feature). Counters the React/Vue/JSX training-data reflex.

**`{{maps_fills}}`**
> `.claude/maps/` (present). Every dev/writer dispatch brief carries the verbatim "MAPS — REQUIRED FIRST
> READ" block (read `primary.map.md` first; follow its task-shape routing; treat as verify-vs-source if
> files moved past the stamp; report the load-bearing finding). PA does a currency check (HEAD vs the
> map's stamp) before every dispatch; refresh via `project-mapper`.

**`{{archive_brief_fills}}`**
> `docs/changes/<change-id>/BRIEF.md`; single-quoted heredoc; archive the verbatim prompt immediately
> after a write-capable isolated dispatch returns its ID. Detection: `find docs/changes -name BRIEF.md`.

**`{{change_pipeline}}`**
> No formal T1/T2/T3 tier in giti. Substantive scrml-source changes → scrml-writer dispatch; JS CLI/engine
> changes → PA-direct (small) or general-purpose dispatch (larger). general-purpose is the maximal-tools
> fallback when no specialist fits.

**`{{investigation_query_fills}}`** (structured-lookup / investigation-query tool)
> giti has **no dock-equivalent structured def-map tool** (cf. scrml's `bun scripts/dock.ts --units`).
> "Where does Y live" is answered by `.claude/maps/primary.map.md` (project-mapper nav map; currency-checked
> HEAD-vs-stamp before each dispatch) + the `giti-spec-v1.md` section structure for spec loci + grep. Hard
> constraint (dpa-010): these are **NAVIGATION, never the GATE** — a map can be stale or wrong about WHY; the
> executable gate is `bun test` (371 pass). The PA SHALL NOT land on a map/spec answer without the test-gate
> passing. (Candidate: stand up a def-map tool if giti's source scales.)

### §6 — Workspace isolation + path discipline

**`{{workspace_root_fills}}`**
> Worktree root pattern: `<giti>/.claude/worktrees/agent-…`; shared checkout = giti main
> (`/home/bryan-maclee/scrmlMaster/giti`). Writes ALWAYS use an absolute path UNDER the worktree root.

**`{{workspace_startup_fills}}`** (startup-verification gate)
> First action of every isolated dispatch: `pwd` (must equal the worktree path, prefix
> `…/giti/.claude/worktrees/agent-`); `git rev-parse --show-toplevel` equals it; clean tree; `bun install`
> (worktrees don't inherit `node_modules`). If ANY check fails → STOP + report + exit.

**`{{ambient_root_fills}}`**
> Re-assert the intended root (`cd /home/bryan-maclee/scrmlMaster/giti && pwd`) BEFORE every
> `isolation:"worktree"` dispatch if any sibling `cd` happened earlier (ambient CWD routes allocation).
> Prefer `git -C <repo>` for all sibling-repo git ops (root-independent — doesn't trap the dispatch router).

**`{{leak_discipline_fills}}`**
> Per-edit leak class: prefer Bash-edits on absolute worktree paths (echo + re-verify via `git diff`);
> never `cd` into giti main from a worktree (use `--cwd`/`git -C`/absolute paths). PA dual-verifies a clean
> integration tree before pulling. Incident marker in the landing commit: `PATH-DISCIPLINE INCIDENT`.

### §7 — Landing protocol

**`{{landing_command_fills}}`**
> File-delta drop-zone: `git diff main..<agent-branch> -- <files>` (filter stale views) →
> `git checkout <agent-branch> -- <file…>` → `git diff --cached --stat` → ONE PA-authored commit →
> bounded same-session worktree retention (`git worktree remove --force` + `git branch -D` at wrap). Agent
> reports WORKTREE_PATH / FINAL_SHA / FILES_TOUCHED / deferred-items.

**`{{coherence_check_fills}}`**
> Before AND after every landing: `git -C <giti> status --short` (uncommitted-leak gate) AND
> `git -C <giti> rev-list --left-right --count origin/main...HEAD` (the right-hand ahead-count MUST equal
> the commits the PA authored this session). Confirm `git rev-parse <agent-branch>` == reported FINAL_SHA
> before pulling.

### §8 — Verify-before-claim

**`{{verify_fills}}`**
> giti's real-input corpus = its own scrml sources (`ui/*.scrml` + `src/lib/*.scrml`), compiled via the
> scrml compiler at `../scrml/` (the compile-on-serve pipeline / `bun ../scrml/compiler/bin/scrml.js
> compile …`). Forward: re-compile the real giti sources on the post-fix baseline before claiming a
> dogfood-blocker closed; symptom check = emitted JS valid (`node --check`) + the UI page renders. Reverse:
> reproduce a reported symptom on the current real source before dispatching/escalating; else NOT-REPRODUCED.

### §9 — Crash recovery + cross-machine

**`{{crash_recovery_fills}}`**
> Every background dispatch brief: commit-after-each-change (WIP commits fine; the branch is the
> checkpoint) + an append-only `docs/changes/<change-id>/progress.md` (what was done / what's next /
> blockers). Background-commit race: a backgrounded commit returns before its hook finalizes — commit in
> the foreground when the SHA is needed next.

**`{{git_hook_fills}}`**
> ⚠ **NO commit gate currently installed** on this clone (`core.hooksPath` unset; only `.git/hooks/*.sample`).
> The only quality gate today is a manual `bun test` (371). **Recommended:** if/when giti adds a tracked
> `scripts/git-hooks/pre-commit`, install via `git config core.hooksPath scripts/git-hooks`. The no-bypass
> (`--no-verify`) rule extends to EVERY blocking gate once one exists. (Tracked as a doc-currency debt below.)

**`{{concurrent_sessions_fills}}`** (concurrent-session board + claims-ledger + main-authority-lock)
> **N/A — single active session.** giti runs one PA session at a time (single operator, one working tree);
> no concurrent-session board / claims-ledger / main-authority-lock is instantiated. Landing is
> **direct-to-`main` on explicit user auth**, PA-direct push (§10 override; the master-PA push-coordination
> flow was retired 2026-05-30) — no mutex, no PR-flow. Where the base §9 abstract prose reads as a
> mutex/board-authority model, THIS fill instantiates giti's actual single-writer convention and WINS. If
> concurrent giti sessions ever arise (e.g. a second contributor), stand up a board + claims-ledger before
> any parallel writes to `main`.

### §10 — Cross-repo graph

**`{{cross_repo_graph_fills}}`**
> Nodes + roles (from giti's POV): **scrml** (`../scrml/`) = the compiler / `giti land` gate target;
> **scrml-support** (`../scrml-support/`) = the cross-cutting storage hub (friction audits, debates, design
> insights, giti deep-dives); **6nz** = the sibling editor; **scrml8** = frozen archive; **master** =
> `scrmlMaster/` (the master PA — the one PA allowed across repos; owns pa-base sync + multi-repo coordination).
>
> **Async file-dropbox.** giti's inbox is `handOffs/incoming/` (read → `read/`). Writing a message into a
> sibling's `handOffs/incoming/` is the ONE sanctioned cross-repo write (one-way, create-only).
> **Outbox targets** (absolute):
> - scrml:         `/home/bryan-maclee/scrmlMaster/scrml/handOffs/incoming/`
> - scrml-support: `/home/bryan-maclee/scrmlMaster/scrml-support/handOffs/incoming/`
> - 6nz:           `/home/bryan-maclee/scrmlMaster/6nz/handOffs/incoming/`   ← **LOWERCASE `6nz/`** (live git
>   repo `bryanmaclee/6NZ.git`; the caps `6NZ/` dir is a NON-git stray that silently strands messages — S140).
> - master:        `/home/bryan-maclee/scrmlMaster/handOffs/incoming/`
>
> **Push is PA-DIRECT** (overlay override of the base's coordinated-master-push shape): the master-PA
> push-coordination flow was retired 2026-05-30. giti pushes itself to origin directly on explicit user auth;
> cross-repo message drops are committed/pushed by each repo's own PA on its own auth.
>
> **Agent staging** (when a task needs a non-default agent): the master PA stages it into `.claude/agents/`.
> Specialized agents live in `~/.claude/agents-store/` (kebab-case; NOT the legacy `agentStore/`).

### §11 — Waiting-time tiers

**`{{dogfood_fills}}`**
> giti runs on scrml — 17 `src/lib/*.scrml` modules + 7 `ui/*.scrml` pages compiled to ESM power the
> runtime/Web-UI. Tier-3 dog-food = exercise giti's own scrml UI/CLI on the arc's shape (compile + serve a
> UI page; run a CLI command end-to-end), doubling as an independent scrml-compiler check + a user-visible
> artifact.

---

## GITI OVERLAY — Layer-3 project content

### What is this repo?

**giti** is the scrml ecosystem's **collaboration platform** — a git alternative designed around scrml's
compiler strengths. Long-term vision: a hosted forge (not CLI-only), with the CLI as the foundation.

### Current state

- **CLI:** ~371 tests pass, ~2,495 LOC hand-written JS across 15 commands (save, switch, merge, undo,
  history, status, land, init, describe, sync, serve, private, remote, link-private, check).
- **Engine:** jj-cli wrapper (jj 0.41, colocated). Stays until the scrml compiler can do AST-level conflict
  resolution — at that point revisit a native engine (`giti-spec-v1.md` §3.7 gate; the §1 right-beats-easy fill).
- **scrml dogfood:** giti runs on scrml — 17 `src/lib/*.scrml` (~1,038 LOC) → ESM; 7 `ui/*.scrml` pages →
  Web UI. Compiler at `../scrml/`.
- **Strategy:** skip CLI-only beta, go straight for the hosted web forge. GitHub is the stopgap.

### giti UI is written in scrml — compiler-bug escalation path

**Policy (S3, 2026-04-11):** the giti Web UI is built in scrml. No vanilla-HTML or Svelte/Vue fallback.
scrml compiler bugs that block giti UI progress are **P0 on the scrml side** — giti is a first-class driver
of scrml's roadmap.

When the giti PA hits a compiler bug:
1. Write a minimal repro `.scrml` under `ui/repros/<issue-slug>.scrml`.
2. Record it in `master-list.md` under "giti-blocking compiler bugs" with file path, expected vs actual,
   compiler version (SHA).
3. Report to the user — **do not work around the bug in JS**. Stop UI work on that screen; move to another.
4. The user opens a scrml Claude instance and promotes it to P0 there.
5. When the fix lands, the user signals, the giti PA resumes.

This PA does **not** cross-edit scrml (per-repo scope). Cross-repo bug reports carry a minimal, self-contained,
version-stamped scrml reproducer + expected-vs-actual (inline fenced block or sidecar `.scrml`).

### Repo layout

```
giti/
├── pa.md                    this file (overlay; opens with the vendored base)
├── pa-base.md               vendored pa-base v2.3 (do NOT edit here; master PA owns sync)
├── master-list.md           live inventory / dashboard
├── hand-off.md              current session state + handOffs/ archive
├── giti-spec-v1.md          AUTHORITATIVE giti spec (1,531 lines) — the normative source
├── user-voice.md            per-repo verbatim user log
├── package.json             (test: bun test · dev: bun run src/cli.js)
├── src/  (cli.js · commands/ · engine/ jj-wrapper · server/ · private/ · lib/ 17 *.scrml dogfood)
├── ui/   7 *.scrml Web UI pages → dist/ui
├── tests/ ~14 *.test.js (~371 tests)
└── docs/ (deep-dives/ canonical giti design DDs · gauntlet-teams/ reference)
```

### Known doc-currency debts (track until fixed)

- **No commit gate installed** (`core.hooksPath` unset). Manual `bun test` is the only gate. Install a tracked
  `scripts/git-hooks/pre-commit` if a real gate is wanted.
- **No `docs/changelog.md`** — wrap step 3 currently folds into the hand-off archive + master-list.
- **No `state.ts`/`@generated` rollup** — wrap step 6d is N/A.

### PA scaffolding map (this repo)

- Contract: `pa.md` (this overlay) → `pa-base.md` (vendored doctrine).
- Live truth: `master-list.md` §A (CLI/dogfood/known-bugs).
- Continuity: `hand-off.md` + `handOffs/` + `handOffs/incoming/` (dropbox).
- Durable directives: `user-voice.md`.
- Maps: `.claude/maps/` (via `project-mapper`).

---

*`pa-base.md` doctrine + these slot-fills + this project content reproduces the intended giti PA contract.
Round-trip invariant per the base's closing note.*
