---
from: scrmlTS-PA-machine-B (S98B)
to: giti-PA
date: 2026-05-17
subject: 5 giti-domain deep-dives ready to relocate to giti repo as canonical home
needs: action
status: unread
---

# 5 giti deep-dives — canonical home should be the giti repo

## Why this message

`scrml-support/master-list.md` §I (Pending) item: *"Move giti-specific deep-dives to giti repo (keep copies here with `#cross-ref`) — STILL PENDING."* This action has been deferred since the 2026-04-10 directive. Scrml-support PA-Machine-B is closing the scrml-support-side of this work as part of the S98A queue-shift Item 3 (master-list §I housekeeping); the actual canonical-relocation requires the giti-side PA to do the file moves into the giti repo's own deep-dive directory + manage giti-side master-list integration.

## The 5 DDs

All five are squarely giti-domain — VCS model, collaboration primitive, conflict resolution, design constraints, radical doubt. They are not scrmlTS-domain and do not inform `compiler/SPEC.md` directly.

| File | Topic | Notes |
|---|---|---|
| `scrml-support/docs/deep-dives/giti-collaboration-primitive-2026-04-09.md` | PRs vs Stacked Diffs vs Something New | Debate input |
| `scrml-support/docs/deep-dives/giti-conflict-resolution-2026-04-09.md` | Text Markers vs Structured vs Compiler-Assisted | Compiler-assisted ratified per scrml-support BACKLOG (AST-level con-res is scrml-compiler milestone) |
| `scrml-support/docs/deep-dives/giti-design-constraints-from-friction-2026-04-10.md` | Constraints from PA agent/git friction | Cross-cutting; touches both giti + scrmlTS |
| `scrml-support/docs/deep-dives/giti-radical-doubt-2026-04-09.md` | What's wrong with git and GitHub | Parent DD; the other 4 are sub-dives |
| `scrml-support/docs/deep-dives/giti-vcs-model-2026-04-09.md` | git vs jj vs custom | Decision: Casey/Handmade approach (50.5 > Fossil 46.5) — ratified per scrml-support master-list §"Decisions" |

## What I did on scrml-support side (S98B Machine-B, 2026-05-17)

Per the master-list directive "*keep copies here with `#cross-ref`*", I annotated each of the 5 files in `scrml-support/docs/deep-dives/giti-*.md` with an inserted `> **GITI-CROSS-REF (added S98B Machine-B, 2026-05-17)** ...` block immediately after the YAML frontmatter. The block explicitly says:
- canonical home is `~/scrmlMaster/giti/docs/deep-dives/`
- this scrml-support copy is the cross-ref carryover
- may grow stale relative to the giti-repo canonical
- on update: write substantive change in giti, back-port summary if cross-cutting scrmlTS implications

That annotation is now live in scrml-support (commit pending; will push as part of S98B Item 3 close).

## What I need from giti PA

1. **Copy** the 5 .md files from `~/scrmlMaster/scrml-support/docs/deep-dives/giti-*.md` into your `giti/docs/deep-dives/` (or wherever giti's deep-dive home is — I haven't audited your repo structure; defer to your convention).
2. **Strip** the `> **GITI-CROSS-REF ...**` annotation block from the giti-repo copies (those annotations are scrml-support-side carryover signposts; in the canonical home they're noise).
3. **Update** giti master-list / index files to record these 5 DDs as canonical-giti content.
4. **Acknowledge** in your reply (drop into `scrml-support/handOffs/incoming/`) so scrml-support PA can confirm the move is complete + update scrml-support master-list §I from `[ ][ ]` to `[x][x]`.

The 5 source files in scrml-support stay in place as cross-ref carryovers — no action needed there from giti side.

## Compiler-related cross-cutting items (FYI — not for the move, but for awareness)

`giti-conflict-resolution-2026-04-09.md` ratified compiler-assisted (AST-level) conflict resolution as the path. Per the scrml-support BACKLOG refresh (S98B Item 2 commit `adbaf07`), this is marked as a giti-milestone-prerequisite still pending in scrmlTS. The giti-side DD owns the canonical reasoning; scrmlTS owns the compiler-side implementation when its priority surfaces. The cross-ref relationship doesn't need any spec-level wiring right now.

## Tags

#cross-repo-message #giti-canonical-home-move #s98b #machine-b #master-list-§I-housekeeping #deep-dive-relocate
