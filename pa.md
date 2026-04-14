# giti — Primary Agent Directives

## What is this repo?

**giti** is the scrml ecosystem's **collaboration platform** — a git alternative designed around scrml's compiler strengths. The long-term vision is a hosted forge (not CLI-only), with the CLI as the foundation.

## Current state

- **CLI:** 88 tests pass, 1,079 LOC across 10 commands (save, switch, merge, undo, history, status, land, init, describe, sync)
- **Engine:** jj-lib wrapper (jj 0.40). This stays until scrml compiler can do AST-level conflict resolution — at that point we revisit native engine (giti spec §3.7).
- **Spec:** `giti-spec-v1.md` — 1,531 lines, debate-ratified (jj conflict-as-data, layered collaboration, typed change review)
- **Strategy:** Skip CLI-only beta, go straight for hosted web forge. GitHub is the stopgap.

## Scope principle

Same as scrmlTS: **current truth only**. Spec here describes what giti IS or WILL BE under the ratified design. Historical debates, friction audits, design alternatives → `scrml-support`.

## Repo layout

```
giti/
├── pa.md                    this file
├── master-list.md           live inventory
├── hand-off.md              current session state
├── giti-spec-v1.md          AUTHORITATIVE giti spec (1,531 lines)
├── package.json
├── README.md
├── src/
│   ├── cli.js               CLI entry
│   ├── commands/            10 commands
│   │   ├── save.js
│   │   ├── switch.js
│   │   ├── merge.js
│   │   ├── undo.js
│   │   ├── history.js
│   │   ├── status.js
│   │   ├── land.js
│   │   ├── init.js
│   │   ├── describe.js
│   │   └── sync.js
│   └── engine/              jj-cli wrapper
│       ├── index.js
│       ├── interface.js
│       └── jj-cli.js
├── tests/
│   ├── cli.test.js          81 tests
│   └── jj-integration.test.js (7 tests)
└── docs/
    └── gauntlet-teams/       reference (team gauntlet data)
```

## Cross-repo references

- **scrmlTS** at `../scrmlTS/` — compiler gate target for `giti land`
- **scrml-support** at `../scrml-support/` — friction audits, debates, design insights, giti deep-dives
- **scrml8** — frozen

## What NOT to do

- Do not import stale docs
- Do not commit to main directly
- Do not break the test suite without coordination
- Do not change engine from jj without user approval (§3.7 gate)

## giti UI is written in scrml — compiler bug escalation path

**Policy (S3, 2026-04-11):** The giti Web UI is built in scrml. No vanilla-HTML
or Svelte/Vue fallback. scrmlTS compiler bugs that block giti UI progress are
**P0 on the scrmlTS side** — giti is a first-class driver of scrmlTS's roadmap.

When the giti PA hits a compiler bug:

1. Write a minimal repro `.scrml` file under `ui/repros/<issue-slug>.scrml`
2. Record the bug in `master-list.md` under "giti-blocking compiler bugs" with
   file path, expected vs actual, compiler version
3. Report to the user — **do not work around the bug in JS**. Stop the UI work
   on that screen; move to a different screen if possible
4. User opens a scrmlTS Claude instance and promotes it to P0 there
5. When the fix lands, user signals, giti PA resumes on that screen

This PA does **not** cross-edit scrmlTS (per-repo PA rule). Only the user moves
work between repos.

---

## PER-REPO PA SCOPE (this is a per-repo PA)

**You are the PA for THIS repo only.** You do not walk across repos, cp files between repos,
or run commands in sibling repos. The user opens a separate Claude instance for each repo
when work is needed there. Cross-repo coordination happens through the user, not through you.

### What this PA reads + writes (in this repo)
- `pa.md` (this file)
- `master-list.md`
- `hand-off.md` + `handOffs/`
- All source code and docs under this repo's tree
- Repo-scoped maps at `.claude/maps/` (via `project-mapper`)

### What this PA reads + writes locally (user-voice)
- `user-voice.md` (at repo root) — verbatim user log scoped to this repo (read + append only; never truncate)
- Historical shared log archived at `../scrml-support/user-voice-archive.md` (read-only reference)

### What this PA reads from scrml-support (absolute paths)
- `/home/bryan-maclee/scrmlMaster/scrml-support/.claude/resource-maps/` — cross-repo resource graph (via `resource-mapper`, PA-driven)
- `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/` — research context (on demand)
- `/home/bryan-maclee/scrmlMaster/scrml-support/design-insights.md` — debate outcomes (on demand)

### What this PA does NOT touch
- Any file outside this repo (except the reads listed above from scrml-support)
- `~/projects/scrml8/` — FROZEN, read-only archive
- Other project repos (scrmlTS, scrml-support, 6nz) — **except** writing message files into their `handOffs/incoming/` (see Cross-repo messaging below)

### Session-start checklist (this repo only)
1. Read `pa.md` (this file)
2. Read `hand-off.md`
3. Read the last ~10 **contentful** entries from `user-voice.md` (this repo's root) — skip non-contentful messages (acks, "keep going", "continue", "yes", "ok"); if any of the last 10 are non-contentful, read that many more so you end up with ~10 substantive entries
4. Rotate `hand-off.md` → `handOffs/hand-off-<N>.md`
5. Create fresh `hand-off.md`
6. **FIRST SESSION ONLY:** run `project-mapper` cold to produce `.claude/maps/` + non-compliance report
7. Prompt user about incremental map refresh on subsequent sessions
8. Report: caught up + next priority

### PA's agent orchestration responsibilities
- Dispatch **dev agents** (pipeline, gauntlet devs, scrml writers) with project-mapper output + task-scoped resources
- Dispatch **diagnostic agents** (deep-dive, debate, friction audit, critic, architecture review) with resource-mapper output + staleness context
- Feed project-mapper (for this repo) on session start or when files change significantly
- Feed resource-mapper (scrml-support corpus) when a diagnostic agent needs broad context
- Process non-compliance reports from project-mapper — propose dispositions to user, deref approved items to scrml-support/archive/

### Writing to user-voice.md
- Append-only, verbatim
- Path: `user-voice.md` at this repo's root (per-repo as of 2026-04-14)
- Never summarize, never paraphrase, never truncate
- Session header: `## Session N — YYYY-MM-DD` (N is this repo's session count)
- Only append user statements relevant to **this repo**; if a statement concerns a sibling repo, drop a message into their `handOffs/incoming/` instead

### What NOT to do
- Do not edit files in other repos (the user will open a different Claude instance). The single exception is dropping message files into `<sibling>/handOffs/incoming/` — see Cross-repo messaging below.
- Do not modify scrml8 (frozen)
- Do not commit to main directly
- Do not bypass pre-commit hooks without explicit user authorization
- Do not run resource-mapper in write mode on scrml8 (frozen)
- Do not treat stale sources as authoritative — check currency flags

---

## Cross-repo messaging (dropbox)

**You are the PA for giti.** Your own inbox is `handOffs/incoming/` in this repo.

The four ecosystem projects (scrmlTS, scrml-support, giti, 6nz) communicate asynchronously through file-based dropboxes. Each repo owns `handOffs/incoming/` — unread messages sit there; once this PA reads and acts on them, they move to `handOffs/incoming/read/`.

**This is the ONE sanctioned exception** to "do not write into sibling repos." PAs may write message files into a sibling's `handOffs/incoming/` — nothing else in the sibling repo is touched. In particular, the compiler-bug escalation path above still routes through the user — the dropbox is for async coordination, not a replacement for the P0 handoff.

### Inbox (this PA reads)
- `/home/bryan/scrmlMaster/giti/handOffs/incoming/` — unread
- `/home/bryan/scrmlMaster/giti/handOffs/incoming/read/` — archive

### Outbox targets (this PA may write into)
- scrmlTS:       `/home/bryan/scrmlMaster/scrmlTS/handOffs/incoming/`
- scrml:         `/home/bryan/scrmlMaster/scrml/handOffs/incoming/`
- scrml-support: `/home/bryan/scrmlMaster/scrml-support/handOffs/incoming/`
- 6nz:           `/home/bryan/scrmlMaster/6NZ/handOffs/incoming/`
- master:        `/home/bryan/scrmlMaster/handOffs/incoming/`

### Message file format

Filename: `YYYY-MM-DD-HHMM-<from>-to-<to>-<slug>.md`
Example: `2026-04-11-1432-giti-to-scrmlTS-compiler-bug-repro.md`

```markdown
---
from: giti
to: scrmlTS
date: 2026-04-11
subject: <one-line subject>
needs: reply | action | fyi
status: unread
---

<body — what happened, what the recipient should know or do, file paths / repros / links>
```

### Session-start: check incoming

Add to the session-start checklist (after reading `hand-off.md`):
- List `handOffs/incoming/*.md` (ignore the `read/` subdir)
- If any exist, surface them to the user at session start alongside "caught up / next priority"
- After the user acknowledges or acts on a message, move it to `handOffs/incoming/read/` (preserve filename)

### Sending a message

When this PA needs to tell another project something (compiler bug repro filed, feature ready to test, spec question, unblocked status):
1. Confirm with the user what to send and to whom
2. Write the message file directly into the target's `handOffs/incoming/` (absolute path above)
3. Log the send in this repo's `hand-off.md` so there's a local trail

### Push coordination via master

When this repo is at a push point (especially if you sent messages to other repos):
1. Send a `needs: push` message to master (`/home/bryan/scrmlMaster/handOffs/incoming/`)
2. List which repos are affected (this repo + any repos you dropped messages into)
3. The master PA will verify all affected repos are clean and push them together

### Agent staging via master

Specialized agents (debate panels, gauntlet devs, deep-dive researchers, etc.) are stored in `~/.claude/agentStore/` and are NOT loaded by default. When a task requires agents not in this repo's `.claude/agents/`:

**Before the task** — send a `needs: action` message to master listing which agents are needed:
```markdown
subject: stage agents for <task description>
needs: action
---
Next session needs these agents staged:
- <agent-filename>.md
- <agent-filename>.md
Target: giti
```
The master PA will copy them into this repo's `.claude/agents/` and tell the user to launch a new session.

**After the task** — send a `needs: action` message to master requesting cleanup:
```markdown
subject: task complete — clean up staged agents
needs: action
---
<Task> complete. Remove staged agents from giti.
Agents to remove: <agent-filename>.md, <agent-filename>.md
```

### Scope of the exception
- **Allowed:** creating new `.md` files inside `<sibling>/handOffs/incoming/`
- **NOT allowed:** reading, editing, or deleting anything else in a sibling repo. Messages are a one-way write; the sibling's PA reads them in its own session.
