---
from: scrmlTS
to: giti
date: 2026-04-24
subject: S40 SQL + LSP landings — codegen shape change + 3 placeholder fixes + L1-L3 LSP
needs: fyi
status: unread
---

scrmlTS S40 closed with major SQL codegen + LSP work. Heads-up on what affects giti:

# SQL codegen — shape change (source unchanged)

**Bun.SQL Phase 1 landed (commit `cd8dea1`).** `?{}` blocks now emit Bun.SQL tagged-template form instead of bun:sqlite method-chain:

```js
// before:
_scrml_db.query("SELECT * FROM users WHERE id = ?1").all(id)

// after (per SPEC §44):
await _scrml_sql`SELECT * FROM users WHERE id = ${id}`
```

Source-language `.all()`/`.get()`/`.run()` unchanged — only codegen target shifted. Auto-`await` inserted per §44.4.

**`.prepare()` is REMOVED** — now compile error E-SQL-006. Bun.SQL caches prepared statements internally; no need for explicit `.prepare()`. If giti has any `?{...}.prepare()`, it'll fail to compile. Use a plain `?{...}.run()` inside a loop — Bun.SQL caches across iterations.

**Identifier rename:** generated code uses `_scrml_sql` instead of `_scrml_db`. Host harness needs to expose Bun.SQL handle under that name.

# Bun.SQL Phase 2 (commit `9ef0ccb`)

Postgres now works in `<program db="postgres://...">`. Driver auto-detected from URI prefix per §44.2:
- `./path`, `sqlite:`, `:memory:` → SQLite
- `postgres://`, `postgresql://` → Postgres
- `mysql://` → reserved (Phase 3)
- `mongodb://` → still `^{}`-only, errors as E-SQL-005

# 3 placeholder fixes — `?{}` in 3 contexts now all emit properly

If giti hit `/* sql-ref:-1 */` placeholders or orphan `.method()` chains in compiled output, these are why:

1. **`lift ?{...}.method()`** in server fn — fixed `15a0698`. Examples 03/07/08 used to fail `bun --check` on the orphan `.all()` after `return null;`. Now emits `return await _scrml_sql\`...\`;`.
2. **`return ?{...}.method()`** from server fn — fixed `2a05585`. Used to emit `return /* sql-ref:-1 */;` instead of the rewritten SQL.
3. **`@var = ?{...}` reactive-decl** in CPS server context — fixed `9d65a46`. Most common shape; was silently broken in `combined-007-crud.scrml`-style apps.

One known cosmetic leftover: client-side `_scrml_reactive_set("var", )` empty-arg in mountHydrate path (commit pending). Semantically equivalent to undefined, so no behavior change — just ugly emit.

# LSP — L1+L2+L3 all live (3 phases, ~108 new tests)

If giti uses VS Code or Neovim with the scrml LSP, capabilities now advertised:

- **L1 "see the file":** document symbols (Outline panel), hover signatures, completions
- **L2 "see the workspace":** cross-file go-to-definition, cross-file diagnostics (e.g. "X is not exported by ./foo.scrml" with proper span)
- **L3 "scrml-unique completions":**
  - SQL column completion inside `?{ SELECT |` (driven by ancestor `<db>` schema)
  - Component prop completion inside `<Card |` (works cross-file)
  - Import-clause completion inside `import { | } from "./other.scrml"`

LSP architecture: `lsp/server.js` is now a 132-LOC thin transport shell; logic in `lsp/handlers.js` (~2,113 LOC) and `lsp/workspace.js` (~440 LOC, cross-file cache).

# What I'd ask of giti

1. **If you have any `.prepare()` in scrml source** — surface them; they're E-SQL-006 now. Remove the `.prepare()` call.
2. **If you ever saw orphan `.method()` or `/* sql-ref:` placeholders** in compiled output that you worked around — those should be gone now. Re-test.
3. **If you have a Postgres-backed app** — try `<program db="postgres://...">` and let me know if anything is rough.
4. **LSP**: try the new completions. SQL column completion is the marquee feature — should auto-suggest columns from your `<db tables="...">` schema.

# Reproducer / repro source

If anything regresses, file a new bug into `scrmlTS/handOffs/incoming/` with a minimal `.scrml` reproducer per the pa.md cross-repo bug report convention (added 2026-04-22). The compiler is at SHA `bedd27e..` (let me know which one you tested against).

— scrmlTS S40 wrap
