# giti v1 Platform Specification

**Date:** 2026-04-09
**Status:** Draft — Ratified from Radical Doubt Process
**Authority:** scrml Language Spec Author
**Sources:** giti-radical-doubt-2026-04-09.md, giti-vcs-model-2026-04-09.md,
             giti-collaboration-primitive-2026-04-09.md,
             giti-conflict-resolution-2026-04-09.md, design-insights.md

---

## 1. Overview

### 1.1 What giti Is

giti is a version control platform built for scrml. It replaces git and GitHub as the primary
collaboration infrastructure for scrml projects. It is one of three cornerstone products in the
scrml ecosystem — compiler, 6NZ editor, giti — all built in scrml.

giti is not a git wrapper. It is a new surface designed from the observation that the median
developer cannot reliably use git, and that git's mental model is the cause, not the developer.

### 1.2 The Design Mandate

The platform creator's verbatim statement: "I can barely use git and have issues all the time
just doing basic things on github."

This is not a confession of weakness. Data confirms this is the median experience:
- 52.2% of all developers struggle with git at least once a month
- 75.4% of developers who believe they are confident with git still struggle monthly
- 87% of developers have encountered merge conflicts
- 65% of developers have lost commits or changes
- 55% of developers find rebase error-prone
- 45% of developers have been negatively affected by a colleague's force push

giti MUST be designed for this user. Any feature that requires understanding git's internal model
is a defect in giti's design, not a user education gap.

### 1.3 Design Philosophy

**The glassbox-as-requirements-document principle:** When a developer builds a workaround over
their VCS — copying files into directories, diffing manually, committing through a proxy — the
workaround is evidence that the VCS's mental model is wrong for their workflow. giti's API surface
was derived from the actual usage data of the project that created it:

- 767 save operations (commits)
- 705 context switches (branch switches)
- 206 integrations (merges)
- 146 undos (resets)
- 44 stash operations (all orphaned — the stash model is broken)

The 5-function surface (save, switch, merge, undo, history) maps to these 5 operation categories.
Everything else is a derived workflow or an internal engine detail.

**The engine is invisible principle:** jj-lib handles storage, conflict algebra, and operation
logging. The developer SHALL NOT be required to know what jj is. The debug door (`giti ops`,
`giti debug`) exists for tooling authors and emergency recovery. It is not a normal workflow path.

**The compiler is the reviewer principle:** scrml's type system already knows what is broken.
Conflicts that a text-merge tool cannot resolve, the type checker can flag. The platform SHALL
expose this capability progressively (see Section 5).

**The waiting bottleneck principle:** 86% of PR lead time is waiting for human review. giti's
collaboration primitive is designed to eliminate this bottleneck for solo developers and reduce
it substantially for teams by using the compiler as the primary gate.

### 1.4 What giti Replaces

| Replaced | giti equivalent |
|---|---|
| `git add` + `git commit` | `giti save` |
| `git checkout` / `git switch` | `giti switch` |
| `git merge` / `git rebase` | `giti merge` |
| `git reset` / `git revert` | `giti undo` |
| `git log` | `giti history` |
| GitHub Pull Request | Landing + Stack + Change (see Section 6) |
| GitHub branch protection rules | Compiler gate (compiler + tests must pass) |
| `.git/stash` | Eliminated (every working state is a commit; stash is not needed) |
| Staging area (`git add`) | Eliminated (working copy IS a commit) |
| Detached HEAD | Eliminated (no named branch required; every change is tracked) |

---

## 2. Surface API

giti's user-facing API consists of exactly 5 operations. This is the complete vocabulary for
daily development. All VCS engine internals are hidden.

### 2.1 `giti save`

**Purpose:** Snapshot the current working state with an optional message. Creates a new point in
history that can be referenced and returned to.

**Signature:**
```
giti save [message]
giti save "message"
```

**Semantics:**

1. giti SHALL snapshot all changes in the current working directory.
2. There is no staging area. All changes are included. The developer SHALL NOT be required to
   select which files to include.
3. If `message` is omitted, giti SHALL prompt for one or accept an empty message and mark the
   save as a work-in-progress snapshot.
4. If the current working state has no changes since the last save, giti SHALL report this and
   take no action.
5. The save is immediately durable. There is no "uncommitted" state that can be lost by crash,
   power failure, or process kill.
6. Every save is addressable by its hash and by relative shorthand (`@`, `@-1`, `@-2`).
7. **Crash recovery (GAP-5):** Because jj's working-copy-is-a-commit model continuously tracks
   the working directory, unsaved edits are recoverable after a crash. If a process dies between
   saves, `giti undo` or `giti history --ops` SHALL show the last known working state. giti
   SHALL NOT have a mode where a crash destroys work that the developer has been editing.

**Worked Example — valid:**
```
$ giti save "add login form"
Saved: a3f7b2 "add login form"
  3 files changed
```

**Worked Example — no changes:**
```
$ giti save "nothing changed"
Nothing to save. Your work is already captured.
```

**Worked Example — empty message:**
```
$ giti save
Saved: a3f7b2 (work in progress)
  3 files changed
Tip: Give this save a description when you're ready: giti describe a3f7b2
```

**Content-Loss Detection (GAP-1):**

When a `giti save` would snapshot a file whose content has shrunk by more than 30% of lines
compared to its state at the previous save, giti SHALL warn:

```
Warning: SPEC.md has shrunk by 1,074 lines (33% of the file).
This might be intentional (refactor), or accidental (truncation).
  Save anyway?  [y/N]
```

The threshold (30%) SHALL be configurable via `giti config content-loss-threshold <percent>`.
Setting it to `0` disables the warning. The default is 30%.

This does not apply to deleted files (which are always intentional) — only to files that still
exist but have lost substantial content.

**Protected Context Enforcement (GAP-2):**

When the current context is protected (the repository's `default_branch`, or any context where
`review_required: true` applies), `giti save` SHALL fail with:

```
Cannot save directly to "main" — it is protected.
Create a new context first: giti switch --new my-feature
Or land your work through the gate: giti land
```

This is enforced at the client level, not the server. There is no `--force` flag to bypass this.
Solo mode (`review_required: false`) SHALL NOT protect the default branch from direct saves
unless the developer explicitly opts in via `giti config protect-default true`.

**Error Conditions:**

| Condition | Error Message |
|---|---|
| Disk full | "Could not save your work. Your disk is out of space. Free up space and try again." |
| Repo not initialized | "This directory is not a giti project. Run `giti init` to set one up." |
| Protected context | "Cannot save directly to 'main' — it is protected. Create a new context: `giti switch --new my-feature`" |

### 2.2 `giti switch`

**Purpose:** Move the working copy to a different point in history. Equivalent to changing which
version of the project you are currently editing.

**Signature:**
```
giti switch <target>
giti switch <name>          # switch to named context
giti switch @               # switch to most recent save
giti switch @-1             # switch to one save before current
giti switch @-N             # switch N saves before current
giti switch <hash>          # switch to a specific save by hash
```

**Semantics:**

1. giti SHALL move the working copy to the target point in history.
2. If the current working copy has unsaved changes, giti SHALL save them automatically before
   switching and notify the developer.
3. There is no detached HEAD equivalent. Every state the developer can reach via `giti switch`
   is a tracked, named position. Work created from any position is automatically tracked.
4. Named contexts (bookmarks in the underlying engine) are created explicitly via `giti save
   --name <name>` or `giti name <name>`. Context names are optional — giti works without them.
5. If the target does not exist, giti SHALL report an error with the nearest matches from history.

**Worked Example — valid, named target:**
```
$ giti switch main
Switched to "main" (f91c04 "implement auth")
```

**Worked Example — valid, relative shorthand:**
```
$ giti switch @-3
Switched to 3 saves ago (b2a1f9 "initial state type")
```

**Worked Example — unsaved changes, auto-saved:**
```
$ giti switch @-1
You have unsaved changes. Saving them first.
Saved: c3d2e1 (work in progress)
Switched to @-1 (b2a1f9 "initial state type")
To return to your work: giti switch c3d2e1
```

**Error Conditions:**

| Condition | Error Message |
|---|---|
| Target not found | "No save called 'xyz' was found. Did you mean one of these? [list of close matches by hash prefix or name]" |
| Repository conflict blocks switch | "Your current work has a conflict that must be resolved before you can switch. Run `giti status` to see it." |

### 2.3 `giti merge`

**Purpose:** Combine the changes from another context (branch, named save, hash) into the current
working copy.

**Signature:**
```
giti merge <target>
giti merge main
giti merge <name>
giti merge <hash>
```

**Semantics:**

1. giti SHALL merge the changes from `target` into the current working copy using exactly one
   merge strategy. The developer SHALL NOT be presented with a choice of merge strategies.
2. The merge strategy is `no-op fast-forward when possible, otherwise jj conflict storage`.
   giti SHALL NOT rebase. History is always append-only.
3. If the merge is clean (no conflicts), giti SHALL complete it immediately and report a summary.
4. If the merge produces conflicts, giti SHALL store them as structured data (Merge<T> algebra,
   see Section 4.1). The working copy will be in a "conflicted" state, which is a valid state
   that can be saved, examined, and resolved at any time.
5. giti SHALL NOT dump conflict markers into source files during the merge itself. Conflict
   markers are only shown when the developer explicitly views a conflicted file (`giti status`
   or the conflict resolution UI).
6. giti SHALL report what changed as part of the merge summary.

**Worked Example — clean merge:**
```
$ giti merge main
Merged "main" into your work.
  12 changes from main included
  No conflicts
```

**Worked Example — merge with conflicts:**
```
$ giti merge main
Merged "main" into your work.
  9 changes from main included
  2 conflicts stored — your work is intact

  To resolve now:  giti resolve
  To resolve later: keep working, resolve before landing
  To see details:  giti status
```

**Worked Example — nothing to merge:**
```
$ giti merge main
Your work is already up to date with "main".
```

**Error Conditions:**

| Condition | Error Message |
|---|---|
| Target not found | "No context called 'xyz' found. Check `giti history` for available targets." |
| Circular merge | "Cannot merge a context into itself." |

### 2.4 `giti undo`

**Purpose:** Reverse the most recent operation. Every giti operation is undoable.

**Signature:**
```
giti undo           # reverse most recent operation
giti undo <N>       # reverse the last N operations (applied one at a time with confirmation)
giti undo --file <path>   # reverse changes to a specific file from the last save (GAP-10)
giti undo --hunk <path>   # interactively select which changes to reverse in a file (GAP-10)
```

**Semantics:**

1. `giti undo` SHALL reverse the most recently completed operation. This includes: saves,
   switches, merges, name assignments, and landings.
2. Undo is recorded in the operation log. Undo itself is an operation and can be undone
   (`giti undo` after `giti undo` re-applies what was undone).
3. No operation in giti is irreversible through normal use. The operation log is append-only.
4. giti SHALL report what was undone and what the current state is.
5. `giti undo <N>` with N > 1 SHALL confirm before each step (unless `--yes` flag is passed).
6. Undo SHALL NOT require the developer to know git internals, reflog syntax, or commit hashes
   to recover from mistakes.
7. **Granular undo (GAP-10):** `giti undo --file <path>` SHALL reverse changes to a specific
   file from the most recent save, leaving all other file changes intact. `giti undo --hunk
   <path>` SHALL present an interactive view where the developer selects which hunks (change
   regions) to reverse. Partial revert SHALL NOT require expert-level VCS knowledge.

**Worked Example — undo last save:**
```
$ giti undo
Undid: save a3f7b2 "add login form"
Your work is back as it was before that save.
You still have those changes — they are just no longer saved as "add login form".
```

**Worked Example — undo a merge:**
```
$ giti undo
Undid: merge from "main"
Your work no longer includes the changes from "main".
To redo: giti merge main
```

**Worked Example — undo the undo:**
```
$ giti undo
Undid: undo of save a3f7b2 "add login form"
The save "add login form" is back.
```

**Error Conditions:**

| Condition | Error Message |
|---|---|
| Nothing to undo | "Nothing to undo. This is the beginning of your history." |
| Operation log corrupted | "The operation log has an unexpected state. Run `giti debug ops` to inspect it." |

### 2.5 `giti history`

**Purpose:** Show the record of saves in the current context and the chain they form.

**Signature:**
```
giti history            # show saves in current context
giti history --all      # show all saves across all contexts
giti history --ops      # show operation log (every giti operation, not just saves)
giti history --since 2h # show saves from the last 2 hours (GAP-8)
giti history --since 1d # show saves from the last day
```

**Semantics:**

1. `giti history` SHALL display saves in reverse chronological order (most recent first).
2. Each save SHALL show: its short hash, its message (or "work in progress" if empty), the time
   elapsed since it was created, and a marker if it contains unresolved conflicts.
3. The current position (working copy) SHALL be clearly marked.
4. Output SHALL be scannable without scrolling for the last 20 saves by default.
5. The full hash is available on demand for use with `giti switch`.
6. `--since <duration>` SHALL filter saves to only those created within the specified time
   window (GAP-8). Durations use short forms: `30m`, `2h`, `1d`, `7d`.

**Worked Example:**
```
$ giti history
  a3f7b2  add login form             (2 minutes ago)
  f91c04  implement auth             (1 hour ago)
  b2a1f9  initial state type         (3 hours ago)  [conflict]
  c4e8a1  setup project              (yesterday)
```

**Worked Example — with operation log:**
```
$ giti history --ops
  merge main          (3 minutes ago)
  save a3f7b2         (5 minutes ago)
  switch main         (8 minutes ago)
  save f91c04         (1 hour ago)
```

---

## 3. VCS Engine

### 3.1 Engine Selection

giti uses jj-lib (the jj/Jujutsu Rust library crate) as its VCS engine. This decision was
ratified by the giti VCS model debate (Approach D, 49.5/60 > Approach B, 46.5/60).

The jj-lib engine provides:
- Working-copy-is-a-commit model (no staging area)
- Conflict-as-data storage (Merge<T> algebra, see Section 4.1)
- Operation log with full undo capability
- Git-compatible backend (git remotes, GitHub, push/pull all work)

jj-lib is a Rust crate. Integration with giti (which runs on Bun/JS) SHALL use one of:
- WASM compilation of jj-lib (preferred: the `agentic-jujutsu` crate demonstrates feasibility)
- Bun FFI to Rust
- jj as a managed subprocess (fallback only)

The integration mechanism is an implementation decision, not a spec decision. What is specified
is the behavioral contract of the surface API (Section 2).

### 3.2 What the Engine Provides vs What giti Hides

| Engine capability | giti surface exposure |
|---|---|
| Working copy is a commit | Implicit — `giti save` requires no `git add`. All changes are included. |
| Operation log (jj op log) | `giti history --ops` and `giti undo` |
| Conflict-as-data (Merge<T>) | `giti status` conflict report; `giti resolve` UI |
| Change (jj's unit) | Hidden — giti calls it a "save" |
| Bookmark (jj's branch) | Hidden — giti calls it a "context" or "name" |
| `jj describe` | Hidden — giti calls it `giti describe <hash>` |
| `jj new` | Hidden — automatic after every `giti save` |
| `jj git push` | Hidden — invoked by `giti sync` |
| `jj git fetch` | Hidden — invoked by `giti sync` |
| `jj rebase` | NOT EXPOSED. giti does not expose rebase. |
| `jj split`, `jj absorb` | NOT EXPOSED in v1. Internal tooling may use them. |

### 3.3 The Debug Door (Escape Hatch)

giti SHALL provide an escape hatch for tooling authors, advanced workflows, and emergency
recovery. The escape hatch SHALL NOT be required for any normal developer workflow.

```
giti ops             # view raw jj operation log
giti debug           # open debug console (shows jj commands giti ran)
giti debug run <cmd> # execute a raw jj command (with warning banner)
```

Any `giti debug run` invocation SHALL print a warning:
```
Warning: You are running a raw jj command through giti's debug interface.
This bypasses giti's safety layer. Operations done here may not be undoable via `giti undo`.
Press Ctrl+C to cancel, or Enter to continue.
```

### 3.4 Concurrency Contract (GAP-3, GAP-4)

giti SHALL guarantee that two processes operating on different contexts in the same repository
SHALL NOT block, corrupt, or interfere with each other. This is a hard concurrency contract,
not a best-effort guideline.

**Normative statements:**

1. Concurrent `giti save` operations on different contexts SHALL succeed independently. No file
   locking SHALL block one save because another is in progress.
2. Concurrent `giti save` operations on the SAME context SHALL be serialized by the operation log.
   The second save SHALL see the first save's result and merge changes algebraically. No data
   SHALL be lost.
3. If two agents, scripts, or developers operate on the same repository simultaneously, the jj
   operation log SHALL record both operations and resolve any conflicts automatically.
4. giti SHALL NOT use advisory or mandatory file locks for routine operations (save, switch,
   merge, undo, history). Lock-based coordination is the root cause of git worktree fragility.

**Workspace support:** giti SHALL support multiple concurrent workspaces within a single
repository. Each workspace operates on its own context independently. Workspace creation:

```
giti workspace add <name> <path>    # create a new workspace at <path>
giti workspace list                 # list active workspaces
giti workspace remove <name>        # remove a workspace
```

Workspaces map to jj workspaces. Each workspace has its own working copy commit. Changes in
one workspace are visible to others via the operation log but do not interfere with each other's
working state.

### 3.5 Git Compatibility

giti's jj backend uses git-compatible storage. This means:

1. A giti repository IS a git repository. The underlying objects are git objects.
2. `giti sync` SHALL push/pull to git remotes (GitHub, GitLab, Forgejo, self-hosted git).
3. Existing git repositories can be imported into giti. (See Section 12: Migration.)
4. Other developers using raw git on a giti-managed repository is supported but NOT recommended.
   The giti surface layer provides guarantees (no detached HEAD, no force push, full undo) that
   raw git access can violate.

### 3.6 Semantic Version Dependency

giti's jj-lib dependency is pre-1.0 (v0.35 as of November 2025). This imposes a maintenance
obligation: when jj-lib releases API changes, giti's integration layer SHALL be updated before
shipping a release. giti SHALL pin a specific jj-lib version in its dependency manifest and
document the upgrade procedure.

### 3.7 Engine Independence Milestone

giti uses jj-lib as its engine for the foreseeable future. The decision to revisit — potentially
replacing jj with a native scrml-aware VCS engine — is gated on a specific technical milestone:

**Gate:** The scrml compiler can perform AST-level conflict resolution on `.scrml` source files.

When this gate is met, jj's text-level merge becomes less important because the compiler itself
can resolve conflicts semantically (renamed variables, reordered declarations, moved functions).
At that point, giti's architecture should be re-evaluated:

- Does jj's Merge<T> algebra still add value on top of compiler-resolved AST diffs?
- Is the jj subprocess/WASM overhead justified when the compiler owns the merge logic?
- Would a native storage layer enable features impossible with jj (typed commits, state-type-aware history)?

Until this gate is met, jj is the correct engine. Do not prematurely replace it.

---

## 4. Conflict Resolution

Conflict resolution in giti is layered. Each layer builds on the previous. Layers are versioned
to allow progressive implementation.

### 4.1 v1: jj Conflict-as-Data Storage (Foundation)

**Status:** Required for v1.

In jj's model, a conflict is a first-class object stored in the commit graph. Internally, it is
represented as a `Merge<T>` type: an alternating list of positive (added) and negative (removed)
tree objects.

A 3-way conflict stores: `Merge<T> = [side_a, base, side_b]` where side_a and base are positive
terms and the conflict algebra defines the resolution. When a conflicted commit is rebased,
the algebra simplifies: descendants carry the conflict but do NOT produce nested conflict markers.

**What this means for the developer:**

1. A conflict DOES NOT stop work. The working copy enters a "conflicted" state but remains
   functional. Saves, switches, and other operations still work.
2. `giti status` SHALL show conflicted items clearly:
   ```
   $ giti status
   Conflicted files (1):
     src/components/button.scrml
       Both sides changed the < Button> state type.
       Run `giti resolve src/components/button.scrml` to resolve.
       Or keep working and resolve before landing.
   ```
3. When a conflicted file is opened, giti SHALL materialize the conflict in a structured format
   (not git's `<<<<<<<` markers). The format SHALL show:
   - The base (what it looked like before either side changed it)
   - Side A's changes (shown as a diff from base)
   - Side B's state (shown as the full content)
   This is strictly more informative than git's markers.
4. Resolving a conflict in a file SHALL automatically propagate the resolution to all descendant
   saves. The developer SHALL NOT need to manually re-resolve the same conflict in multiple places.
5. Conflicts SHALL be resolvable at any time — there is no "you must resolve this now before
   doing anything else" gate in v1.

**Worked Example — conflict status:**
```
$ giti status
You have 1 conflict.

  src/components/button.scrml
    Base:   < Button> label: string </ Button>
    Yours:  < Button> label: string, variant: .Primary | .Secondary </ Button>
    Theirs: < Button> label: string, size: .Small | .Medium | .Large </ Button>

  Options:
    [1] Keep both (label + variant + size)
    [2] Keep yours (label + variant)
    [3] Keep theirs (label + size)
    [4] Edit manually

  Run: giti resolve src/components/button.scrml
```

### 4.2 Trunk-Based Workflow Nudges (Prevention) — PROMOTED TO v1 (GAP-9)

**Status:** Required for v1 (promoted from v1.1 per friction audit GAP-9).

Most conflicts arise from long-lived branches diverging from main. giti SHALL provide UX nudges
that guide developers toward shorter-lived branches without mandating any workflow.

Nudge mechanisms:
- **Branch age indicator:** In `giti status` and `giti history`, a save that is more than N days
  old and diverges from main by more than M saves SHALL display a yellow "diverged" indicator.
  Default thresholds: N=3 days, M=10 saves. Configurable via `giti config`.
- **Sync reminder:** When `giti save` is run and the current context has not merged from main
  in more than 24 hours, giti SHALL print a one-line suggestion: "Tip: your work is 24+ hours
  behind main. `giti merge main` to stay in sync."
- **Divergence in status:** `giti status` SHALL always show how far the current context has
  diverged from its base: "Your work is 7 saves ahead of main, 3 saves behind."
- These are suggestions only. They SHALL NOT block any operation.

### 4.3 v2: AST Semantic Merge (Auto-Resolution Layer)

**Status:** Planned for v2. Not required for v1.

Academic data: AST-aware merge tools (Mergiraf, Weave) resolve 56-86% of textual conflicts
that git cannot auto-resolve. The Weave benchmark shows 31/31 clean merges vs git's 15/31 on
the same test set.

giti v2 SHALL integrate AST-aware merge as a merge driver layer. For every file giti merges:
1. If the file is a .scrml file, use the scrml parser to produce an AST for base, side A, and
   side B. Merge at the entity level (state type field granularity, not line granularity).
2. If the file is another parseable format, use tree-sitter (Mergiraf-compatible) for entity
   matching.
3. If the file is unparseable (images, binary, opaque config), fall back to text merge.
4. Auto-resolved merges SHALL be logged and visible in `giti status --merge-log` for review.

**What this eliminates:** Two developers adding different fields to the same state type in the
same file will no longer produce a conflict. The AST merge will combine them.

**What this does NOT eliminate:** Semantic conflicts (one side renames a function, the other adds
a call to the old name). These still require human resolution.

### 4.4 v3: Compiler Type-Diff API (Semantic Merge Validation)

**Status:** Planned for v3. Not required for v1 or v2.

giti v3 adds the scrml compiler as a merge validator for .scrml files. After AST merge (v2)
produces a candidate merged file, the compiler type-checks the result:

1. If the merged result type-checks cleanly, the merge is accepted automatically.
2. If the merged result has type errors introduced by the merge (not pre-existing), those errors
   are flagged as semantic conflicts with full compiler-quality error messages:
   ```
   Semantic conflict in src/components/button.scrml:
     Branch A changed email from string to Email (a refinement type).
     Branch B added sendNotification(user.email) which expects string.
     The merged result would not compile.

     Fix: Update sendNotification to accept Email, or revert one change.
   ```
3. Auto-resolved merges are validated by the compiler before being committed to history.
4. A compiler-approved merge DOES NOT replace human review for design intent. A developer MAY
   flag any merge (even a compiler-clean one) for human review before landing.

**What this catches that AST-only cannot:**
- Field type changes where a downstream caller uses the old type
- Required prop additions where a downstream usage does not pass the new prop
- Enum variant removals where a downstream match arm references the removed variant
- Any other type error that only manifests after combining both sides

### 4.5 v4: Real-Time Keystroke Conflict Detection

**Status:** Planned for v4. Not required for v1-v3. Requires 6NZ integration.

The scrml compiler runs in approximately 42ms. If the platform maintains a cached AST of linked
branches (see Section 7), the editor can run an AST diff against those cached ASTs on every
compile cycle and surface conflicts as ambient UI — like a spell-checker for merge safety.

This changes conflict detection from a crisis event (you tried to merge and it failed) to
continuous ambient awareness (you can see a conflict developing as you type).

Architecture requirements for v4:
1. Compiler compile-cycle time MUST remain under 50ms.
2. AST diff algorithm MUST run under 10ms on a single file.
3. Linked branch ASTs MUST be available locally (cached, not requiring a network call per
   keystroke).
4. The conflict indicator MUST be non-blocking and dismissible.

See Section 7 for the full real-time conflict detection architecture.

---

## 5. Collaboration Model

giti's collaboration model is layered. Each layer is a versioned addition. No layer requires
removing a previous layer.

### 5.1 v1: Landing (Direct Push with Compiler Gate)

**Status:** Required for v1.

The `Landing` is giti's primary collaboration primitive. A developer saves their work and lands
it. The compiler and tests are the gate. If both pass, the work lands. If either fails, the
developer gets a typed error report.

For solo developers: `review` is `.NotRequired`. The compiler is the reviewer.
For teams: `review` transitions to `.Pending`. A human must approve before landing.

The same `Landing` state type handles both modes. The gate condition differs, not the primitive.

**scrml state type definition:**
```scrml
< Landing>
  id: number
  author: string
  message: string
  branch: string
  target: string
  compiler_result: .Pass | .Fail | .Pending
  test_result: .Pass | .Fail | .Pending
  review: .NotRequired | .Pending | .Approved | .ChangesRequested
  status: .Running | .Blocked | .Landed | .Abandoned

  .Running -> .Landed:
    when compiler_result is .Pass
    && test_result is .Pass
    && (review is .NotRequired || review is .Approved)

  .Running -> .Blocked:
    when compiler_result is .Fail || test_result is .Fail

  .Running -> .Blocked:
    when review is .ChangesRequested

  .Blocked -> .Abandoned: when author_cancels
  .Blocked -> .Running: when author_pushes_fix
  .Landed -> .Abandoned: when author_reverts && within_24_hours
</ Landing>
```

**Developer workflow (solo):**
```
giti save "add login form"       # snapshot work
giti land                        # compiler runs, tests run, lands if green
```

**Developer workflow (team):**
```
giti save "add login form"       # snapshot work
giti land                        # opens landing for review
                                 # reviewer runs: giti review 42 approve
                                 # compiler runs, tests run, lands if green
```

**Worked Example — solo landing:**
```
$ giti land
Checking your work...
  Compiler: pass
  Tests: pass (14/14)
Landed as a3f7b2 on main.
```

**Worked Example — landing blocked by compiler:**
```
$ giti land
Checking your work...
  Compiler: FAIL

  src/components/button.scrml, line 12:
    < Button> is missing a required prop: variant
    Expected: variant: .Primary | .Secondary
    Passed:   (nothing)

  Fix the error and try again: giti land
```

**Worked Example — landing blocked by review:**
```
$ giti land
Your work is waiting for review (Landing #47).
  Reviewer: sarah
  Status: Changes requested

  Sarah's note: "The variant prop should default to .Primary, not be required."

To update: make changes, then giti save, and the landing will re-run.
```

### 5.1.1 Landing Queue and Overlap Detection (GAP-11)

When multiple landings are in flight simultaneously (team mode), giti SHALL detect file-level
overlap between queued landings and warn:

```
Landing #48 touches 3 files also modified by Landing #47 (in review):
  src/auth.scrml
  src/components/login.scrml
  compiler/src/codegen/emit-html.ts

If Landing #47 lands first, your code may need to be re-checked.
  Continue anyway?  [y/N]
```

**Normative statements:**

1. giti SHALL maintain a landing queue ordered by submission time.
2. When a new landing is submitted, giti SHALL compare its changed files against all in-flight
   landings and report overlaps.
3. Overlap detection is file-level in v1. AST-level or type-level overlap detection is deferred
   to v2 (Section 4.3).
4. Overlap warnings SHALL NOT block landing submission — they are informational.
5. When an earlier landing in the queue lands and modifies files that a later landing also touches,
   giti SHALL re-run the compiler gate on the later landing automatically.

### 5.2 v1.1: Stack and Change (Team Review Layer)

**Status:** Planned post-v1. Not required for v1 launch.

For teams that want structured review of work-in-progress, giti adds `Stack` and `Change`
primitives. A Stack is a series of small, dependent changes that are reviewed independently and
land together. Each Change is independently reviewable.

This model is derived from Phabricator/Graphite's stacked diffs approach, adapted to scrml's
state type system.

**scrml state type definitions:**
```scrml
< Change>
  id: number
  title: string
  body: string
  author: string
  status: .Draft | .Open | .Approved | .Merged | .Closed
  parent_change: number | null
  stack_id: number | null
  branch: string
  target: string

  .Draft -> .Open: when author_submits
  .Open -> .Approved: when reviewer_approves
  .Open -> .Closed: when author_closes
  .Approved -> .Merged: when (parent_change is null || parent_merged) && checks_pass
  .Closed -> .Open: when author_reopens
  .Merged -> .Closed: never  // a merged change cannot be unmerged; use giti undo
</ Change>

< Stack>
  id: number
  title: string
  author: string
  changes: [number]          // ordered list of Change ids
  status: .InProgress | .ReadyToLand | .Landed | .Abandoned

  .InProgress -> .ReadyToLand: when all changes are .Approved
  .ReadyToLand -> .Landed: when author_lands
  .ReadyToLand -> .InProgress: when any_change_moves_to .Open
  .InProgress -> .Abandoned: when author_abandons
</ Stack>
```

**Developer workflow:**
```
giti save "add user model"       # change 1
giti save "add user API"         # change 2 (stacked on 1)
giti save "add user UI"          # change 3 (stacked on 2)
giti share --stack               # push entire stack for review
giti land                        # land when all approved
```

### 5.3 v2: Typed Change with AST Diff (Review Interface)

**Status:** Planned for v2. Not required for v1-v1.1.

The Typed Change is giti's permanent differentiator. No other forge can implement this because
no other forge owns the compiler.

When a Change is opened for review, the review UI SHALL show the AST diff instead of (or in
addition to) the text diff. The AST diff shows:
- Which state types changed and how (fields added, fields removed, fields modified)
- Which downstream usages are affected by each change
- Which downstream usages will break if the change lands
- Which breaking changes the reviewer must explicitly acknowledge before approving

**Example review UI for a Typed Change:**
```
Change #42: "Add priority to Todo"

TYPE CHANGES:
  < Todo>
    UNCHANGED: title : string
    UNCHANGED: done : boolean
    ADDED:     priority : .Low | .Medium | .High   [REQUIRED]

IMPACT ANALYSIS:
  3 files use < Todo>
    pages/home.scrml (line 14)      WILL BREAK: no priority passed
    pages/list.scrml (line 8)       WILL BREAK: no priority passed
    components/item.scrml (line 22) OK: already passes priority

COMPILER VERDICT: 2 breaking changes. Reviewer must acknowledge before approving.

[ ] I have reviewed the breaking changes and the fix plan is in the change description.
[ Approve ]  [ Request changes ]
```

**scrml state type definition:**
```scrml
< TypedChange>
  id: number
  title: string
  body: string
  author: string
  status: .Draft | .Open | .Approved | .Merged | .Closed

  // Compiler-computed (read-only, derived from AST diff — cannot be set by author)
  added_types: [string]
  removed_types: [string]
  modified_types: [string]
  breaking_changes: [string]
  affected_files: [string]
  breaking_acknowledged: boolean

  .Draft -> .Open: when author_submits
  .Open -> .Approved: when reviewer_approves && (breaking_changes is [] || breaking_acknowledged)
  .Open -> .Closed: when author_closes
  .Approved -> .Merged: when checks_pass
  .Closed -> .Open: when author_reopens
</ TypedChange>
```

---

## 6. Data Model

All forge entities (landings, changes, reviews, issues, branches) are scrml state types.
The platform IS scrml code. This means:
- State transitions are enforced by the compiler at platform build time
- Invalid states (a merged landing being merged again) are compile errors, not runtime bugs
- The forge's data layer is the canonical example of scrml's state type system

### 6.1 Complete State Type Definitions

**Review:**
```scrml
< Review>
  id: number
  change_id: number
  reviewer: string
  status: .Pending | .Approved | .ChangesRequested | .Withdrawn
  body: string
  created_at: string
  updated_at: string

  .Pending -> .Approved: when reviewer_submits_approval
  .Pending -> .ChangesRequested: when reviewer_requests_changes
  .Approved -> .ChangesRequested: when reviewer_revises
  .ChangesRequested -> .Approved: when reviewer_revises
  .Approved -> .Withdrawn: when reviewer_withdraws
  .ChangesRequested -> .Withdrawn: when reviewer_withdraws
</ Review>
```

**Issue:**
```scrml
< Issue>
  id: number
  title: string
  body: string
  author: string
  status: .Open | .InProgress | .Resolved | .Closed | .WontFix
  labels: [string]
  assignees: [string]
  created_at: string
  closed_at: string | null

  .Open -> .InProgress: when assignee_starts
  .Open -> .Closed: when author_closes || admin_closes
  .Open -> .WontFix: when maintainer_marks_wontfix
  .InProgress -> .Resolved: when change_lands_that_references_issue
  .InProgress -> .Open: when assignee_unassigns
  .Resolved -> .Open: when author_reopens_within_30_days
  .Closed -> .Open: when author_reopens
</ Issue>
```

**Branch:**
```scrml
< Branch>
  id: number
  name: string
  author: string
  base: string
  description: string             // GAP-7: what this branch is for
  linked_issues: [number]         // GAP-7: issue IDs this branch addresses
  status: .Active | .Merged | .Stale | .Deleted
  last_save_at: string
  diverged_from_base_by: number   // number of saves ahead of base
  conflict_risk: .None | .Low | .Medium | .High  // updated by real-time detection

  .Active -> .Merged: when landing_lands
  .Active -> .Stale: when no_save_in_30_days
  .Active -> .Deleted: when author_deletes
  .Stale -> .Active: when new_save_created
  .Stale -> .Deleted: when author_deletes || auto_cleanup
</ Branch>
```

**Repository:**
```scrml
< Repository>
  id: number
  name: string
  owner: string
  description: string
  status: .Active | .Archived | .Deleted
  default_branch: string
  review_required: boolean   // false = solo mode (compiler gate only), true = team mode
  created_at: string

  .Active -> .Archived: when owner_archives
  .Archived -> .Active: when owner_unarchives
  .Active -> .Deleted: when owner_deletes && confirmation_received
</ Repository>
```

### 6.2 State Type Design Principles

Every forge entity SHALL:
1. Have a `status` field that is an enum type (not a string)
2. Have all valid transitions declared in the state type definition
3. Be enforced: any code path that attempts to create an invalid transition SHALL fail at compile
   time, not at runtime
4. Have no "impossible states" — if a state field combination is logically invalid, it SHALL be
   represented as a separate status variant, not as a combination of fields

---

## 7. Real-Time Conflict Detection

### 7.1 Architecture

The scrml compiler runs in approximately 42ms. This is fast enough to run on every compile cycle
in the editor (6NZ). giti v4 leverages this speed to provide keystroke-level conflict awareness
against linked branches.

The system has three components:

**Component 1: Linked Branch Cache**
giti maintains a local cache of ASTs for linked branches. The cache is updated:
- On every `giti merge <branch>` invocation
- On every `giti sync` (which pulls remote changes)
- Via a background sync process that polls at configurable intervals (default: every 60 seconds)
- Via WebSocket push from the giti server when a linked branch receives a new save (v4 feature)

The cache stores: branch name, the HEAD hash, and the serialized AST for each .scrml file in
the branch.

**Component 2: AST Diff Algorithm**
An incremental AST diff algorithm compares the current file's AST against the cached AST for each
linked branch. Performance requirement: SHALL complete in under 10ms per file per linked branch.

The diff algorithm identifies:
- Structural conflicts: two branches modify the same entity (state type field, function, etc.)
- Type conflicts: the merged result would produce a type error
- Clean divergence: two branches touch different entities — no conflict

**Component 3: Conflict Indicator (6NZ UI)**
The 6NZ editor displays conflict awareness as ambient UI. This MUST NOT be intrusive or
blocking. The design SHALL follow the spell-check metaphor: always present, non-blocking, easy
to dismiss.

Conflict indicator behaviors:
- A file with no linked-branch conflicts: no indicator
- A file with a potential conflict: a subtle indicator in the file gutter (yellow dot)
- A file with a confirmed structural conflict: a clearer indicator with hover-to-explain
- The status bar shows: "No conflicts" or "2 potential conflicts"
- Clicking the indicator opens the conflict detail panel

### 7.2 Linked Branches

The concept of "linked branches" is giti's multiplayer awareness layer. It answers: "which other
branches should I be aware of as I work?"

Three categories of linked branches:

**Auto-linked:** The repository's default branch (usually `main`). Every working branch is
automatically linked to `main`. Cannot be unlinked. This ensures developers always have ambient
awareness of what is on main.

**Team-linked:** Branches owned by teammates in the same repository. giti SHALL offer to
auto-link teammate branches when a repository is in team mode (`review_required: true`). The
developer can add or remove team-linked branches at any time.

**Manual-linked:** Any branch the developer explicitly links. Use case: working on two related
features simultaneously and wanting awareness of each from the other.

**Linked branch operations:**
```
giti link <branch>           # manually link a branch
giti unlink <branch>         # remove a manual link
giti links                   # list all currently linked branches
```

### 7.3 Performance Budget

| Operation | Budget | Basis |
|---|---|---|
| Compiler compile cycle | <= 50ms | Current: ~42ms |
| AST diff (single file, single branch) | <= 10ms | Required for real-time feel |
| AST diff (single file, all linked branches) | <= 30ms | 3 linked branches at 10ms each |
| Cache update (background sync) | No interactive budget | Background process |
| Conflict indicator render | <= 5ms | UI frame budget |
| Total time from keystroke to conflict indicator update | <= 85ms | Sum of above |

If the compile cycle grows beyond 50ms, real-time conflict detection SHALL be disabled and the
developer notified. Compiler performance is a contract, not just a goal.

### 7.4 Scope of Real-Time Detection

**In scope:**
- .scrml files only
- Structural conflicts (same entity modified by two branches)
- Type conflicts (AST merge would produce a type error)
- Files currently open in the editor

**Out of scope (v4):**
- Non-scrml files (binary, config, docs)
- Files not currently open
- Semantic conflicts that require runtime analysis
- Cross-repository conflict detection

---

## 8. 6NZ Integration

### 8.1 6NZ as Primary Client

6NZ is the primary client for giti. The integration is first-class, not a plugin. giti features
SHALL be designed with 6NZ in mind; CLI features are secondary.

### 8.2 Instant Launch Requirement

6NZ MUST open as instantly as the browser can. This is a non-negotiable directive (user-voice.md,
verbatim: "must be lightning fast/responsive. open as instantly as the browser can (pwa)").

Implementation requirements:
1. 6NZ SHALL be a Progressive Web App (PWA). All editor code SHALL be cached via service worker.
2. On launch, 6NZ SHALL render the editor shell with zero server round-trips.
3. giti-related UI (conflict indicators, landing status, branch list) SHALL load from local cache
   first and update asynchronously.
4. No loading spinner for the editor chrome. The editor SHALL be interactive before any project
   data is fetched.
5. Performance target: editor shell interactive in under 100ms from user click.

### 8.3 giti Features in 6NZ

6NZ SHALL surface giti features as ambient, integrated UI rather than modal dialogs or separate
panes.

**Save:** Keyboard shortcut triggers `giti save` with optional inline message. No modal. The
message can be set post-save via an inline editor in the history panel.

**Conflict awareness:** Visible in the gutter as described in Section 7.3. Non-blocking.
Clicking the indicator shows the conflict context without leaving the current file.

**Landing status:** Shown in the status bar. Click to open the landing detail.

**History:** Available as a slide-in panel. Non-modal. Does not cover the editor content.

**Branch context:** Always visible in the status bar. Click to switch context.

### 8.4 giti CLI in 6NZ

6NZ SHALL include an integrated terminal where all `giti` CLI commands work as documented in
this spec. The terminal is for power users and advanced workflows. The ambient UI is for the
common path.

---

## 9. CLI Reference

### 9.1 Core Commands

```
giti init                     # initialize a new giti repository
giti save [message]           # snapshot current work (see Section 2.1)
giti switch <target>          # move to a different point in history (see Section 2.2)
giti merge <target>           # combine another context into current (see Section 2.3)
giti undo [N]                 # reverse the last operation (see Section 2.4)
giti history [--all] [--ops]  # show save history or operation log (see Section 2.5)
```

### 9.2 Status and Information

```
giti status                   # show current state, conflicts, divergence from main, base drift
giti describe <hash> [msg]    # set or update the message for a save
giti name <name>              # assign a name (bookmark) to the current context
giti links                    # list linked branches
```

### 9.3 Collaboration Commands

```
giti land                     # submit current work for landing (triggers compiler + tests)
giti share [--stack]          # open a Change or Stack for team review
giti review <id> approve      # approve a Change (team mode)
giti review <id> request      # request changes on a Change (team mode)
```

### 9.4 Sync Commands

```
giti sync                     # push current context to remote; pull remote changes
giti sync --push              # push only
giti sync --pull              # pull only
giti link <branch>            # link a branch for conflict monitoring
giti unlink <branch>          # remove a linked branch
```

### 9.5 Conflict Resolution

```
giti resolve [file]           # open the conflict resolution UI for a file (or all conflicts)
giti resolve --accept-ours    # resolve all conflicts by keeping the current side
giti resolve --accept-theirs  # resolve all conflicts by keeping the incoming side
```

### 9.6 Validation Commands (GAP-6)

```
giti check                    # run compiler + tests on current work without landing
giti check --quick            # compiler only, skip tests
giti check --diff             # show what would be checked (files changed since last save)
```

`giti check` runs the same compiler gate and test suite that `giti land` uses, but does not
create a landing. This allows developers and agents to validate their work before committing
to a landing attempt. It is the "dry run" for `giti land`.

**Normative statements:**

1. `giti check` SHALL run the same validation pipeline as `giti land` (compiler + tests).
2. `giti check` SHALL NOT create any landing, operation log entry, or state change.
3. `giti check` output SHALL match the format of `giti land` error output so that fixes
   applied after `giti check` also fix `giti land`.
4. `giti check` SHALL exit with code 0 on pass, 1 on failure.

### 9.7 Debug and Escape Hatch

```
giti ops                      # show raw jj operation log
giti debug                    # open debug console
giti debug run <jj-command>   # execute a raw jj command (with warning banner)
```

### 9.8 Command Flags

```
--yes           # skip confirmation prompts (use in scripts)
--quiet / -q    # suppress informational output
--json          # output as JSON (for tooling integration)
```

---

## 10. Error Messages

All giti error messages SHALL be written in plain language. The standard is Elm-level clarity:
the user SHALL be able to understand the problem and the fix without prior knowledge of the
underlying VCS engine.

**Mandatory error message requirements:**
1. NEVER expose jj internals (change IDs, jj operation IDs, tree hashes) in error messages
   shown to the user without translation.
2. Every error message SHALL include a suggested next action.
3. Error messages SHALL describe what happened, why it is a problem, and how to fix it.
4. If the error is recoverable via `giti undo`, the message SHALL say so.

### 10.1 Error Message Catalog

**GIT-001: Nothing to save**
```
Nothing to save. Your work is already captured.
```

**GIT-002: Repository not initialized**
```
This directory is not a giti project.
To create a new project here: giti init
To work with an existing project: navigate to its directory first.
```

**GIT-003: Target not found**
```
No context called 'xyz' found.
Check giti history to see what's available.
If you're looking for a remote branch, run giti sync first to get the latest.
```

**GIT-004: Compiler gate failed on landing**
```
Your work did not land because the compiler found errors.

[compiler error output]

Fix the errors above and run giti land again.
Your work is still here — nothing was lost.
```

**GIT-005: Tests gate failed on landing**
```
Your work did not land because the tests failed.

[test output]

Fix the failing tests and run giti land again.
Your work is still here — nothing was lost.
```

**GIT-006: Conflicts present on landing attempt**
```
Your work has conflicts that need to be resolved before landing.

  src/components/button.scrml  (conflict)

Run giti resolve to handle them, then giti land again.
Not ready to resolve now? You can keep working and resolve later.
```

**GIT-007: Debug mode warning**
```
Warning: You are running a raw jj command through giti's debug interface.
This bypasses giti's safety layer. Operations done here may not be undoable via `giti undo`.

Press Ctrl+C to cancel, or Enter to continue.
```

**GIT-008: Disk full**
```
Could not save your work. Your disk is out of space.
Free up disk space and run giti save again.
Your current changes are still in your working directory.
```

**GIT-009: Sync failed — no remote configured**
```
No remote repository is configured for this project.
To add one: giti remote add <url>
Example:    giti remote add https://giti.example.com/myproject
```

**GIT-010: Sync failed — authentication**
```
Could not connect to the remote repository. Check your credentials.
If you recently changed your password or access token, update it with:
  giti auth update
```

**GIT-011: Operation log empty**
```
Nothing to undo. This is the beginning of your project's history.
```

**GIT-012: Merge into self**
```
Cannot merge a context into itself. 
You are already at 'main'. Switch to a different context first.
```

---

## 11. Migration (Existing Git Repositories)

### 11.1 Migration Path

giti's jj backend uses git-compatible storage. Existing git repositories can be used with giti
without converting them. This is because jj operates on git's object store.

**Import procedure:**
```
cd my-existing-git-repo
giti init --from-git
```

This command SHALL:
1. Initialize giti's operation log in the existing repository
2. Set the current working copy to the current HEAD
3. Leave all git history intact and accessible
4. Not modify any files, commits, or refs

After `giti init --from-git`, the repository works with both `git` and `giti`. git commands
continue to work. giti commands work through giti's surface. Concurrent use of both is supported
but not recommended for the same developer on the same machine.

### 11.2 Existing Branch Structure

The existing git branches are accessible via `giti switch <branch-name>`. They appear in
`giti history --all`. All git history is preserved.

### 11.3 What Changes After Migration

| Before (git) | After (giti) |
|---|---|
| `git add .` + `git commit -m "msg"` | `giti save "msg"` |
| `git checkout feature-x` | `giti switch feature-x` |
| `git merge feature-x` | `giti merge feature-x` |
| `git reset --soft HEAD~1` | `giti undo` |
| `git log --oneline` | `giti history` |
| `git stash` | Not needed (working copy is always a save) |
| `git rebase` | `giti merge` (giti's merge never rebases) |
| Force push | Not available in giti's surface. Use `giti debug` if absolutely required. |

### 11.4 What git Workflow Patterns Become

**The "I made a mess" recovery:** Previously required `git reflog`, `git reset`, `git clean`.
Now: `giti undo`. The operation log records every operation. Any state can be recovered.

**The orphan stash:** Previously: 44 stashes, never cleaned, some orphaned forever. Now:
impossible. The working copy is always a save. There is no stash. Work-in-progress is just a
save with an empty message.

**The detached HEAD:** Not possible in giti's surface. Every position the developer can reach
is tracked.

**The 75-branch proliferation:** giti's bookmarks (named contexts) are optional. Anonymous
work (no named branch) is fully supported. Most development does not require named branches.
Named branches are for sharing and landing.

---

## 12. Open Questions

These questions are tracked and must be resolved before their respective features can be
implemented. Each is a spec issue that blocks a compiler pass or platform feature.

### OQ-1: jj-lib integration mechanism

**Question:** What is the exact mechanism for integrating jj-lib (Rust) with giti (Bun/JS)?
WASM compilation of jj-lib is the preferred approach (the `agentic-jujutsu` crate demonstrates
feasibility). But WASM boundary costs, memory model, and update cadence must be specified before
the integration can be implemented.

**Blocks:** giti v1 implementation.
**Acceptance criteria:** A working proof-of-concept of `giti save` round-tripping through jj-lib
via WASM, with measured latency for a 100-file repository.

### OQ-2: jj-lib API stability commitment

**Question:** What is the jj team's stability commitment for the jj-lib crate's public API?
giti pins a specific jj-lib version but must have a defined upgrade procedure. If jj makes
breaking API changes between v0.35 and v1.0, giti needs a migration strategy.

**Blocks:** Dependency management plan for giti.
**Acceptance criteria:** Documented version pinning policy and upgrade procedure.

### OQ-3: Compiler merge API specification

**Question:** What APIs does the scrml compiler need to expose for v3 conflict resolution
(compiler type-diff, Section 4.4)?

Specifically:
- How does the compiler receive "two ASTs and produce a type-safe merged AST or a conflict list"?
- What is the wire format for AST exchange between giti and the compiler?
- Can the compiler run in a headless / library mode for this use case?

**Blocks:** v3 conflict resolution.
**Acceptance criteria:** Compiler API spec section in SPEC.md covering the merge-validation entry
point.

### OQ-4: AST diff performance at repository scale

**Question:** The 10ms AST diff budget (Section 7.3) is set based on the expected single-file
case. What happens with a repository of 500+ .scrml files where 50 are modified simultaneously?
At what file count does the real-time detection model degrade, and what is the graceful
degradation behavior?

**Blocks:** v4 real-time conflict detection.
**Acceptance criteria:** Performance measurements on a synthetic 500-file repository with 50
concurrent modified files, across 3 linked branches.

### OQ-5: Non-scrml file conflict model

**Question:** A giti repository may contain .json, .css, .md, image files, and binary assets.
Section 4.3 specifies a tree-sitter fallback for parseable non-scrml files and a text merge
fallback for unparseable files. What is the exact file-type-to-merge-strategy mapping? What
parsers are bundled with giti v2?

**Blocks:** v2 AST semantic merge.
**Acceptance criteria:** Explicit file-type dispatch table in the spec, with named parser for each
supported type and defined fallback chain.

### OQ-6: Team mode activation and review-required enforcement

**Question:** How does a repository transition from solo mode (`review_required: false`) to team
mode (`review_required: true`)? Is this a repository setting, a per-branch setting, or a per-user
setting? What happens to in-flight landings when the mode changes?

**Blocks:** v1.1 Stack + Change collaboration layer.
**Acceptance criteria:** `< Repository>` state type updated with mode-transition rules; migration
path for in-flight landings specified.

### OQ-7: Landing revert window

**Question:** The `< Landing>` state type includes `.Landed -> .Abandoned: when author_reverts &&
within_24_hours`. What is the exact definition of "author reverts" in this context? Does `giti
undo` after `giti land` trigger this transition, or is it a separate `giti revert-landing`
command? What happens to downstream work that built on the landed commit within the 24-hour window?

**Blocks:** v1 `< Landing>` state type finalization.
**Acceptance criteria:** Worked example of a landing, a revert within 24 hours, and a revert
after 24 hours, with full state machine trace.

### OQ-8: Linked branch cache invalidation

**Question:** Section 7.1 specifies that the linked branch AST cache is updated on merge, sync,
and background poll (every 60 seconds). But if two developers are actively collaborating and
one pushes every 30 seconds, the other's cache could be stale for up to 60 seconds. Is 60
seconds the right default? Is real-time WebSocket push (v4) the right solution, or should
the poll interval be shorter?

**Blocks:** v4 real-time conflict detection architecture.
**Acceptance criteria:** Defined cache staleness policy with measured impact on false negative
conflict detection rate.

---

## Appendix A: Debate Scores Summary

| Debate | Winner | Score | Decision |
|---|---|---|---|
| giti v1 Architecture (2026-04-08) | casey-muratori-vcs | 50.5/60 | 5-function forge, scrml state types for data model |
| giti VCS User-Facing Model (2026-04-09) | Approach D (custom surface + jj engine) | 49.5/60 | 5-function API, jj-lib hidden underneath |
| giti Collaboration Primitive (2026-04-09) | Casey Landing + Graphite Stack + Typed Change (layered) | — | Three-layer architecture, not a single primitive |
| giti Conflict Resolution (2026-04-09) | jj Foundation-First | 50/60 | v1: jj storage; v1.1: trunk nudges; v2: AST; v3: compiler; v4: real-time |

---

## Appendix B: Design Principle Index

| Principle | Source | Section |
|---|---|---|
| Glassbox-as-requirements-document | design-insights.md (VCS model debate) | 1.3 |
| Engine is invisible | giti VCS debate, Approach D | 3.2 |
| Compiler is the reviewer | collaboration debate, Casey model | 5.1 |
| Waiting bottleneck | collaboration deep-dive (86% of PR lead time is waiting) | 1.3 |
| No staging area | Perez De Rosso MIT analysis, jj model | 2.1 |
| No detached HEAD | jj model, Bryan design constraint | 2.2 |
| No force push | Bryan design constraint, history is append-only | 2.3 |
| No rebase | Bryan design constraint, giti merge is append-only | 2.3 |
| One merge strategy | Casey Pattern 3, Bryan constraint | 2.3 |
| Conflicts as data | jj Merge<T> algebra, Bryan constraint | 4.1 |
| Undo everything | jj operation log, Bryan constraint | 2.4 |
| No silent data destruction | Bryan constraint, all operations logged | 2.4 |
| Typed change is the differentiator | collaboration debate (10/10 idiomaticity score) | 5.3 |
