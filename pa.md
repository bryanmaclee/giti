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
