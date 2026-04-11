# schema.map.md
# project: giti
# updated: 2026-04-11T00:00:00Z  commit: 3c4a7c3

## TypeScript Types & Interfaces
No .d.ts or TypeScript source files detected. Project is plain JavaScript.

## JSDoc Typedefs  [src/engine/interface.js]

### SaveResult
changeId:    string  — the jj change identifier
description: string  — the save message
files:       string[] — files included in the save

### BranchInfo
name:     string  — bookmark name
changeId: string  — current change ID
active:   boolean — whether this is the current working-copy bookmark

### HistoryEntry
changeId:    string   — jj change identifier (short form used in display)
description: string   — save message / first line
author:      string   — author name
timestamp:   string   — formatted local time string
files:       string[] — files changed (not populated by current engine impl)

## Engine Result Shape  [src/engine/jj-cli.js]
All engine methods return one of:
  { ok: true,  data: <method-specific shape> }
  { ok: false, error: string }

### parseStatus output shape  [src/commands/status.js]
changed:          { kind: "modified"|"added"|"deleted", path: string }[]
conflicts:        string[]   — conflicted file paths
bookmark:         string|null — current bookmark name
hasConflictMessage: boolean  — true if "unresolved conflict" text detected in raw output

## Tags
#giti #map #schema #types #jsdoc #javascript

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
