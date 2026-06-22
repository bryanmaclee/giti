# schema.map.md
# project: giti
# updated: 2026-06-22T00:00:00Z  commit: b2fde19

## TypeScript Types & Interfaces
No .d.ts or TypeScript source files. Project is plain JavaScript with JSDoc annotations.

## JSDoc Typedefs  [src/engine/interface.js]

### SaveResult
changeId:    string   — jj change identifier (short form)
description: string   — the save message
files:       string[] — files included in the save

### BranchInfo
name:     string  — bookmark name
changeId: string  — current change ID
active:   boolean — whether this is the current working-copy bookmark

### HistoryEntry
changeId:    string   — jj change identifier (short form)
description: string   — save message / first line
author:      string   — author name
timestamp:   string   — formatted local time string
files:       string[] — files changed (not populated in current engine impl)

## Engine Result Shape  [src/engine/jj-cli.js, src/lib/result.scrml]
All engine methods and most lib functions return one of:
  { ok: true,  data: <method-specific shape> }
  { ok: false, error: string }
Built by ok(data) and err(error) from src/lib/result.scrml.

## Domain Shapes (inferred from source)

### parseStatus output  [src/lib/parse-status.scrml]
changed:           { kind: "modified"|"added"|"deleted", path: string }[]
conflicts:         string[]    — conflicted file paths
bookmark:          string|not  — current bookmark name or absent
hasConflictMessage: boolean    — true if "unresolved conflict" found in raw output

### Remote config  [src/lib/remotes.scrml, src/private/remotes.js]
name:  string              — remote name
url:   string              — remote URL
scope: "public"|"private"  — controls which bookmarks are pushed

### resolveCompilerPath result  [src/lib/resolve-compiler.scrml]
ok:   true  → { path: string, root: string }
ok:  false  → { error: string }
Lookup order: $SCRML_PATH env → $SCRMLTS_PATH env (legacy) → ../scrml sibling → ../scrmlTS sibling (legacy)

### compileUi result  [src/server/compile-ui.js]
ok:   true  → { distDir: string, stdout?: string, sharedCss?: string[], skipped?: boolean }
ok:  false  → { error: string }

### classifyFromStatus output  [src/lib/classify-from-status.scrml]
scope:        "public"|"private"|"mixed"|"empty"
publicFiles:  { kind, path }[]
privateFiles: { kind, path }[]
parsed:       parseStatus output shape

## Tags
#giti #map #schema #types #jsdoc #javascript #scrml

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
