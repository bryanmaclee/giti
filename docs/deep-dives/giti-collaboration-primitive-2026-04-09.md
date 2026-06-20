---
tags: [deep-dive, giti, collaboration]
status: historical
last-reviewed: 2026-05-26
date: 2026-04-09
---

# Deep Dive: giti Collaboration Primitive -- PRs vs Stacked Diffs vs Something New

**Date:** 2026-04-09
**Scope confirmed:** yes
**Feeds into:** debate on giti collaboration model | giti v1 spec | parent deep-dive (giti-radical-doubt-2026-04-09.md)

---

## Scope

**Question:** What should giti's primary collaboration mechanism be -- GitHub-style PRs, stacked diffs (Sapling/Graphite/Phabricator), email patches (SourceHut), trunk-based direct push, or a novel scrml-native primitive?

**In scope:**
- PR model: known problems, data on review quality vs PR size
- Stacked diffs model: Phabricator (original), Sapling (Meta), Graphite (GitHub layer)
- Email patch model: SourceHut, git send-email, Drew DeVault's arguments
- Gerrit's change-based model
- Trunk-based development with pair programming (no PRs)
- Novel approaches: review as scrml state type, AST-based diffs, transformation-based changes
- The Bryan signal: "can barely use git" as a hard design constraint

**Out of scope:**
- VCS layer choice (git vs jj vs custom -- separate sub-deep-dive)
- Conflict resolution model (separate sub-deep-dive)
- CI/CD integration
- Federation protocol

---

## Context

### What already exists in project history

**giti v1 Architecture Debate (2026-04-08, design-insights.md):**
Casey/Handmade approach won (50.5 > Fossil 46.5 > scrml-state-types 41.5). Key insight: "design the forge's data model in the language's native types now (PRs, reviews, issues as typed state)." The debate approved modeling collaboration primitives as scrml state types with enforced transitions.

**Parent Deep Dive (giti-radical-doubt-2026-04-09.md):**
Cataloged 4 categories of git friction (broken mental model, destructive operations, workflow complexity, confidence gap) and 4 categories of GitHub friction (platform reliability, AI contamination, DX, vendor lock-in). Section G1 specifically: "Large PRs (30+ files) are not reviewable on GitHub -- the page becomes unusable." The Bryan Signal: 52.2% of all developers struggle with git monthly; Bryan is the median user, not an outlier.

**Casey Muratori VCS Expert (agents/casey-muratori-vcs-expert.md):**
Pattern 4: "email patches as primitive." Pattern 3: "one merge strategy." The Casey position is that the simplest primitive that enables collaboration is the correct one.

**scrml State Types (SPEC.md, memory: project_state_as_first_class_type.md):**
`< Thing>` defines state types with transition rules. The spec now includes `< machine>` state types with `transitions {}` blocks. PRs, reviews, and issues modeled as state types was the winning v1 debate direction.

---

## Approaches

### Approach A: Small PRs with Enforced Size Limits (GitHub Model, Improved)

**How it works:** giti uses a pull-request-like primitive but enforces small PR size by default. A "change" in giti is a branch-to-branch comparison with a review UI, but the platform warns or blocks PRs above a configurable line threshold (default: 400 lines). The PR is modeled as a scrml state type with enforced transitions.

**scrml example (giti's Change type):**
```scrml
< Change>
  id: number
  title: string
  body: string
  author: string
  status: .Draft | .Open | .Approved | .Merged | .Closed
  branch: string
  target: string
  lines_changed: number
  
  // State machine transitions
  .Draft -> .Open: when author_submits
  .Open -> .Approved: when reviewer_approves && lines_changed <= 400
  .Open -> .Closed: when author_closes
  .Approved -> .Merged: when checks_pass
  .Closed -> .Open: when author_reopens
</ Change>
```

**Developer workflow:**
```
giti save           # snapshot current work (replaces git add + commit)
giti share          # push and open a Change for review (replaces git push + PR creation)
giti approve        # reviewer approves
giti land           # merge the Change (replaces merge button)
```

**Gains:**
- Familiar to the 100M+ developers who use GitHub
- Size enforcement addresses the core review quality problem (PRs over 1,000 lines have 70% lower defect detection -- Propel data)
- State type modeling gives giti typed workflows that GitHub lacks
- Small PRs get approved 3x faster than large ones (Propel data, 50K+ PRs analyzed)

**Loses:**
- Still branch-based, which means Bryan must understand branches
- Size limits create friction when a change is naturally large (migrations, renames)
- Does not solve the "waiting for review" bottleneck -- 86% of lead time is waiting (DEV Community data)
- Inherits the PR model's core assumption: asynchronous, low-trust review

**Complexity:**
- Compiler: none
- Spec: low (state type definition)
- Developer: medium (must learn branching, but simpler than GitHub)

**Prior art:**
- GitHub PRs: 100M+ repos, but 70% lower defect detection on large PRs. Known scaling problems. Source: propelcode.ai, github.com/orgs/community/discussions/33663
- Graphite's size enforcement: Teams using stacked PRs (inherently small) ship 20% more code. Source: graphite.com, contrary.com research report
- Google's internal review tools: enforced small CLs (changelists) as standard practice

---

### Approach B: Stacked Changes (Phabricator/Graphite Model)

**How it works:** giti's collaboration primitive is the "stacked change" -- a series of small, dependent changes where each builds on the previous one. Instead of one large PR, a developer creates a stack of 3-5 small changes that are reviewed independently but land together. The platform provides a stack view showing the dependency chain.

**scrml example (giti's Stack and Change types):**
```scrml
< Change>
  id: number
  title: string
  body: string
  author: string
  status: .Draft | .Open | .Approved | .Merged | .Closed
  parent_change: number | null
  stack_id: number
  
  .Draft -> .Open: when author_submits
  .Open -> .Approved: when reviewer_approves
  .Approved -> .Merged: when parent_merged_or_null && checks_pass
  .Closed -> .Open: when author_reopens
</ Change>

< Stack>
  id: number
  title: string
  author: string
  changes: [Change]
  status: .InProgress | .ReadyToLand | .Landed
  
  // Stack lands when all changes approved
  .InProgress -> .ReadyToLand: when all_changes_approved
  .ReadyToLand -> .Landed: when author_lands
</ Stack>
```

**Developer workflow:**
```
giti save "add user model"        # create change 1
giti save "add user API"          # create change 2 (stacked on 1)
giti save "add user UI"           # create change 3 (stacked on 2)
giti share                        # push entire stack for review
giti land                         # land entire stack when approved
```

**Gains:**
- Forces small changes by design -- each change in the stack is independently reviewable
- Facebook replaced branch-oriented workflow with stacked diffs because "it made engineers more productive in very concrete terms" (Jackson Gabbard, ex-Facebook)
- Shopify: 33% more PRs per developer after adopting stacked workflow. Asana: 7 hours saved weekly. Source: contrary.com Graphite report
- Graphite: 100K+ users, 8K+ businesses, $15M+ ARR as of September 2025. The model is proven and gaining momentum.
- Each change in the stack corresponds to one logical step -- reviewers see the narrative of the change, not a blob
- Handles Bryan's "barely use git" constraint better than PRs because the tool manages the stack; the developer just `save`s and `share`s

**Loses:**
- Conceptually more complex than a single PR -- stacks have dependencies, reordering, rebasing
- If a middle change in the stack needs revision, all subsequent changes must be updated (the "restack" problem)
- Requires git proficiency for conflict resolution within stacks (Phabricator limitation, acknowledged by Kurtis Nusbaum)
- Steeper learning curve if the developer must understand how stacks relate to branches underneath
- Tooling must handle the restack operation transparently, or the complexity leaks to the developer

**Complexity:**
- Compiler: none
- Spec: medium (Stack + Change state types, dependency rules)
- Developer: medium-high if stack management is manual; low if the tool handles restacking automatically

**Prior art:**
- Phabricator Differential (Facebook, 2011-2021): the original stacked diffs implementation. "People who have worked with Phabricator generally love it and seek it wherever they next go." Phabricator itself was discontinued in 2021. Source: jg.gg, kurtisnusbaum.medium.com
- Graphite (2021-present): stacked PRs on GitHub. 100K+ users, proven productivity gains. Source: graphite.com, contrary.com
- Sapling (Meta, 2022-present): full VCS with stacked diffs as first-class workflow. Source: sapling-scm.com
- Gerrit (Google): change-based model promoting single-commit reviews, "inherently encourages trunk-based development." Source: gerrit-review.googlesource.com
- ghstack (Facebook), spr (Shopify): lightweight stacking tools on top of GitHub

---

### Approach C: Patch Queue (SourceHut/Email Model, Modernized)

**How it works:** giti's collaboration primitive is the "patch" -- a self-contained diff with metadata, sent to a project for review. No branches required. No fork required. A contributor prepares a patch locally and submits it. The maintainer applies, modifies, or rejects it. The patch queue is a list of pending patches, ordered by submission.

**scrml example (giti's Patch type):**
```scrml
< Patch>
  id: number
  title: string
  body: string
  author: string
  diff: string
  status: .Submitted | .UnderReview | .Revised | .Applied | .Rejected
  version: number
  
  .Submitted -> .UnderReview: when maintainer_picks_up
  .UnderReview -> .Revised: when maintainer_requests_changes
  .Revised -> .UnderReview: when author_resubmits
  .UnderReview -> .Applied: when maintainer_applies
  .UnderReview -> .Rejected: when maintainer_rejects
</ Patch>
```

**Developer workflow:**
```
giti save "fix login bug"         # snapshot the change
giti send                         # submit patch to project
# maintainer reviews, applies with:
giti apply 42                     # apply patch #42
```

**Gains:**
- Simplest mental model: "I made a change, I sent it to you, you applied it or didn't"
- No branches, no forks, no merge strategies -- the contributor never needs to understand the project's branch structure
- Drew DeVault reports reviewing a 50-email patch queue in ~20 minutes vs 1+ hour for the same number of merge requests. Source: drewdevault.com/2022/07/25/Code-review-with-aerc.html
- Works offline -- patches are self-contained
- Casey Pattern 4 endorses this: "email patches as primitive"
- Perfectly fits Bryan's constraint: `giti send` is the entire collaboration workflow for a contributor

**Loses:**
- No built-in dependency tracking between patches (unlike stacked diffs)
- Patches can conflict with each other if applied out of order
- The email-based version failed to gain adoption outside kernel development -- "email isn't the center of everyone's universe" (BrixIT blog)
- SourceHut has a tiny user base despite being technically excellent -- suggests the model has adoption friction
- For complex multi-file changes, a single patch is unwieldy; for multi-patch changes, manual ordering is required
- No inline discussion on specific lines (unless the platform adds a review UI, at which point it converges toward PRs)

**Complexity:**
- Compiler: none
- Spec: low (single Patch state type)
- Developer: low for contributors, medium for maintainers (must manage the queue)

**Prior art:**
- Linux kernel (git send-email): the original patch workflow. Still used for the largest collaborative software project in history. Works because the kernel has experienced maintainers who can manage patch queues.
- SourceHut (2018-present): modern web UI over email patches. Sub-10KB pages, sub-3-second loads. But: "LLM training crawlers consuming 20-100% of weekly operations time, causing dozens of outages per week." Source: sourcehut.org, drewdevault.com
- GNU Savannah: patch-based workflow for GNU projects. Functional but dated.

---

### Approach D: Direct Push with Compiler-Gated Landing (Trunk-Based)

**How it works:** giti has no PRs, no patches, no stacked diffs. Developers push changes directly to a staging area. The scrml compiler runs on every push and gates the landing: if the change compiles, passes tests, and doesn't break the type system, it lands automatically. If it breaks something, the developer gets a typed error report. Review happens synchronously (pair programming) or post-hoc (reading the commit log).

**scrml example (giti's Landing type):**
```scrml
< Landing>
  id: number
  author: string
  changes: string
  compiler_result: .Pass | .Fail
  test_result: .Pass | .Fail
  status: .Pending | .Landed | .Blocked
  
  // Compiler gates the landing -- no human review required
  .Pending -> .Landed: when compiler_result is .Pass && test_result is .Pass
  .Pending -> .Blocked: when compiler_result is .Fail || test_result is .Fail
</ Landing>
```

**Developer workflow:**
```
giti save "add user feature"      # snapshot
giti land                         # push to trunk; compiler validates; lands if green
```

**Gains:**
- Simplest possible workflow: save and land. Two operations.
- Eliminates the "waiting for review" bottleneck entirely -- 86% of lead time gone
- Compiler-as-reviewer is scrml-native: the type system already catches breaking changes, the test context `~{}` already exists
- Trunk-based development with CI gating is practiced at Google, Meta, and other high-throughput engineering orgs
- Perfectly fits the Casey philosophy: "what is the actual problem? Not: what features does the market leader have?"
- Bryan never waits for anyone. His workflow is: write code, land it, the compiler tells him if it's wrong.

**Loses:**
- No human review -- relies entirely on the compiler and tests to catch issues. This works for type errors and test failures but not for design quality, naming, architecture, or "is this the right approach?"
- Requires comprehensive test coverage to be trustworthy -- untested code lands without oversight
- Does not work for open-source contribution from strangers (low-trust environment)
- Pair programming is required for code quality, but Bryan works solo
- Teams larger than ~5 people typically need some form of async review

**Complexity:**
- Compiler: low (compiler already runs; just needs to be invoked by the platform)
- Spec: low (Landing state type)
- Developer: very low (the simplest possible workflow)

**Prior art:**
- Google's Mondrian/Critique (internal): trunk-based with mandatory review, but the review is lightweight and the CI gates are strong. Not exactly "no review" but review is fast because changes are small.
- Trunk-based development movement: "No more messages begging teammates to review pull requests, no more waiting for pull requests to be approved." Source: medium.com/@mattia.battiston
- ThoughtWorks/XP teams: pair programming + direct push. "Pair programming creates fewer negative social dynamics." Source: qase.io/blog
- Limitation: every team that practices this at scale still has SOME form of pre-merge validation (CI, mandatory pairing, or post-hoc review). Pure "push and pray" does not work.

---

### Approach E: Typed Change with AST Diff (scrml-Native Primitive)

**How it works:** giti's collaboration primitive is unique to scrml: a "typed change." Instead of diffing text lines, giti diffs the scrml AST. The platform shows what changed at the semantic level: "Button gained a required prop `variant`; 3 downstream usages will break." Review happens on the typed diff, not the text diff. The scrml compiler provides the diff data. The change is a scrml state type with compiler-computed metadata.

**scrml example (giti's TypedChange type):**
```scrml
< TypedChange>
  id: number
  title: string
  author: string
  status: .Draft | .Open | .Approved | .Merged | .Closed
  
  // Compiler-computed fields (read-only, derived from AST diff)
  added_types: [string]
  removed_types: [string]
  modified_types: [string]
  breaking_changes: [string]
  affected_files: [string]
  
  .Draft -> .Open: when author_submits
  .Open -> .Approved: when reviewer_approves && breaking_changes is []
  .Open -> .Approved: when reviewer_approves && breaking_acknowledged
  .Approved -> .Merged: when checks_pass
</ TypedChange>
```

**What the review UI shows (instead of a text diff):**
```
Change #42: "Add priority to Todo"

TYPE CHANGES:
  < Todo>
    UNCHANGED: title : string
    UNCHANGED: done : boolean
    ADDED:     priority : .Low | .Medium | .High   [REQUIRED]

IMPACT:
  - pages/home.scrml (line 14) -- BREAKING: <Todo> missing priority
  - pages/list.scrml (line 8) -- BREAKING: <Todo> missing priority
  - components/item.scrml (line 22) -- OK: already passes priority

COMPILER VERDICT: 2 breaking changes detected. Reviewer must acknowledge.
```

**Developer workflow:**
```
giti save "add priority to Todo"  # snapshot
giti share                        # open typed change for review
# reviewer sees type diff + impact analysis, not text diff
giti land                         # merge after approval
```

**Gains:**
- The review is semantic, not textual. Reviewers see what the change MEANS, not what characters changed.
- Breaking changes are caught by the compiler before review even begins -- the reviewer focuses on design intent, not correctness.
- This is impossible on GitHub or any existing platform -- it requires a compiler that understands the code at the type level. scrml HAS that compiler.
- Solves the "large PR is unreviewable" problem differently: even a large change can be understood if the review shows semantic impact rather than 3000 lines of diff.
- AST-based diff tools exist (SemanticDiff, Difftastic) but they are add-ons. giti would have this built in because it IS the compiler's platform.

**Loses:**
- Requires the scrml compiler to expose a "diff two ASTs and produce a typed change report" API. This is non-trivial compiler work.
- No prior art for a forge with built-in AST diffing as the primary review mechanism. High novelty = high risk.
- Falls back to text diff for non-scrml files (config, docs, assets). The platform needs both.
- The "typed change" only works for scrml code. giti would need to support non-scrml repos too (or explicitly not support them).

**Complexity:**
- Compiler: high (AST diff API, impact analysis, breaking change detection)
- Spec: medium (TypedChange state type + compiler API spec)
- Developer: low (the review UI does the hard work; the developer just saves and shares)

**Prior art:**
- SemanticDiff (2023-present): VS Code extension + GitHub integration for language-aware diffs. Supports 30+ languages. Hides irrelevant changes, detects moved code. Source: semanticdiff.com
- Difftastic: structural diff for 30+ languages. Open source. Source: github.com/Wilfred/difftastic
- Roslyn (C#/.NET): exposes AST APIs that enable semantic analysis of code changes. Microsoft uses this internally for some review tooling.
- No forge has AST diffing as its PRIMARY review mechanism. This would be novel.

---

## Trade-off Matrix

| Dimension | A: Small PRs | B: Stacked Changes | C: Patch Queue | D: Direct Push | E: Typed Change |
|---|---|---|---|---|---|
| Developer ergonomics | Familiar but wait-heavy | High throughput, stack mgmt | Simple submit, complex maintain | Simplest possible | Novel but powerful |
| Compiler complexity | None | None | None | Low (CI gating) | High (AST diff API) |
| Spec clarity | Low (one state type) | Medium (two state types) | Low (one state type) | Low (one state type) | Medium (state type + API) |
| Bryan's pain solved | Partial (still branches) | Partial (stacks abstract branches) | High (no branches needed) | Highest (save + land) | High (semantic review) |
| Open source contribution | Standard model | Works (each change independent) | Works (patches from anyone) | Broken (no review gate) | Works (typed review) |
| Review quality | Depends on size discipline | High (forced small changes) | Depends on patch size | No review | Highest (semantic) |
| Waiting time | High (86% of lead time) | Medium (smaller reviews land faster) | Medium (queue ordering) | Zero | Medium (review still needed) |
| Prior art confidence | Very High | High (Phabricator, Graphite) | Medium (SourceHut, kernel) | Medium (trunk-based orgs) | Low (novel) |
| Adoption friction | Lowest (everyone knows PRs) | Medium (new concept for most) | High (email stigma) | Low (simpler than PRs) | Medium (new concept) |

---

## Prior Art Table

| Platform/Tool | Problem they solved | Their approach | Result |
|---|---|---|---|
| **GitHub PRs** | Open-source collaboration at scale | Branch + PR + merge button | 100M+ repos; large PRs unreviewable; 70% lower defect detection on 1000+ line PRs |
| **Phabricator Differential** | Code review quality at Facebook | Stacked diffs, single-commit review units | Engineers "more productive in very concrete terms"; Phabricator discontinued 2021; users miss it |
| **Graphite** | Stacked diffs on GitHub without leaving git | CLI layer + web UI for stacked PRs | 100K+ users, 8K+ businesses, $15M+ ARR; Shopify +33% PRs/dev |
| **Sapling** | Monorepo scale + stacked diffs | Full VCS replacement with stack-first workflow | Proven at Meta scale; limited outside adoption |
| **Gerrit** | Change-level review for large codebases | Single-commit changes, push-to-review | Android, Chromium, Go use it; steep learning curve; "the structured code review" |
| **SourceHut** | Platform bloat, privacy, speed | Email patches + web UI, sub-10KB pages | Devoted niche; onboarding friction; crawler attacks consuming 20-100% ops time |
| **Linux kernel** | Largest collaborative software project | git send-email + mailing list | Works because maintainers are experts; not a model for most teams |
| **Google (internal)** | Trunk-based development at scale | Mondrian/Critique: small CLs, fast review, strong CI | Fastest shipping velocity in industry; requires Google-level CI infrastructure |
| **SemanticDiff** | Text diff misses semantic meaning | AST-aware diff as VS Code/GitHub plugin | Growing adoption; add-on, not primary review mechanism |
| **Difftastic** | Structural diffing for any language | Tree-sitter based AST comparison | 30+ languages; CLI tool, not a forge feature |

---

## Dev Agent Signal

No dev agents were polled for this sub-deep-dive. The parent deep dive recommended polling 14 dev agents with: "Should giti have PRs, email patches, stacked diffs, or something else?" This poll should be run during the debate phase, when agents can evaluate the concrete approaches cataloged here.

---

## Open Questions

1. **Can stacked changes and typed changes be combined?** Approach B (stacked changes) and Approach E (typed changes) are not mutually exclusive. A stacked change that shows AST diffs would combine the best of both. But this doubles the implementation complexity. Is the combination worth it for v1?

2. **How does Bryan's solo workflow differ from team collaboration?** Bryan works alone now. The collaboration primitive must serve him (solo, save-and-land simplicity) AND future team use (review, approval gates). Can one primitive serve both, or does giti need two modes?

3. **What happens to non-scrml files?** Approach E (typed changes) only works for scrml. Config files, documentation, assets, and any non-scrml code would fall back to text diff. Is this acceptable, or does it create a split experience?

4. **Does "stacking" require branch understanding?** The stacked diffs model abstracts away branches at the tool level (Graphite manages branches for you), but conflicts during restacking still surface git complexity. If giti uses jj underneath (from the VCS sub-deep-dive), jj's conflict-as-data model might eliminate this problem. This depends on the VCS layer decision.

5. **What is the minimum viable collaboration for giti v1?** The Casey philosophy says "solve the actual problem." Bryan's actual problem right now is: save work, share it, get it reviewed, land it. How many of the five approaches are needed for v1 vs later phases?

---

## Recommendation for Debate

**Approaches worth debating:**
- **B: Stacked Changes** -- strongest prior art momentum (Graphite $15M ARR, Shopify/Asana results), solves the size problem by design, maps to scrml state types naturally
- **D: Direct Push (compiler-gated)** -- simplest possible model, most aligned with Casey philosophy, solves Bryan's "waiting for review" pain, but broken for open-source contribution
- **E: Typed Change (AST diff)** -- most scrml-native, highest review quality, but highest compiler complexity and zero prior art as a primary mechanism

**Approaches that can be eliminated for v1:**
- **A: Small PRs** -- this is just GitHub with a size limit. Does not solve the fundamental problems (branches, waiting, text-level review). If giti ships PRs, it should at least be stacked PRs.
- **C: Patch Queue** -- the email model's adoption failure is decisive. SourceHut is technically excellent with a tiny user base. The model works for kernel maintainers, not for "can barely use git" developers. The modernized web version converges toward PRs anyway.

**Suggested debate framing:** "giti needs a collaboration primitive simpler than GitHub PRs that works for both solo developers and teams. Should it be stacked changes (Phabricator/Graphite model, proven), compiler-gated direct push (Casey philosophy, simplest), or typed changes with AST diff (scrml-native, novel)? Can these be layered: direct push for solo, stacked typed changes for teams?"

**Suggested participants:**
- casey-muratori-vcs-expert -- will argue for Approach D (direct push, radical simplicity)
- A Phabricator/stacked-diffs expert (to be forged) -- will argue for Approach B
- scrml-dev-cs-phd -- can evaluate the AST diff API complexity for Approach E
- scrml-dev-react, scrml-dev-svelte -- can evaluate DX from a framework developer's perspective
- scrml-dev-go -- Gerrit experience (Go project uses Gerrit's change-based model)
