---
tags: [deep-dive, giti, radical-doubt]
status: historical
last-reviewed: 2026-05-26
date: 2026-04-09
---

# Deep Dive: giti Radical Doubt -- What's Wrong With Git and GitHub

**Date:** 2026-04-09
**Scope confirmed:** yes
**Feeds into:** giti platform design decisions | debate on VCS model | debate on forge architecture | spec for giti v1

---

## Scope

**Question:** What should giti (the scrml platform -- a GitHub replacement) do differently from git/GitHub, and why -- grounded in the creator's own confession that he can barely use git?

**In scope:**
- Git friction taxonomy: every known UX failure, categorized by root cause
- GitHub platform friction taxonomy: every known platform-level pain point
- Alternative VCS designs: Jujutsu (jj), Pijul, Fossil, Sapling, cmirror
- Alternative forge platforms: SourceHut, Gitea/Forgejo, Codeberg, Radicle
- The Bryan signal: what "barely use git" means as a design constraint
- Prior art from this project: giti v1 architecture debate (Casey/Handmade won 50.5 > Fossil 46.5)
- What compiler-integrated version control could look like (novel territory)

**Out of scope:**
- giti implementation details (separate workstream)
- 6NZ editor integration specifics (later phase)
- Business model or monetization
- Deployment infrastructure

---

## Context

### What already exists in project history

**giti v1 Architecture Debate (2026-04-08, design-insights.md):**
Three approaches debated: casey-muratori-vcs (50.5), fossil-scm (46.5), scrml-state-types (41.5). The Casey/Handmade approach won -- 5-function single-binary forge + typed data model. The design insight: "design the forge's data model in the language's native types now (PRs, reviews, issues as typed state) even if the enforcement is not yet compiled, so that when the compiler catches up, the forge's data layer is already the canonical example of the language's state type system."

**git-e Platform Deep Dive (2026-03-30, docs/deep-dives/git-e-platform-2026-03-30.md):**
Four architecture approaches cataloged: A (Pure Dogfood), B (Hybrid), C (Progressive Dogfood), D (Stdlib Git Layer). Approach B eliminated. The deep dive identified 10 spec gaps blocking giti: runtime ^{} meta, WebSocket/real-time, workers, file upload, binary data, background jobs, pagination, search, email, rate limiting.

**Casey Muratori VCS Expert (agents/casey-muratori-vcs-expert.md):**
Permanent expert agent exists. Core position: "what is the actual problem? Not: what features does the market leader have?" Five canonical patterns: single-purpose tools, server-rendered HTML, one merge strategy, email patches as primitive, single binary deployment.

**User Voice (Session, user-voice.md):**
Bryan (verbatim): "I want to set up another collaboration plan like radical doubt. but this one will be on the giti platform. I have to come clean about something, I can barely use git and have issues all the time just doing basic things on github. pull on every thread, deep-dive anything needed, debate all results, recur as needed."

**Ecosystem Vision (memory: project_ecosystem_vision.md):**
giti is one of three cornerstone products (compiler, 6NZ, giti), all built in scrml. "If scrml can build its own dev tools, it proves it can build anything."

---

## Part 1: Git Friction Taxonomy

### Category A: Broken Mental Model

Git's conceptual model has been studied academically. The key source is Santiago Perez De Rosso and Daniel Jackson's "What's Wrong with Git? A Conceptual Design Analysis" (MIT, 2013/2016). Their findings, confirmed by user studies where Gitless users outperformed Git users on tasks:

**A1. The staging area (index) is a concept without a clear purpose for most users.**
The staging area creates a three-state model (working directory, index, repository) where most users need two states (my changes, saved changes). Perez De Rosso's analysis identified the staging area as a "misfit" -- a concept that fails its intended purpose for most workflows. Jujutsu (jj) eliminates the staging area entirely: the working copy IS a commit. Gitless also eliminated staged versions.

**A2. Detached HEAD is a terrifying state with a friendly-sounding name.**
When HEAD points directly to a commit rather than a branch, Git enters "detached HEAD" state. Commits made in this state are not on any branch and will be garbage-collected. The warning message ("You are in 'detached HEAD' state") is informational in tone but the consequence is data loss. Sources: git-tower.com, cloudbees.com, circleci.com all publish recovery guides for this single state, indicating its frequency.

**A3. Branch semantics are invisible.**
Local branches, remote branches, tracking branches, and the relationship between them are not surfaced in any intuitive way. A developer can have `main`, `origin/main`, and a tracking relationship between them that can diverge without warning. Source: diversion.dev/blog/on-git-and-cognitive-load.

**A4. git checkout does too many unrelated things.**
`git checkout` switches branches, creates branches, restores files, and enters detached HEAD -- four distinct operations behind one command. Git partially addressed this with `git switch` and `git restore` in Git 2.23 (2019), but the original command remains, documentation references it, and tutorials teach it. Source: Perez De Rosso's analysis flagged this as a core misfit.

**A5. The object model is opaque.**
Trees, blobs, commits, refs, HEAD, tags -- Git's internal data model is exposed to users without a coherent abstraction layer. Users memorize commands without understanding the data model, leading to cargo-cult usage. Source: MIT behavioral study (Milliken, HICSS-54) found users "frequently lack a mental model for understanding Git's operations."

### Category B: Destructive Operations

**B1. Force push destroys shared history.**
`git push --force` overwrites the remote branch with local history. If others have based work on the remote, their work is orphaned. 45% of developers surveyed have been negatively affected by a colleague's force push. Source: hutte.io git statistics.

**B2. Rebase rewrites history with no undo.**
`git rebase` replays commits on a new base, creating new commit hashes. If the rebase goes wrong mid-way, recovery requires knowledge of `git reflog` -- a tool most developers don't know exists. 55% of developers find rebase challenging and error-prone. Source: hutte.io git statistics.

**B3. `git clean -f` and `git checkout .` are silent data destroyers.**
These commands permanently delete untracked files or unstaged changes with no confirmation and no recovery path. There is no trash can, no undo, no "are you sure?" Source: ohshitgit.com.

**B4. Merge conflicts are presented as text-editing puzzles.**
Git dumps conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) into source files and expects the developer to manually edit them correctly. If the developer doesn't understand both sides of the change, the resolution is a guess. 87% of developers have encountered merge conflicts. Source: hutte.io git statistics.

### Category C: Workflow Complexity

**C1. Rebase vs merge is a religious war with no right answer.**
Git offers multiple ways to integrate branches, each producing different history shapes. Teams argue about strategy instead of shipping. The Casey Muratori expert agent's pattern: "The correct number of merge strategies for most teams is one. Choose it. Enforce it." Source: casey-muratori-vcs-expert.md Pattern 3.

**C2. Stash is a parallel universe that leaks.**
`git stash` saves uncommitted work to a separate stack. 28% of developers have been confused or lost work when using stash. The stash is not per-branch -- it's global. Items stashed on one branch can be applied on another, creating confusion. Source: hutte.io git statistics, Perez De Rosso analysis.

**C3. Submodules are universally reviled.**
30% of developers using submodules have faced issues with them getting detached or out of sync. Submodules create nested repositories with independent history, requiring separate pulls, separate commits, and careful version pinning. Source: hutte.io git statistics.

**C4. .gitignore is post-hoc and irreversible.**
Adding a file to .gitignore after it's been tracked does not untrack it. The command to fix this (`git rm --cached`) is non-obvious and deletes the file from other people's working directories on pull. Source: common knowledge, confirmed by 7-git-mistakes-a-developer-should-avoid (git-tower.com).

### Category D: Confidence Gap

**D1. Perceived competence far exceeds actual competence.**
From developer surveys: of people who said they feel confident using git, 75.4% struggle with it at least once a month. 52.2% of all developers struggle with git at least once a month. Source: Alberto Gimeno, Medium survey.

**D2. Error recovery requires knowledge you don't have.**
"Git documentation has this chicken and egg problem where you can't search for how to get yourself out of a mess, unless you already know the name of the thing you need to know about in order to fix your problem." Source: ohshitgit.com.

**D3. 65% of developers have lost commits or changes.**
Not edge cases. Majority experience. Source: hutte.io git statistics.

---

## Part 2: GitHub Platform Friction Taxonomy

### Category E: Platform Reliability

**E1. Chronic instability.**
Between January and October 2024, GitHub reported 106 incidents of varying severity. The ongoing migration from legacy data center to Microsoft Azure (began October 2025, still in progress February 2026) is causing additional outages. Source: isdown.app blog, serenitiesai.com.

**E2. GitHub Actions reliability degradation.**
Zig's Andrew Kelley described "vibe-scheduling" -- GitHub Actions seemingly choosing jobs to run at random. The open source runner application is not accepting contributions, with GitHub citing resource allocation "towards other areas of Actions." Source: devclass.com, ziglang.org.

**E3. Major projects leaving.**
Zig migrated to Codeberg (November 2025) citing Microsoft's AI policies and Actions reliability. cURL shut down its bug bounty after AI slop overwhelmed it. Godot reducing GitHub reliance. Source: theregister.com, winbuzzer.com, devclass.com.

### Category F: AI Contamination

**F1. 20% of submissions are AI slop.**
By mid-2025, approximately 20% of all submissions to GitHub were AI-generated content, with only 5% of security-related AI submissions identifying genuine vulnerabilities. Source: winbuzzer.com citing RedMonk data.

**F2. Copilot as a vector for complexity.**
GitHub Copilot generates code that looks correct but carries licensing ambiguity and quality concerns. The platform's AI integration is driving the projects that care most about code quality to leave.

### Category G: Developer Experience

**G1. Pull request review is fundamentally broken at scale.**
Large PRs (30+ files) are not reviewable on GitHub -- the page becomes unusable, requiring developers to review in their IDEs instead. Individual files take 5-8 seconds to load. Source: github.com/orgs/community/discussions/33663, victoronsoftware.com.

**G2. Notification overload.**
GitHub's notification system is described as "notification system that has its own notification problem." No clear distinction between "needs your action" and "FYI." Source: casey-muratori-vcs-expert.md.

**G3. Branch protection is a 12-checkbox puzzle.**
12+ configuration options for branch protection rules. Most teams use 2-3 but must navigate all 12 to set them. Source: casey-muratori-vcs-expert.md.

### Category H: Vendor Lock-in

**H1. GitHub-specific CI (Actions) creates lock-in.**
50,000+ Actions marketplace creates ecosystem dependency. Migrating away means rewriting CI. Source: casey-muratori-vcs-expert.md.

**H2. Pricing pressure on infrastructure users.**
GitHub announced $0.002/minute charge for self-hosted runners starting March 2026 -- charging developers for running software on their own hardware. Source: devclass.com.

**H3. No data portability for platform features.**
Git repos are portable. Issues, PRs, discussions, project boards, Actions, and Packages are not. Moving away from GitHub means losing all non-git data.

---

## Part 3: Alternative VCS Analysis

### Jujutsu (jj) -- Google

**What it fixes:**
- Eliminates the staging area: working copy IS a commit, always
- Conflicts are stored as data in the commit tree, not as text markers in files
- Conflicts can be deferred -- you don't have to resolve them immediately
- Conflict resolution propagates automatically to descendant commits
- Built on Git backend -- fully compatible with Git remotes, looks like regular Git commits
- No detached HEAD -- every change is tracked
- Undo built in as a first-class operation

**What it sacrifices:**
- Learning curve for existing Git users (different vocabulary)
- Still pre-1.0 (v0.24 as of December 2024)
- No native forge platform

**Prior art confidence:** High. Built by a Google engineer who previously worked on Mercurial. Growing adoption. Solves exactly the problems in Categories A and B.

Source: jasminchen.dev, github.com/jj-vcs/jj, tonyfinn.com/blog/jj

### Pijul -- Patch Theory

**What it fixes:**
- Merges are mathematically defined (pushouts in a category)
- Independent patches can be applied in any order (commutative when independent)
- Conflicts are "the standard case" not a failure mode
- Solves the exponential merge problem (logarithmic time for non-conflicting patches)

**What it sacrifices:**
- Not Git-compatible
- Very small community (the Nest has almost no users)
- Academic/theoretical -- less battle-tested
- Proves that technical superiority does not create adoption

**Prior art confidence:** Medium for theory, Low for adoption. Source: pijul.org, jneem.github.io

### Fossil -- D. Richard Hipp (SQLite creator)

**What it fixes:**
- Single binary, integrated: VCS + wiki + tickets + forum + web UI
- All data in one SQLite database -- backup is copying one file
- No missing features that require a separate platform
- Built-in web server for browsing repositories
- Designed for small teams and solo developers

**What it sacrifices:**
- Not Git-compatible
- Very small community compared to Git
- Limited ecosystem (no CI, no marketplace, no integrations)
- The "all-in-one" model limits each component (tickets are basic, wiki is basic)

**Prior art confidence:** High for the single-binary/integrated model. Fossil is the proof that "VCS + issue tracker + wiki in one binary" works. Source: fossil-scm.org, ubos.tech comparison.

### Sapling -- Meta

**What it fixes:**
- Stacked diffs (stacked commits) as first-class workflow
- Explicit commands for editing, rearranging, understanding commit stacks
- Sparse UX for monorepos
- Sub-second developer loop (edit, status, diff, absorb, restack)

**What it sacrifices:**
- Designed for Meta's monorepo scale -- may be overkill for small projects
- Requires a file-watching service for best performance
- Limited adoption outside Meta

**Prior art confidence:** Medium. Proven at Meta's scale. Open source since 2022. Source: sapling-scm.com, engineering.fb.com.

### cmirror -- Casey Muratori

**What it fixes:**
- Does exactly one thing: file sync and backup
- ~1000 lines of C++, single file, public domain
- Entire tool fits in one developer's head
- No concepts beyond "these files should be the same over there"

**What it sacrifices:**
- Not a VCS -- no history, no branches, no merge
- Single-file approach doesn't scale to team collaboration
- Not a Git replacement -- solves a different (simpler) problem

**Prior art confidence:** High for the philosophy. cmirror is not a VCS -- it's proof that "solve the actual problem" produces radically simpler tools. Source: github.com/Mephisztoe/cmirror, handmade.network.

---

## Part 4: Alternative Forge Analysis

### SourceHut (sr.ht) -- Drew DeVault

**What it does differently:**
- Pages load in ~3 seconds (vs 38 seconds for GitHub for comparable repos)
- Sub-10KB page weight, no mandatory JavaScript
- Email-based patch workflow (git send-email / git format-patch)
- Each service independent (git.sr.ht, builds.sr.ht, lists.sr.ht)
- Brutalist UI: "minimize distractions when you're working"

**Problems it faces:**
- LLM training crawlers consuming 20-100% of weekly operations time, causing dozens of outages per week
- Email workflow has genuine onboarding friction for developers trained on GitHub
- Small user base

**Prior art confidence:** High for the simplicity/performance thesis. Source: sourcehut.org, drewdevault.com.

### Gitea/Forgejo

**What it does differently:**
- Full-featured forge in a single Go binary
- Deployable in 60 seconds on a $5 VPS
- GitHub-compatible UX (familiar to migrators)
- Gitea Actions for CI (compatible with GitHub Actions format)

**Problems it faces:**
- Inherits GitHub's complexity by design (it's a clone)
- Forgejo fork created governance uncertainty
- Zig chose Codeberg (hosted Forgejo) over GitHub, proving the model works for real projects

**Prior art confidence:** High. Gitea/Forgejo is the existence proof for single-binary self-hosted forges. Source: ubos.tech, geeky-gadgets.com.

### Radicle

**What it does differently:**
- Peer-to-peer, no central server
- Git-based (extensions for code review)
- Users control their own data
- Censorship resistant, offline-first

**Problems it faces:**
- Steep learning curve
- Web UI came late
- Small community
- Reached 1.0 in March 2024, still early

**Prior art confidence:** Low-Medium. The p2p model works but has not achieved significant adoption. Source: radicle.xyz.

### ForgeFed (Federation Protocol)

**What it does differently:**
- ActivityPub extension for forge federation
- Users on different forges can interact (open issues, submit PRs across instances)
- Forgejo is implementing federation
- Funded by EU Next Generation Internet program (NLnet)

**Problems it faces:**
- Still in development
- Federation adds complexity
- No proven large-scale deployment yet

**Prior art confidence:** Low. Promising concept, unproven at scale. Source: forgefed.org, codeberg.org/ForgeFed.

---

## Part 5: The Bryan Signal

Bryan's confession -- "I can barely use git and have issues all the time just doing basic things on github" -- is not an edge case. It is the median developer experience, backed by data:

- 52.2% of all developers struggle with git at least once a month
- 75.4% of developers who THINK they are confident still struggle monthly
- 87% have hit merge conflicts
- 65% have lost commits
- 55% find rebase error-prone
- 45% have been bitten by a colleague's force push

Bryan is not an outlier. Bryan is the user that Git and GitHub do not serve. giti's design should optimize for Bryan because Bryan IS the typical developer.

### What "barely use git" means as design constraints:

1. **No staging area.** The concept is a proven misfit (Perez De Rosso, MIT). jj already proved it can be eliminated.
2. **No detached HEAD.** Every change must be tracked, always. No invisible garbage collection of work.
3. **No force push.** History should be append-only. If you made a mistake, the fix is a new change, not history rewriting.
4. **No rebase.** Or if rebase exists, undo must be trivial and obvious.
5. **One merge strategy.** Not configurable per-repo. One way to combine work. (Casey Pattern 3.)
6. **Conflicts as data, not text puzzles.** Pijul and jj both demonstrate this. Conflicts are a data structure, not `<<<<<<<` markers.
7. **Undo everything.** jj's undo is the gold standard. Every operation is reversible.
8. **No command that silently destroys data.** Every destructive operation requires explicit confirmation and has a recovery path.

---

## Part 6: What Compiler-Integrated Version Control Could Look Like

**No prior art exists for VCS built into a programming language's compiler.** Search for "version control built into programming language" and "compiler-integrated VCS" returned zero relevant results. This is genuinely novel territory.

### Approach A: giti as External Tool (Standard Model)

giti is a separate platform that happens to understand scrml. The compiler has no knowledge of version control. Developers use git (or giti's VCS) separately from the compiler, as with every existing language.

**scrml example (no VCS integration):**
```scrml
<program>
  ${ import { Button } from './components/button.scrml' }
  <Button label="Click me" />
</program>
```
The compiler compiles. The developer separately commits, pushes, reviews. No interaction.

**Gains:** Separation of concerns. Compiler stays simple. Standard workflow.
**Loses:** No compiler awareness of history, no type-aware diffs, no change tracking at the language level.

### Approach B: Compiler-Aware VCS (Typed Diffs)

The scrml compiler can read version history and produce typed diffs. When a PR changes a component's props from `< Button label:string />` to `< Button label:string variant:.Primary|.Secondary />`, the platform shows not just the text diff but the type diff: "Button gained a new required prop `variant` of type `.Primary|.Secondary`. 3 downstream usages will break."

**scrml example (type-aware diff in giti PR view):**
```scrml
// giti renders this as a typed change summary:
//
// < Button>
//   UNCHANGED: label : string
//   ADDED:     variant : .Primary | .Secondary   [REQUIRED]
//
// Impact: 3 files import Button
//   - pages/home.scrml (line 14) -- WILL BREAK: missing variant
//   - pages/about.scrml (line 8) -- WILL BREAK: missing variant  
//   - components/nav.scrml (line 22) -- WILL BREAK: missing variant
```

**Gains:** The platform understands code at the semantic level, not just text level. Reviews become more useful. Breaking changes are caught before merge.
**Loses:** Requires the compiler to expose type information APIs for the platform to consume. Compiler complexity increases.

### Approach C: Language-Level Change Tracking

The language itself has primitives for expressing changes. A scrml file can reference its own history. The compiler tracks what changed between versions and exposes that as a queryable data structure.

**scrml example (hypothetical -- speculative syntax):**
```scrml
<program>
  // The compiler knows this component's history
  // State types carry version metadata
  < Todo>
    title: string
    done: boolean
    // Added in version a3f7b2c:
    priority: .Low | .Medium | .High
  </ Todo>

  // The platform can query: "what changed since last release?"
  // The compiler answers: "Todo gained priority field"
</program>
```

**Gains:** Version control is a language concept, not an external tool. Unprecedented level of integration.
**Loses:** Massive compiler complexity. No prior art. High risk of over-engineering. Conflates two separate concerns.

### Approach D: giti Uses scrml State Types for Its Own Data Model (Approved Direction)

The giti v1 debate already approved this direction: PRs, reviews, issues, commits are scrml state types. The VCS data model is expressed in scrml's type system.

**scrml example (giti's own data model):**
```scrml
< PullRequest>
  id: number
  title: string
  body: string
  author: string
  status: .Open | .Merged | .Closed
  base_branch: string
  head_branch: string
  created_at: string
  
  // State machine transitions
  .Open -> .Merged: when approved && checks_pass
  .Open -> .Closed: when author_closes || admin_closes
  .Closed -> .Open: when author_reopens
</ PullRequest>

< Review>
  pr_id: number
  reviewer: string
  status: .Pending | .Approved | .ChangesRequested
  body: string
  
  .Pending -> .Approved: when reviewer_approves
  .Pending -> .ChangesRequested: when reviewer_requests_changes
</ Review>
```

**Gains:** giti's data model IS scrml code. The platform demonstrates the language. State machines enforce valid transitions (a merged PR cannot be merged again). This was the winning insight from the v1 debate.
**Loses:** Still requires git (or a replacement) for actual file versioning underneath. The state types describe the forge's collaboration model, not the VCS itself.

---

## Trade-off Matrix

| Dimension | A: External Tool | B: Typed Diffs | C: Language-Level | D: State Types (Approved) |
|---|---|---|---|---|
| Developer ergonomics | Standard | High (better reviews) | Unknown (novel) | High (typed forge) |
| Compiler complexity | None | Medium (type export API) | Very High | None (forge consumes types) |
| Spec clarity | N/A | Needs API spec | Needs new concepts | Uses existing state types |
| Consistency with scrml | Low | Medium | High (but speculative) | High |
| Prior art confidence | Very High (every language) | Low (partial in Roslyn) | None | Medium (debate-approved) |
| Time to ship | Fastest | Medium | Slowest | Medium |
| Bryan's pain points solved | 0 (git unchanged) | Some (better diffs) | Speculative | Some (typed workflows) |

---

## Prior Art Table

| System | Problem Solved | Their Approach | Result |
|---|---|---|---|
| **Jujutsu (jj)** | Git's staging area, detached HEAD, conflict UX | Working copy = commit, conflicts as data, undo everything | Growing adoption, pre-1.0, Google-backed |
| **Pijul** | Merge complexity, conflict resolution | Category theory (pushouts), commutative patches | Mathematically elegant, near-zero adoption |
| **Fossil** | Scattered tools (VCS + tickets + wiki) | Single binary, all-in-one, SQLite storage | Works well for SQLite project, small community |
| **Sapling** | Monorepo scale, stacked diffs | Explicit stack commands, sub-second dev loop | Proven at Meta scale, limited outside adoption |
| **cmirror** | VCS is overkill for file sync | ~1000 lines, single file, one purpose | Proves radical simplicity works for specific cases |
| **SourceHut** | Platform bloat, speed, privacy | Sub-10KB pages, email patches, no JS | Devoted niche, onboarding friction, crawler attacks |
| **Gitea/Forgejo** | Self-hosted GitHub alternative | Single Go binary, GitHub-compatible UX | Zig moved to Codeberg (Forgejo). Proven model. |
| **Radicle** | Centralization, censorship | P2P, Git-based, no central server | 1.0 shipped 2024, small community |
| **ForgeFed** | Forge lock-in | ActivityPub federation protocol | In development, Forgejo implementing |
| **Gitless** | Git's conceptual model failures | Eliminated staging, stash, assumed-unchanged | User studies showed improvement, academic only |
| **GitHub** | Code hosting, collaboration | Feature-everything model | 100M+ repos, 106 incidents in 2024, projects leaving |

---

## Dev Agent Signal

No dev agents were polled in this round. This deep dive is a research foundation. Dev agent polls should be run as part of the sub-deep-dives that follow, specifically:

- **VCS model poll:** "Should giti use git underneath, build its own VCS, or use jj's model?"
- **Merge strategy poll:** "If giti supports exactly one merge strategy, which one?"
- **PR model poll:** "Should giti have PRs, email patches, stacked diffs, or something else?"

These polls should be run with the 14 dev agents once the sub-deep-dives are prepared, with this document as context.

---

## Open Questions

1. **Does giti use git underneath or build its own VCS?** Git is universal but carries all the UX problems documented above. jj is Git-compatible but eliminates most UX problems. Building a new VCS is the highest-risk option. This is the single most consequential decision and needs its own sub-deep-dive.

2. **What is giti's collaboration primitive?** PRs? Email patches? Stacked diffs? Something else? The Casey expert argues for the simplest primitive. The stacked diffs model (Sapling, Graphite) is gaining traction in industry. This needs a debate.

3. **How does giti handle conflicts?** Text markers (git), data structures (jj/Pijul), or something scrml-native (e.g., the compiler resolves conflicts using type information)? This needs a sub-deep-dive.

4. **What is the "5-function" model for Bryan's use cases?** The Casey debate result referenced a 5-function model. What are those 5 functions? What does Bryan actually need to do day-to-day? The answer should come from observing Bryan's actual workflow, not from theoretical analysis.

5. **Should giti federate?** ForgeFed/ActivityPub federation is in development. Forgejo is implementing it. Should giti support federation from v1, add it later, or never? This affects architecture.

6. **What does "typed version control" actually mean at the implementation level?** Approach B (typed diffs) and D (state types for forge model) are different things. Can they coexist? What compiler APIs are needed? This is a sub-deep-dive for after the VCS model decision.

7. **How does giti relate to the transformation registry?** The living compiler concept requires a transformation registry. Is this part of giti or separate? The git-e-platform-2026-03-30 deep dive assumed it was part of giti (Tier 3 features). This needs confirmation.

---

## Recommendation for Debate

**Sub-deep-dives needed before debate:**
1. **VCS Model:** git underneath vs jj underneath vs custom VCS -- this is the foundational decision
2. **Collaboration Primitive:** PRs vs stacked diffs vs email patches vs something new
3. **Conflict Resolution:** text markers vs structured data vs compiler-assisted

**Approaches worth debating (after sub-deep-dives):**
- Casey/Handmade (minimal, 5-function, single binary) vs Fossil (integrated all-in-one) -- already debated, Casey won, but the sub-questions above remain
- jj-based VCS vs git-based VCS -- the UX data strongly favors jj's model, but the ecosystem/compatibility question is real
- PR model vs stacked diffs model -- industry is moving toward stacked diffs (Graphite, Sapling), but the Casey position would argue for email patches

**Approaches that can be eliminated:**
- **Building a Pijul-style VCS from scratch:** The theory is elegant but Pijul's near-zero adoption proves technical superiority is insufficient. The math is right; the ecosystem is wrong.
- **Radicle-style P2P:** Bryan needs a web platform he can use today, not a decentralized protocol. P2P can be added later if needed.
- **GitHub feature parity:** giti should not try to match GitHub's feature surface. The Casey position (already approved via debate) is correct: solve the actual problem.

**Suggested debate framing:** "Given that 52% of developers struggle with git monthly and the platform creator can barely use it, should giti use jj's model underneath (proven UX improvements, Git-compatible) or build a radically simple custom VCS (Casey philosophy, maximum control, highest risk)?"

**Suggested participants:**
- casey-muratori-vcs-expert (argues for radical simplicity, custom VCS)
- A jj/Jujutsu expert (to be forged -- argues for jj's proven model)
- fossil-scm expert (if one exists -- argues for integrated all-in-one)
- scrml-dev-rust (Rust ecosystem perspective, jj is written in Rust)
- scrml-dev-go (Go ecosystem perspective, Gitea is written in Go)
- scrml-dev-cs-phd (formal analysis of VCS models, type theory implications)
