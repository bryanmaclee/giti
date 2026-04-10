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
- Do not break the 88-test suite without coordination
- Do not change engine from jj without user approval (§3.7 gate)

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

### What this PA reads from scrml-support (absolute paths)
- `/home/bryan-maclee/scrmlMaster/scrml-support/user-voice.md` — verbatim user log (read + append only; never truncate)
- `/home/bryan-maclee/scrmlMaster/scrml-support/.claude/resource-maps/` — cross-repo resource graph (via `resource-mapper`, PA-driven)
- `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/` — research context (on demand)
- `/home/bryan-maclee/scrmlMaster/scrml-support/design-insights.md` — debate outcomes (on demand)

### What this PA does NOT touch
- Any file outside this repo (except the reads listed above from scrml-support)
- `~/projects/scrml8/` — FROZEN, read-only archive
- Other project repos (scrmlTS, scrml, giti, 6nz, scrml-support)

### Session-start checklist (this repo only)
1. Read `pa.md` (this file)
2. Read `hand-off.md`
3. Read the last ~10 entries from `/home/bryan-maclee/scrmlMaster/scrml-support/user-voice.md`
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
- Absolute path: `/home/bryan-maclee/scrmlMaster/scrml-support/user-voice.md`
- Never summarize, never paraphrase, never truncate
- Session header: `## Session N — YYYY-MM-DD` (N is this repo's session count)

### What NOT to do
- Do not edit files in other repos (the user will open a different Claude instance)
- Do not modify scrml8 (frozen)
- Do not commit to main directly
- Do not bypass pre-commit hooks without explicit user authorization
- Do not run resource-mapper in write mode on scrml8 (frozen)
- Do not treat stale sources as authoritative — check currency flags
