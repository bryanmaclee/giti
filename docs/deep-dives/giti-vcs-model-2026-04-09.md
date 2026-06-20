---
tags: [deep-dive, giti, vcs]
status: historical
last-reviewed: 2026-05-26
date: 2026-04-09
---

# Deep Dive: giti VCS Model -- git vs jj vs custom

**Date:** 2026-04-09
**Scope confirmed:** yes
**Feeds into:** debate on VCS model for giti | giti v1 architecture | parent deep-dive (giti-radical-doubt-2026-04-09.md)

---

## Scope

**Question:** Should giti use git underneath, use jj's model, or build a custom VCS -- evaluated against the creator's actual pain points (can barely use git) and the Casey/Handmade philosophy (5-function simplicity)?

**In scope:**
- jj explained concretely for someone who has never used it
- jj's command set, conflict model, undo model, limitations
- jj as embeddable library (jj-lib Rust crate)
- Custom VCS feasibility: minimum operations, code size, risk
- Bryan's actual git usage patterns extracted from this project's history
- Hybrid options: simple UI over jj, custom model with git import/export
- Trade-off evaluation against Bryan's workflow

**Out of scope:**
- Forge platform features (PRs, issues, CI) -- covered by parent deep-dive
- 6NZ editor integration specifics
- Implementation timeline or staffing
- Federation / p2p concerns

---

## Context

### Bryan's Actual Git Usage (from project history)

**Repository statistics (scrml8):**
- 1,136 total commits across all branches (857 on main)
- 75 local branches, 94 remote branches
- 94 merge commits (all fast-forward or simple merges)
- 23 rebases in reflog (only 2 rebase sessions total, both on feature branches)
- 44 stashes (never cleaned up)
- 705 branch switches in reflog
- 146 resets in reflog
- 3 pulls total
- 183 WIP commits
- 1 revert
- 0 cherry-picks
- Single contributor (bryan maclee / Bryan Maclee -- same person, two git identities)

**What this tells us:**
1. Bryan works alone. There are zero collaborators. Every commit is his (or his agents').
2. The dominant workflow is: create branch, commit WIP, merge to main. Simple linear work.
3. Rebases are rare (2 sessions out of 857 commits) -- Bryan avoids rebase.
4. 44 stashes never cleaned up -- stash is used as "put this aside" and forgotten.
5. 146 resets -- frequent "undo" attempts via reset, which is the wrong tool.
6. 3 pulls total -- almost no remote sync (single developer, single machine).
7. 705 branch switches -- constant context-switching between feature branches.
8. 183 WIP commits -- 21% of all commits are explicitly marked work-in-progress.

**The glassbox/sandbox workflow (memory: feedback_sandbox_workflow.md):**
The project ALREADY works around git. Background agents do not use git directly. Instead:
- PA creates `glassbox/<agent-id>/` with file copies
- Agents edit only glassbox files (no git access)
- PA diffs, applies to `dev/sN` branch, tests, merges
- Why: "Worktrees caused git confusion, permission failures, 52+ stale branches"

This is the strongest signal: Bryan's project has already built a VCS abstraction layer OVER git because git itself is too unreliable for automated workflows.

### Prior decisions (parent deep-dive)
- Casey/Handmade approach won debate (50.5 > Fossil 46.5 > scrml-state-types 41.5)
- Core principle: "what is the actual problem?"
- giti data model should use scrml state types (approved direction)
- 8 design constraints derived from "barely use git" confession (no staging area, no detached HEAD, no force push, no rebase, one merge strategy, conflicts as data, undo everything, no silent data destruction)

---

## jj Explained for Someone Who Has Never Used It

### The Core Idea

In git, you have three places where your code lives: the working directory (your files), the staging area (what you've `git add`-ed), and the repository (committed history). You must manually move changes between all three.

In jj, there are only two: your working copy and the repository. **Your working copy IS a commit.** Every time you save a file, jj automatically updates the current commit to include your changes. There is no `git add`. There is no staging area. You just work.

### What a Day Looks Like in jj vs git

**Starting work on a feature:**

| Step | git | jj |
|------|-----|-----|
| Create a branch | `git checkout -b my-feature` | `jj new -m "my feature"` (no branch name needed) |
| Edit files | edit files | edit files |
| See what changed | `git status` + `git diff` | `jj status` or `jj diff` |
| Save your work | `git add .` + `git commit -m "msg"` | `jj describe -m "msg"` (already saved) |
| Start next task | `git checkout -b next-thing` | `jj new -m "next thing"` |
| Push to remote | `git push -u origin my-feature` | `jj bookmark set my-feature` + `jj git push` |

**Key differences that matter for Bryan's workflow:**

1. **No staging area.** You never type `git add`. Your working copy is always a commit. `jj describe` just sets the message.

2. **No detached HEAD.** Every change you make is part of a change (jj's word for commit). You cannot lose work by being in a weird state.

3. **Undo anything.** `jj undo` reverses the last operation. `jj op log` shows every operation ever performed. `jj op restore <id>` jumps to any previous state. You can undo an undo. Every single operation is recorded and reversible.

4. **Conflicts are data, not emergencies.** When jj encounters a conflict, it stores it as a data structure inside the commit (an alternating list of positive/negative tree objects). You can keep working. You can commit. You can come back and resolve it later. Git stops the world and dumps `<<<<<<<` markers into your files.

5. **Anonymous branches.** Most jj work uses anonymous changes (no branch name). Branches (called "bookmarks" in jj) are only created when you need to push to a remote. This eliminates Bryan's 75 local branches problem.

6. **Automatic rebase of descendants.** If you edit an older commit, all descendant commits are automatically rebased on top. In git, this requires manual `git rebase --interactive` which Bryan uses only twice in 857 commits.

### jj's Conflict Model (Technical)

jj represents conflicts as a `Merge<T>` type: an alternating list of positive (added) and negative (removed) terms. A 3-way merge A+C-B stores all three trees. If the conflict itself is rebased, the algebra simplifies: D+((C+(B-A))-C) simplifies to D+(B-A), which is a regular 3-way merge.

This means:
- Conflicts propagate through rebases without growing more complex
- Conflicts can be committed (they are data, not broken state)
- Conflict resolution in one commit automatically propagates to all descendants

Source: jj-vcs/jj technical docs (conflicts.md), Chris Krycho's "Deferred Conflict Resolution in Jujutsu"

### jj's Limitations (as of v0.35, November 2025)

1. **Pre-1.0.** CLI may change between versions. No guaranteed stability.
2. **No tags yet.** Tagging not implemented.
3. **No submodule support.** (Bryan doesn't use submodules, so irrelevant.)
4. **Vocabulary mismatch.** "change" not "commit", "bookmark" not "branch", "describe" not "commit message". Talking to git-users requires translation.
5. **Colocation friction.** Using jj and git in the same repo can create confusing states.
6. **Large repo performance.** Importing/exporting to git backend adds overhead for very large repos (not relevant for scrml8 at 1,136 commits).

Sources: jj-vcs/jj GitHub, Tony Finn blog, Swift with Majid blog, jj FAQ

### jj as a Library

jj is split into two Rust crates:
- `jj-lib` (the library): meant to be used by GUIs, TUIs, or servers. Interfaces defined as plain Rust data types.
- `jj-cli` (the CLI): consumes jj-lib.

The architecture explicitly supports embedding. The `agentic-jujutsu` crate already wraps jj-lib for AI agent use, claiming 10-100x faster concurrent operations vs git.

Source: crates.io/crates/jj-lib, jj-vcs architecture docs, crates.io/crates/agentic-jujutsu

---

## Approaches

### Approach A: Keep Git (Status Quo + Better UI)

**How it works:** giti uses git as its VCS. The platform wraps git with a simplified UI that hides dangerous operations. Similar to how GitHub Desktop, GitKraken, or Magit abstract git.

**What Bryan's workflow looks like:**
```
# Same as today, but giti provides a simplified interface
giti save "added button component"    # → git add . && git commit -m "..."
giti undo                             # → git reset --soft HEAD~1
giti sync                             # → git pull --rebase && git push
giti history                          # → git log --oneline --graph
giti switch feature-x                 # → git checkout feature-x
```

**Gains:**
- Zero migration cost. 857 commits of history preserved as-is.
- Every git tool works: GitHub, GitLens, lazygit, etc.
- Every developer on earth knows git (or thinks they do).
- All CI/CD systems support git natively.

**Loses:**
- Git's broken mental model still exists underneath. The abstraction leaks.
- 146 resets, 44 orphan stashes, 52+ stale branches -- these problems are git-intrinsic.
- The glassbox/sandbox workflow remains necessary for agents.
- Detached HEAD, force push, and data loss are still possible via escape hatches.
- Bryan's core complaint ("I can barely use git") is papered over, not solved.

**Complexity:** Low (thin wrapper). But ongoing complexity from git leaking through.
**Prior art:**
- GitHub Desktop: simplified git UI -- result: power users outgrow it, beginners still confused by merge conflicts.
- Magit (Emacs): best-in-class git UI -- result: beloved by Emacs users, but still requires understanding git's model.
- GitKraken: visual git client -- result: commercial success, but all git problems remain underneath.

---

### Approach B: Use jj Underneath (jj as Backend)

**How it works:** giti uses jj-lib as its VCS backend. The working copy is always a commit. No staging area. Conflicts are data. Full undo. git remotes still work for interop.

**What Bryan's workflow looks like:**
```
# giti commands map to jj operations
giti save "added button component"    # → jj describe -m "..." && jj new
giti undo                             # → jj undo (reverses ANY operation)
giti sync                             # → jj git fetch && jj rebase -d main@origin
giti history                          # → jj log
giti switch @abc123                   # → jj edit abc123

# Conflicts don't stop work:
giti merge feature-x                  # conflict created → stored as data
giti status                           # shows "conflicted" but you can keep working
giti resolve                          # opens resolution UI when ready
```

**What the scrml agent workflow looks like:**
```
# The glassbox/sandbox workaround becomes unnecessary.
# jj's working-copy-is-a-commit model means agents can:
#   1. Create a new change (jj new)
#   2. Edit files directly
#   3. Changes are automatically tracked
#   4. If agent crashes, the change exists in the repo
#   5. PA can jj undo or jj abandon if the change is bad
# No file copying. No glassbox dirs. No permission issues.
```

**Gains:**
- Eliminates staging area (Bryan's workflow never uses selective staging anyway -- 0 instances of partial adds in history).
- Eliminates detached HEAD (every change is tracked, always).
- Eliminates stash problem (44 orphan stashes become impossible -- working copy IS a commit).
- Eliminates the need for glassbox/sandbox workflow (agents work directly, jj tracks everything, undo is trivial).
- Conflicts as data: can defer resolution, resolution propagates automatically.
- Full undo: every operation reversible via `jj op log` + `jj undo`.
- Git interop: existing GitHub remote still works. Existing history imports cleanly.
- jj-lib is designed for embedding: giti can use it as a Rust library, not shell out to CLI.

**Loses:**
- Pre-1.0 dependency. CLI changes, potential breaking changes in library API.
- New vocabulary for anyone who already knows git (but Bryan's stated position: "tipping away from git").
- No native forge ecosystem -- giti would be the first jj-native forge.
- Tag support not yet implemented in jj.

**Complexity:** Medium. jj-lib is a well-structured Rust crate. Integration requires Rust (or FFI). The mental model is simpler than git.

**Prior art:**
- Google uses jj internally for some teams -- result: proven at scale for daily development.
- Sapling (Meta) uses similar concepts (working copy = commit) -- result: proven at Meta's monorepo scale.
- No jj-native forge exists yet -- giti would be first mover.

---

### Approach C: Custom VCS (Casey Philosophy, Maximum Control)

**How it works:** Build a VCS from scratch following the Casey Muratori principle: "what is the actual problem?" The actual problem for Bryan is: save snapshots of files, see what changed, undo mistakes, sync with a remote. Everything else is complexity that serves workflows Bryan does not have.

**Minimum operations analysis (Bryan's actual needs):**

From the project history, Bryan's actual VCS operations are:
1. **Save** (commit): 767 commits in reflog. This is the dominant operation.
2. **Switch context** (checkout/branch): 705 branch switches. Moving between feature work.
3. **Merge** (integrate): 206 merges (all simple fast-forwards or basic merges).
4. **Undo** (reset): 146 resets. Frequent need to reverse mistakes.
5. **View history** (log): implicit in all workflows.

Operations Bryan almost never uses: rebase (23 in 857 commits), cherry-pick (0), stash (44 created, never cleaned), pull (3 total), tags (0).

**The 5-function custom VCS:**
```
save(message)     -- snapshot all files, attach message, append to history
switch(target)    -- move working copy to a different point in history
merge(a, b)       -- combine two snapshots (one strategy, no choice)
undo()            -- reverse last operation (operation log, like jj)
sync(remote)      -- push/pull snapshots to/from a remote
```

**What Bryan's workflow looks like:**
```
giti save "added button component"    # snapshot current state
giti undo                             # reverse last save
giti history                          # list snapshots
giti switch @3                        # go to 3 snapshots ago
giti merge feature-x                  # combine feature-x into current
giti sync                             # push to remote
```

**Storage model (Fossil-inspired):**
A single SQLite database file per repository. Each snapshot is a compressed blob. Diffs computed on read, not stored. The entire repository is one file that can be backed up by copying it.

**Implementation estimate:**
- "Write yourself a Git" (WYAG): 983 lines of Python for basic git-compatible VCS (init, add, commit, log, status, diff, merge).
- cmirror (Casey Muratori): ~1,000 lines C++ for file sync.
- A custom VCS with the 5 operations above, SQLite storage, and basic conflict detection: estimated 2,000-5,000 lines. This is buildable.

**Gains:**
- Total control. Every concept maps to Bryan's vocabulary, not git's.
- No leaky abstractions. There is no git underneath to confuse anyone.
- Conceptual simplicity: 5 operations, one mental model, no staging area, no detached HEAD, no rebase.
- Single-file SQLite storage (Fossil model) -- backup = copy one file.
- Can be purpose-built for scrml: typed diffs, compiler integration from day one.
- No external dependency -- no jj version changes, no git updates.

**Loses:**
- No git interop without an explicit import/export layer. Cannot push to GitHub.
- Must implement conflict resolution from scratch (the hardest part of any VCS).
- Must implement network protocol from scratch for sync.
- Must implement delta compression for efficiency (or accept larger storage).
- No ecosystem: no lazygit, no GitLens, no IDE integrations, no CI system support.
- 1-person project building a VCS while also building a compiler, editor, and platform.
- Every other VCS (git, jj, Fossil, Sapling) has thousands of engineering-hours of edge case handling.
- **Risk:** Pijul proves that a technically superior VCS can fail on adoption. Building a custom VCS means nobody can use giti with their existing tools.

**Complexity:** High to build, low to use (if built well). But building it well is the hard part.

**Prior art:**
- Fossil: single binary, SQLite storage, integrated forge -- result: works, 20+ years proven, but tiny community.
- cmirror: ~1,000 lines, one purpose -- result: works for file sync, not a VCS.
- Pijul: custom VCS with novel merge theory -- result: technically superior, near-zero adoption.
- Darcs: custom VCS with patch theory -- result: Haskell community used it, most migrated to git.
- Monotone: custom VCS, inspired git's content-addressed storage -- result: git took the good ideas and won.

---

### Approach D: Hybrid (jj Model, Custom Surface, Git Export)

**How it works:** giti implements its own simplified command set (like Approach C) but uses jj-lib as the storage/merge engine underneath. For interop, it exports to git format, allowing push to GitHub/GitLab. The user sees giti's 5-function model. The implementation gets jj's proven conflict resolution, undo system, and git compatibility for free.

**What Bryan's workflow looks like:**
```
# Identical to Approach C from the user's perspective:
giti save "added button component"
giti undo
giti history
giti switch @3
giti merge feature-x
giti sync                             # pushes via jj git backend to GitHub

# But underneath, jj-lib handles:
#   - Snapshot storage (git-compatible objects)
#   - Conflict resolution (Merge<T> algebra)
#   - Operation log (full undo history)
#   - Git remote sync (push/pull to GitHub)
```

**Gains:**
- Bryan's 5-function simplicity (Approach C's UX).
- jj's proven conflict resolution and undo (Approach B's reliability).
- Git interop (Approach A's compatibility).
- No need to implement merge algorithms, delta compression, or network protocols from scratch.
- Can evolve: start with jj backend, replace with custom backend later if needed.
- Agent workflow: same benefits as Approach B (no glassbox needed).

**Loses:**
- Dependency on jj-lib (pre-1.0 Rust crate).
- Two layers of abstraction (giti surface -> jj-lib -> git objects).
- Must maintain compatibility with jj-lib API changes.
- More complex to debug than a pure custom solution.

**Complexity:** Medium. Less than Approach C (no need to build VCS internals), more than Approach B (custom surface layer on top of jj-lib).

**Prior art:**
- Sapling: custom surface over a custom backend that also supports git -- result: proven at Meta scale.
- jj itself: custom surface over git backend -- result: growing adoption, well-received.
- GitHub Desktop: custom surface over git CLI -- result: works but git leaks through because it shells out rather than using a library.

---

## Trade-off Matrix

| Dimension | A: Keep Git | B: jj Backend | C: Custom VCS | D: Hybrid (jj + custom surface) |
|---|---|---|---|---|
| Bryan's pain points solved | 2/8 (UI-only fixes) | 7/8 (all except "one merge strategy" needs config) | 8/8 (total control) | 8/8 (jj handles 7, surface handles 1) |
| Developer ergonomics | Familiar but broken | Better model, new vocabulary | Simplest model if built well | Simplest model, proven engine |
| Git interop | Native | Full (jj uses git backend) | None without import/export | Full (via jj git backend) |
| Compiler complexity | None | None (separate tool) | None (separate tool) | None (separate tool) |
| Implementation effort | Low (wrapper) | Medium (integrate jj-lib) | Very High (build VCS from scratch) | Medium (integrate jj-lib + custom CLI) |
| Risk | Low (known quantity) | Medium (pre-1.0 dependency) | Very High (building a VCS is hard) | Medium (pre-1.0 dependency) |
| Agent workflow improvement | None (glassbox still needed) | High (no glassbox needed) | High (if undo works) | High (no glassbox needed) |
| Ecosystem support | Everything | Limited (git tools work via backend) | Nothing | Limited (git tools work via backend) |
| Time to ship | Fastest | Medium | Slowest by far | Medium |
| Casey philosophy alignment | Low (wrapping complexity) | Medium (simpler model, but not minimal) | High (total simplicity) | High (simple surface, proven engine) |
| Prior art confidence | Very High | High (Google, growing adoption) | Low (Pijul/Darcs cautionary tales) | Medium-High (Sapling-like architecture) |

---

## Prior Art Table

| System | Problem Solved | Their Approach | Result |
|---|---|---|---|
| **jj (Jujutsu)** | Git's broken mental model | Working copy = commit, conflicts as data, full undo, git backend | Growing adoption, pre-1.0, Google-backed. Solves 7/8 of Bryan's constraints. |
| **Fossil** | Scattered VCS tools | Single binary, SQLite, all-in-one (VCS + wiki + tickets) | 20+ years proven for SQLite project. Small community. |
| **Sapling** | Monorepo complexity | Custom surface, custom backend, git-compatible, stacked diffs | Proven at Meta scale. Open source 2022. |
| **Pijul** | Merge complexity | Category theory, custom VCS, novel patch algebra | Near-zero adoption despite technical superiority. Cautionary tale for Approach C. |
| **Darcs** | Merge complexity | Patch theory, custom VCS (Haskell) | Haskell community used it, most migrated to git. Another cautionary tale. |
| **Monotone** | Distributed VCS | Content-addressed storage, custom protocol | Git took its good ideas and won. Project dead. |
| **GitHub Desktop** | Git complexity | GUI wrapper over git CLI | Beginners still confused by conflicts. Git leaks through. |
| **Gitless** | Git's conceptual misfits | Eliminated staging area, simplified model | Academic user studies showed improvement. No adoption. |
| **WYAG (Write yourself a Git)** | Understanding git internals | 983 lines of Python, basic git operations | Proves a minimal VCS is ~1000 lines. Not production-ready. |
| **cmirror** | File sync overkill | ~1000 lines C++, single purpose | Works for sync. Not a VCS. Proves radical simplicity. |

---

## Dev Agent Signal

No dev agents were polled for this sub-deep-dive. The scope is a VCS architecture decision that depends on Bryan's workflow data and prior art evaluation, not on developer framework preferences. The 14 dev agents can be polled on the collaboration primitive question (PRs vs stacked diffs) in a subsequent sub-deep-dive, where their framework backgrounds are relevant.

---

## Open Questions

1. **jj-lib API stability timeline:** When will jj-lib reach 1.0? The latest release is v0.35 (November 2025). If giti depends on jj-lib, API changes could force giti updates. What is the jj team's stability commitment for the library crate?

2. **jj-lib without Rust:** giti is being built in scrml (which compiles to JS/Bun). Using jj-lib (Rust) requires either: (a) FFI from Bun to Rust, (b) WASM compilation of jj-lib, or (c) jj as a subprocess. Which is viable? The `agentic-jujutsu` crate exists as WASM, suggesting WASM is possible.

3. **Git export fidelity:** If giti uses jj or custom VCS internally, how complete is the git export? Can a giti repo push to GitHub with full fidelity (commit hashes, author info, timestamps, branch names)?

4. **The "one merge strategy" question:** Bryan's constraint #5 is "one merge strategy." jj supports rebase-based and merge-based integration. Which one does giti enforce? This needs its own investigation.

5. **How does the glassbox/sandbox workflow change?** If giti uses jj underneath, agents could create changes directly instead of editing file copies. But the sandbox workflow was also about testing before merge. What replaces the test gate?

---

## Recommendation for Debate

**Approaches worth debating:** B (jj backend) and D (hybrid: jj engine + custom surface). These are the only two that solve Bryan's pain points while maintaining git interop and shipping in reasonable time.

**Approaches that can be eliminated:**
- **A (Keep Git):** Solves only 2 of 8 Bryan constraints. The project has already built a workaround (glassbox) because git is too unreliable. Wrapping git preserves the broken mental model. Eliminated on the grounds that the user has explicitly said "I'm tipping away from git."
- **C (Custom VCS):** Pijul, Darcs, and Monotone all prove that building a custom VCS, even a technically superior one, leads to ecosystem isolation and near-zero adoption. The implementation effort (conflict resolution, delta compression, network protocol, edge case handling) is a multi-year project on its own. Bryan is also building a compiler, editor, and platform simultaneously. The risk-to-reward ratio is unacceptable. Casey's philosophy ("solve the actual problem") actually argues AGAINST building a custom VCS -- the actual problem is "save, undo, merge, sync" and jj already solves it. Casey would build the simplest thing, not reinvent storage engines.

**Suggested debate framing:** "Should giti expose jj's model directly (Approach B: jj commands with giti branding) or should giti build its own 5-function surface that uses jj-lib as an invisible engine (Approach D: Bryan never sees jj, only giti's vocabulary)?"

**Suggested participants:**
- casey-muratori-vcs-expert: argues for maximum simplicity in the surface layer (favors Approach D)
- A jj/Jujutsu expert (to be forged): argues for exposing jj's model directly (favors Approach B), explains which jj concepts are worth keeping vs hiding
- scrml-dev-rust: evaluates jj-lib integration feasibility (Rust crate in a JS/Bun ecosystem)
- scrml-dev-cs-phd: evaluates the Merge<T> conflict algebra and whether giti's surface should expose or hide it
