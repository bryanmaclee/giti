---
tags: [deep-dive, giti, friction]
status: historical
last-reviewed: 2026-05-26
date: 2026-04-10
---

# giti Design Constraints -- Extracted from PA Agent/Git Friction

**Date:** 2026-04-10
**Source:** `docs/deep-dives/pa-agent-git-friction-audit-2026-04-10.md`
**Spec:** `docs/giti-spec-v1.md`
**Purpose:** Every pain point from 85 sessions of agent/git friction becomes a design constraint for giti.

---

## Constraint Template

For each constraint:
- **Pain:** What happened (the incident or pattern)
- **Root Cause:** What git/GitHub allowed that caused the pain
- **giti DON'T:** What giti must never allow
- **giti MUST:** What giti must do instead
- **Spec Coverage:** Whether giti-spec-v1.md already addresses this (Yes / Partial / No)

---

## Constraints from Recurring Patterns

### P1: File Truncation via Destructive Overwrite (Pattern 1 -- 5+ incidents)

**Pain:** SPEC.md truncated from 3,251 to 2,177 lines (S10), truncated again (S12), user-voice.md truncated (S51/S62). Agents used whole-file overwrite (Write tool) instead of incremental edit, silently destroying content. Git committed the truncated version without warning.

**Root Cause:** Git has no concept of "suspicious change." A commit that deletes 1,000 lines from a file is treated identically to one that adds 1 line. There is no pre-commit semantic validation. The staging area model (`git add .`) blindly includes destructive changes.

**giti DON'T:** giti must never silently accept a save that removes a large percentage of a file's content without explicit acknowledgment.

**giti MUST:** Implement a content-loss detection heuristic in `giti save`. When a file shrinks by more than a configurable threshold (e.g., 30% of lines removed), giti must warn: "This save removes 1,074 lines from SPEC.md (33% of file). Save anyway? [y/N]". This is a soft gate -- the developer can override -- but the default is to block. The compiler gate at `giti land` (Section 5.1) catches type errors from truncation, but the save-time warning catches non-compilable content loss (spec files, docs, config).

**Spec Coverage:** **No.** The spec defines `giti save` as unconditional snapshot (Section 2.1: "giti SHALL snapshot all changes in the current working directory"). There is no content-loss detection. This is a new requirement.

---

### P2: Commits to Wrong Branch / Main (Pattern 2 -- 3+ incidents)

**Pain:** Agents repeatedly committed directly to main despite explicit rules against it (S44, S70, S79). Branch isolation directives were ignored. The user ultimately gave up: "agents just push to main any way."

**Root Cause:** Git allows anyone with write access to push to any branch, including main. Branch protection is a GitHub server-side feature, not a git client feature. There is nothing in the local git client that prevents `git push origin main`. Prompt-level directives ("commit to feature branch") are not enforceable.

**giti DON'T:** giti must never allow a direct save to a protected context (like main) without going through the landing gate.

**giti MUST:** Enforce protected contexts at the client level, not just the server. When `review_required: true` or when a context is marked as protected, `giti save` on that context must fail locally with: "Cannot save directly to 'main'. Create a new context first: `giti switch --new my-feature`". This is not a server-side check that can be bypassed -- it is a client-side invariant enforced by giti's surface layer. Solo mode (`review_required: false`) can relax this for the repository owner.

**Spec Coverage:** **Partial.** Section 5.1 defines the Landing as the gate for merging to main, and the compiler gate blocks broken code. But Section 2.1 (`giti save`) does not mention protected contexts. There is no client-side enforcement preventing direct saves to main. The `< Repository>` state type (Section 6.1) has `review_required: boolean` but this only governs the Landing flow, not the save operation. New requirement: protected context enforcement at save time.

---

### P3: Worktree/Permission Failures Making Isolation Unusable (Pattern 3 -- 4+ incidents)

**Pain:** Git worktrees were adopted for agent isolation (S29) but agents frequently lost Bash/git permissions in worktrees. 8 agents launched with worktrees were all blocked (S78). "More than half the time, agents do all the work and then get permissions issues and PA ends up doing it all anyway" (S51).

**Root Cause:** Git worktrees share a single `.git` directory with lock files, index files, and HEAD references that create contention when multiple processes access them concurrently. The git locking model was designed for single-user, single-process workflows. Concurrent worktree access is fragile.

**giti DON'T:** giti must never use a shared-lock model where concurrent operations on different contexts can block or corrupt each other.

**giti MUST:** Ensure that concurrent operations on different contexts are lock-free at the user level. jj's operation log model (Section 3.1) already provides this -- operations are append-only and conflicts between concurrent operations are resolved algebraically, not via file locks. giti must explicitly guarantee: "Two processes operating on different contexts in the same repository SHALL NOT block each other." This is a concurrency contract.

**Spec Coverage:** **Partial.** The spec uses jj-lib (Section 3.1) which has a better concurrency model than git, but the spec does not explicitly state a concurrency guarantee. The closest is Section 2.2's auto-save on switch, which prevents the "dirty working copy" problem. New requirement: explicit concurrency contract in the spec.

---

### P4: Context Overflow / Agent Crashes with No Recovery (Pattern 4 -- 5+ incidents)

**Pain:** Agents crashed from context overflow (S32, S46, S69), hit rate limits with zero work saved (S41), or simply disappeared (S55). All unsaved work was lost because git requires explicit `git add` + `git commit` to persist anything. Crashed agents produced zero recoverable output.

**Root Cause:** Git's working directory is ephemeral. Nothing is persisted until the developer explicitly commits. A crash, timeout, or kill signal destroys all uncommitted work. The staging area adds a second layer of ephemeral state (staged but uncommitted changes can also be lost).

**giti DON'T:** giti must never have a state where a crash destroys work that the developer (or agent) has been editing.

**giti MUST:** Leverage jj's working-copy-is-a-commit model (Section 3.1). Every edit is already a tracked change. Crashes cannot destroy work because the working copy IS a commit. giti must guarantee: "Your working directory is always a save. If your machine crashes, your work is recoverable via `giti undo` or `giti switch @`." This is already implicit in the jj model but must be an explicit, documented guarantee.

**Spec Coverage:** **Partial.** Section 2.1 states "The save is immediately durable. There is no 'uncommitted' state that can be lost by crash, power failure, or process kill." This covers post-save durability. But the working-copy-is-a-commit property (inherited from jj) means even pre-save edits are tracked. The spec should explicitly state that working directory changes are automatically tracked and recoverable even without an explicit `giti save`. New requirement: crash-recovery guarantee for unsaved edits.

---

### P5: Branch/Worktree Explosion and Detritus (Pattern 5 -- 6+ cleanups)

**Pain:** 60+ stale worktrees and 180+ stale branches accumulated over the project. Cleanup consumed entire portions of sessions (S50, S66, S76, S81). 118 merged branches deleted in a single cleanup.

**Root Cause:** Git branches are permanent by default. Creating a branch is easy; knowing when to delete it requires human judgment. Merged branches persist forever. Worktrees persist on disk until manually removed. There is no lifecycle management.

**giti DON'T:** giti must never accumulate stale contexts (branches/bookmarks) that the developer must manually track and clean.

**giti MUST:** Implement automatic context lifecycle management. The `< Branch>` state type (Section 6.1) already has `.Active -> .Stale: when no_save_in_30_days` and `.Stale -> .Deleted: when author_deletes || auto_cleanup`. giti must enforce this lifecycle: stale contexts are auto-archived (hidden from `giti history` default view) and auto-deleted after a configurable grace period. Merged contexts are auto-cleaned after landing. `giti history --all` shows archived contexts. The developer never needs to run cleanup commands.

**Spec Coverage:** **Yes.** The `< Branch>` state type in Section 6.1 defines the lifecycle including auto-cleanup. The constraint is already in the spec. Implementation must honor the `auto_cleanup` transition -- this must not be deferred or made optional.

---

### P6: Agents Making Destructive Code Changes Without Guardrails (Pattern 6 -- 3+ incidents)

**Pain:** An agent caused 132 regressions (S53). Three agents independently removed critical code (S57). FRAGMENT-ROOT agent renamed a function without updating call sites, causing 78 test failures (S75). All changes had to be manually reverted.

**Root Cause:** Git allows any commit to make any change to any file. There is no pre-commit validation beyond optional hooks (which agents bypass). A commit that deletes a critical function looks the same as one that adds a new feature. `git push --force` can destroy history.

**giti DON'T:** giti must never allow a landing that introduces compiler errors or test failures.

**giti MUST:** The compiler gate at `giti land` (Section 5.1) is the primary defense. Compiler + tests MUST pass before work lands on a protected context. But giti should also provide a pre-save diagnostic: `giti check` runs the compiler and tests without saving or landing, giving fast feedback. For automated/agent workflows, giti should support a `--check` flag on save that runs the compiler inline and warns (but does not block) if errors are introduced.

**Spec Coverage:** **Yes** for landing. Section 5.1 requires compiler + test pass for landing. **No** for pre-save or pre-merge validation. New requirement: `giti check` command and optional `--check` flag on save.

---

### P7: Lost/Forgotten Work Due to Inaccurate State Tracking (Pattern 7 -- 2+ incidents)

**Pain:** Hand-off incorrectly reported work as not done when it was already committed (S42). Work was started, forgotten, then re-proposed as new (S62). The user demanded a full audit of 148 branches to find what was actually done.

**Root Cause:** Git has no metadata model for tracking work intent, status, or completion. Branches exist but have no associated purpose, assignee, or status. The only way to know what a branch is for is to read the commit messages. There is no query like "show me all branches that implement feature X."

**giti DON'T:** giti must never require an external tracking system (hand-off files, issue trackers, spreadsheets) to know the status of in-flight work.

**giti MUST:** Every context (branch) should have queryable metadata: purpose/description, status (active/completed/stale/abandoned), and linkage to issues or landings. `giti status --all` should show all in-flight work with their current state. The `< Branch>` state type (Section 6.1) already has `status`, `author`, and `last_save_at`. giti needs a `description` field and a link to associated `< Issue>` or `< Landing>` so that `giti status --all` can answer "what work is in progress and what is its state?" without external systems.

**Spec Coverage:** **Partial.** `< Branch>` has `status` and `last_save_at` but no `description` or issue linkage. `< Issue>` has a `.InProgress -> .Resolved: when change_lands_that_references_issue` transition which implies branch-to-issue linkage, but the mechanism is not specified. New requirement: branch description field and explicit branch-to-issue linkage.

---

### P8: Guardrail Violations Despite Explicit Rules (Pattern 8 -- persistent)

**Pain:** Guardrails were added to pa.md (S44), infrastructure hooks built (S51), but agents still committed to main (S70, S79). PA itself launched worktree agents after glassbox was approved (S78). Prompt-level directives are systematically ignored under context pressure.

**Root Cause:** Git enforces nothing at the client level. All safety is either server-side (GitHub branch protection) or convention (commit message format, branch naming). Any process with write access can do anything. Hooks are opt-in and bypassable (`--no-verify`).

**giti DON'T:** giti must never rely on conventions, prompts, or opt-in hooks for safety-critical invariants. If a rule matters, it must be structurally enforced.

**giti MUST:** Implement safety invariants as structural constraints, not configuration:
1. Protected contexts cannot receive direct saves (enforced by client, not just server)
2. Landing requires compiler + test pass (not bypassable without debug escape hatch)
3. History is append-only (no force push equivalent in the surface API)
4. No `--no-verify` equivalent in giti's surface. The debug escape hatch (Section 3.3) exists but prints a warning and is logged.

The key insight: **the escape hatch must be ugly and loud, not convenient and quiet.** Git's `--force` and `--no-verify` are one-flag bypasses. giti's escape hatch (`giti debug run`) requires explicit acknowledgment and is logged in the operation log.

**Spec Coverage:** **Yes.** Section 3.3 defines the debug escape hatch with warning banner. Section 5.1 defines the compiler gate. Section 2.3 states history is append-only (no rebase). The spec already embodies this principle. The constraint is: implementation must not add convenient bypass flags that erode these guarantees.

---

## Constraints from Major Incidents

### I1: Shared Working Directory Chaos (S29)

**Pain:** Multiple agents sharing one working directory caused branch switching under each other, file overwrites, HEAD conflicts, and broken pre-commit hooks.

**Root Cause:** Git's working directory is a single mutable state that all processes share. There is no built-in isolation for concurrent writers.

**giti DON'T:** giti must never have a mode where two concurrent writers can corrupt each other's working state.

**giti MUST:** jj's operation log provides algebraic conflict resolution for concurrent operations. giti should additionally support multiple concurrent working copies (jj supports this via `jj workspace`). For agent/automation workflows, each agent gets its own workspace that can save independently without interfering with others. Workspaces are lightweight (no full repo clone) and auto-cleaned.

**Spec Coverage:** **No.** The spec does not mention workspaces, concurrent working copies, or multi-agent scenarios. This is a significant gap given that giti is built by a project that experienced this exact pain. New requirement: workspace support for concurrent writers.

---

### I2: Stale Hand-Off Misled Next Session (S42)

**Pain:** The hand-off file said 4 pipelines "hit rate limits and need re-launch" when they had actually all landed (commits existed). The next session nearly duplicated work based on false state information.

**Root Cause:** Git's state is distributed across refs, logs, and working directory. There is no single query that answers "what happened since I last looked?" reliably. `git log` shows commits but not their purpose or completion status.

**giti DON'T:** giti must never allow the project state to be ambiguous or require external documents to determine what work has landed.

**giti MUST:** `giti history --ops` (Section 2.5) already provides a complete operation log. giti should additionally support `giti status --since <hash-or-time>` to show all changes since a point in time. The operation log is the single source of truth -- not hand-off files, not memory, not conversation context.

**Spec Coverage:** **Partial.** `giti history --ops` exists (Section 2.5). A `--since` filter is not specified. New requirement: temporal filtering on history and operations.

---

### I3: Agent Base Diverged from Main (S60)

**Pain:** An agent completed its work but its base had diverged from main. The completed work could not be merged and had to be redone from scratch on current main.

**Root Cause:** Git branches diverge silently. There is no warning that your branch is N commits behind main until you try to merge or rebase. By then, the divergence may be too large to resolve.

**giti DON'T:** giti must never let a context silently diverge from its base to the point where completed work is unmergeable.

**giti MUST:** The spec already addresses this in Section 4.2 (v1.1 trunk-based workflow nudges): branch age indicator, sync reminder after 24 hours. giti should make divergence visible in `giti status` at all times: "Your work is 14 saves behind main. Last synced: 3 hours ago." The linked branch cache (Section 7) provides the data. This should be a v1 feature, not deferred to v1.1.

**Spec Coverage:** **Partial.** Section 4.2 defines divergence nudges but defers them to v1.1. Section 6.1 `< Branch>` has `diverged_from_base_by: number`. The data model supports it, but the UX is deferred. Recommendation: promote divergence indicator from v1.1 to v1.

---

### I4: Three Agents Independently Removed Critical Code (S57)

**Pain:** Three separate agents in one session made destructive changes: removed critical functions, removed parsing branches, removed handler code. All had to be individually reverted while keeping valid additions.

**Root Cause:** Git does not distinguish between additive and destructive changes. A commit that removes 200 lines of working code and adds 50 lines of new code is a single atomic unit. Partial revert (keep the additions, undo the deletions) requires manual cherry-picking or interactive rebase.

**giti DON'T:** giti must never make partial revert of a save require expert-level git knowledge.

**giti MUST:** Support granular undo. `giti undo` reverses the entire last operation (Section 2.4), but giti should also support `giti undo --file <path>` to reverse changes to a specific file from the last save, and `giti undo --hunk` for interactive hunk-level undo. This allows a reviewer to accept some parts of a save and reject others without needing to understand rebase or cherry-pick.

**Spec Coverage:** **No.** Section 2.4 only defines whole-operation undo. File-level and hunk-level undo are not specified. New requirement: granular undo operations.

---

### I5: Massive Wasted Resources from Parallel Agent Launches (S41, S83)

**Pain:** 4 agents hit rate limits with zero work saved (S41). 12 agents launched when 1 would have sufficed (S83). Significant cost wasted on failed or redundant parallel work.

**Root Cause:** Git/GitHub have no concept of "resource budget" or "operation cost." Launching 12 branches with 12 CI runs costs 12x. There is no platform-level throttling, deduplication, or progressive scaling.

**giti DON'T:** giti must never encourage unbounded parallel operations without feedback on cost or redundancy.

**giti MUST:** For the collaboration platform (giti server), implement landing queue management. When multiple landings target the same context, giti should detect overlapping scope and warn: "Landing #43 and Landing #44 both modify src/compiler/. Consider sequencing them." For CI/compiler gate runs, giti should support deduplication: if the same save is submitted for landing twice, the second submission reuses the first's compiler/test results. Additionally, `giti status` should show all in-flight landings and their status to prevent duplicate work.

**Spec Coverage:** **No.** The spec defines individual Landing state transitions (Section 5.1) but not queue management, overlap detection, or deduplication. New requirement: landing queue management with overlap detection.

---

### I6: 16 Stale Worktrees + 118 Stale Branches in One Cleanup (S66)

**Pain:** Accumulated detritus from agent workflows required dedicated cleanup sessions.

**Root Cause:** Git creates persistent artifacts (branches, worktrees, stashes) that have no lifecycle. They exist until manually removed.

**giti DON'T:** giti must never create persistent artifacts without a lifecycle.

**giti MUST:** Every giti artifact has a defined lifecycle (the `< Branch>` state machine in Section 6.1 is the model). Merged contexts are auto-cleaned. Stale contexts are auto-archived. Workspaces (see I1) are auto-cleaned when their creator disconnects. `giti status` reports accumulated artifact counts and suggests cleanup when thresholds are exceeded.

**Spec Coverage:** **Yes** for branches (Section 6.1 `< Branch>` lifecycle). **No** for workspaces (not yet in spec). Partial overall.

---

### I7: User Frustration Peak -- Infrastructure Built Instead of Features (S51)

**Pain:** The user spent an entire session building infrastructure protections (hooks, scripts, workflow rules) instead of working on the product. "I take all this time, spend all this money, trying to get a reliable system working."

**Root Cause:** Git requires external tooling (hooks, CI, branch protection rules, review apps) to enforce any workflow constraint. The platform ships unsafe-by-default and pushes the safety burden onto the user.

**giti DON'T:** giti must never ship unsafe-by-default. The safe path must be the default path.

**giti MUST:** Every safety feature must be on by default:
- Protected main context: on by default for team repos
- Compiler gate on landing: always on, no bypass in surface API
- Auto-save working copy: always on (jj model)
- Stale branch lifecycle: always on
- Operation logging: always on, cannot be disabled

The developer should never need to build safety infrastructure. giti should be safe out of the box.

**Spec Coverage:** **Yes.** The spec's design philosophy (Section 1.3) explicitly builds safety into the platform. The compiler gate is mandatory (Section 5.1). The operation log is always on (Section 2.4). The constraint is already core to the spec.

---

### I8: Session Branch Abandoned as Pointless (S79)

**Pain:** The team tried using session branches for isolation, but agents committed to main anyway. The user said "dont do session branch. agents just push to main any way." The overhead was pure waste.

**Root Cause:** Git branches are a convention, not a constraint. Nothing prevents writing to any branch. Branch-per-task workflows fail when any participant can bypass them.

**giti DON'T:** giti must never require workflow conventions that depend on all participants following them voluntarily.

**giti MUST:** If branch isolation is desired, enforce it structurally (see P2: protected contexts). If branch isolation is NOT desired (solo dev, small changes), don't force it. The key is that the platform's safety guarantees (compiler gate, undo, operation log) must hold regardless of branching strategy. A developer who works entirely on main with `giti save` + `giti land` must be just as safe as one who uses feature branches.

**Spec Coverage:** **Yes.** The spec supports both workflows. Solo devs can `giti save` + `giti land` directly. Team mode requires review. The safety invariants (compiler gate, undo) are branch-agnostic.

---

## Gap Analysis

### Constraints NOT covered by giti-spec-v1.md (New Spec Requirements)

| ID | Constraint | Priority | Recommended Section |
|---|---|---|---|
| GAP-1 | Content-loss detection on save (P1) | High | New subsection under Section 2.1 |
| GAP-2 | Protected context enforcement at client level, blocking direct saves to main (P2) | High | New subsection under Section 2.1 or new Section 2.6 |
| GAP-3 | Explicit concurrency contract for multi-process access (P3, I1) | High | New subsection under Section 3 |
| GAP-4 | Workspace support for concurrent writers (I1) | Medium | New Section or subsection under Section 3 |
| GAP-5 | Crash-recovery guarantee for unsaved working directory edits (P4) | Medium | Explicit statement in Section 2.1 |
| GAP-6 | `giti check` command for pre-save validation (P6) | Medium | New entry in Section 9 CLI Reference |
| GAP-7 | Branch description and branch-to-issue linkage (P7) | Medium | Update `< Branch>` in Section 6.1 |
| GAP-8 | Temporal filtering on history/ops (`--since`) (I2) | Low | Update Section 2.5 and 9.1 |
| GAP-9 | Promote divergence indicator from v1.1 to v1 (I3) | Medium | Move from Section 4.2 to Section 2.1/9.2 |
| GAP-10 | Granular undo (file-level, hunk-level) (I4) | Medium | Update Section 2.4 |
| GAP-11 | Landing queue management with overlap detection (I5) | Low (v1.1) | New subsection under Section 5 |

### Constraints already covered by giti-spec-v1.md

| Constraint | Spec Section |
|---|---|
| Auto-cleanup of stale branches (P5) | Section 6.1 `< Branch>` state machine |
| Compiler gate on landing (P6, P8) | Section 5.1 Landing |
| Append-only history / no force push (P8) | Section 2.3, Appendix B |
| Debug escape hatch is loud and logged (P8) | Section 3.3 |
| Safe-by-default design philosophy (I7) | Sections 1.2, 1.3 |
| Branch-agnostic safety (I8) | Sections 2.1, 5.1 |

---

## Summary: The giti DON'Ts List

1. giti must never silently accept a save that removes a large portion of a file's content without warning.
2. giti must never allow direct saves to a protected context (e.g., main) without going through the landing gate.
3. giti must never use a shared-lock model where concurrent operations on different contexts can block or corrupt each other.
4. giti must never have a state where a crash destroys work that the developer has been editing.
5. giti must never accumulate stale contexts that the developer must manually track and clean.
6. giti must never allow a landing that introduces compiler errors or test failures.
7. giti must never require an external tracking system to know the status of in-flight work.
8. giti must never rely on conventions, prompts, or opt-in hooks for safety-critical invariants.
9. giti must never have a mode where two concurrent writers can corrupt each other's working state.
10. giti must never allow the project state to be ambiguous or require external documents to determine what has landed.
11. giti must never let a context silently diverge from its base to the point where work is unmergeable.
12. giti must never make partial revert of a save require expert-level VCS knowledge.
13. giti must never encourage unbounded parallel operations without feedback on cost or redundancy.
14. giti must never create persistent artifacts without a defined lifecycle.
15. giti must never ship unsafe-by-default or push the safety burden onto the user.
16. giti must never require workflow conventions that depend on all participants following them voluntarily.
