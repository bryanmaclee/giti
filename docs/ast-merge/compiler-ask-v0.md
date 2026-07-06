# Compiler ask (v0) — two extensions to `--emit-block-analysis` for AST semantic merge

**From:** giti + flogence (co-signed). **To:** scrml. **Channel:** flogence's compiler-as-oracle ledger.
**Status:** v0 draft (giti-sharpened, awaiting flogence co-sign). **Grounding:** two independent prototypes
(giti `docs/ast-merge/prototype/`, flogence `scripts/ast-merge-fieldadd.ts`) — same findings, cross-verified
on scrml @ 59dc5287 (s241). **Converges:** giti's 2026-07-05 solo ask (block-analysis as a VCS merge oracle).

## TL;DR

Two **additive extensions of the shipping `--emit-block-analysis` sidecar** — no new engine, no `--merge`
entrypoint, no full-AST dump. They unblock **entity-level 3-way merge of real-world `.scrml` types**, which
both giti (§4.3 AST semantic merge) and flogence (region-leasing same-file landing) consume.

1. **[PRIMARY] Field-level member emission** — per `type` block, emit its members (record fields / enum
   variants) with per-member spans.
2. **[SECONDARY, low-cost] Tight body span** — a member-list span bounded at the entity's closing token.

## Why (empirical, from the prototypes)

The shipping sidecar emits a `type` block as `{id, kind:"type", name, span, reads, writes, footprintDepth}`.
That is enough to **match** an entity across base/A/B (by `kind`+`name`) — both prototypes do the state-type
field-add merge on it today, and it compiles clean. But it gives **no member-level structure**, so the driver
must **re-parse the type body from the span text itself**. That works for flat record structs, and **breaks
down the moment real types appear**:

- flogence's canonical model is a **payload-union enum**: `type Pointer:enum = { Sha(hash: string) ·
  FileLine(path: string, lineNo: int) · None }`. block-analysis emits it as a clean `type` block ✓ — but its
  members are **variant-constructor arg-tuples**, a *different grammar* from `name: type` fields. A consumer
  re-parser would have to **reimplement scrml's per-shape type grammar** (records vs enums vs refinement) to
  merge each — brittle, duplicative, and it drifts from the compiler's own parse. Real apps carry these types
  on day one. The compiler already has this structure in-AST; **emitting it removes the whole re-parse layer.**

## Ask 1 [PRIMARY] — field-level member emission

Per `type` block, add a `typeShape` + `members` array with per-member spans. Proposed shape (additive; existing
fields unchanged):

```jsonc
{
  "id": "…::Pointer", "kind": "type", "name": "Pointer",
  "span": { "start": …, "end": …, "line": …, "endLine": … },
  "typeShape": "enum",                         // "struct" | "enum" | "refinement"
  "members": [
    { "name": "Sha",      "memberKind": "variant",
      "args": [ { "name": "hash", "typeText": "string", "span": {…} } ], "span": {…} },
    { "name": "FileLine", "memberKind": "variant",
      "args": [ { "name": "path", "typeText": "string", "span": {…} },
                { "name": "lineNo", "typeText": "int", "span": {…} } ], "span": {…} },
    { "name": "None",     "memberKind": "variant", "args": [], "span": {…} }
  ]
}
```

For a record struct, `typeShape:"struct"` and members are `{ name, memberKind:"field", typeText, span }`.
`typeText` is the surface type text (giti/flogence match on it for collision detection: same member name,
different `typeText` → semantic conflict → fall through). Per-member `span` lets the driver splice a single
member without re-parsing siblings. **This is the whole primary ask** — the structure the compiler already
holds, surfaced in the sidecar.

## Ask 2 [SECONDARY, low-cost] — tight body span

block-analysis `span.end` currently extends **past the entity's closing token into trailing trivia** (verified:
a splice over `[span.start, span.end)` welds `}appState>` — the `\n  <` before the next block gets eaten;
giti's prototype re-derives a tight end as a workaround). Add a **`bodySpan: { start, end }`** bounded exactly
at the member-list `{ … }` (no trailing trivia), so a splice boundary is exact without re-derivation. Low-cost
— the compiler knows the exact end node.

## Explicitly NOT asking (scoped-later / out of scope)

- **No `--merge base A B → merged | conflict-list` entrypoint.** The v2 merge ships on the *consumer* path
  (driver assembles the merged file from block-analysis) — both prototypes prove it. The compiler merge
  entrypoint targets the **rename↔use semantic-conflict class** and belongs to **v3 / giti-spec §4.4 compiler
  type-diff** — a separate, later ask.
- **No full-AST dump.** Member structure + spans is sufficient; the driver doesn't need the whole tree.
- **No new engine / no server.** Both items extend the existing pure-CLI sidecar.

## Acceptance

- `--emit-block-analysis` on a file with a record struct AND a payload-union enum emits `typeShape` + `members`
  (with per-member `typeText` + `span`) + a tight `bodySpan` for each `type` block.
- giti's + flogence's field-add/variant-add merge drivers drop their re-parse layer and merge off `members`
  directly; the merged file compiles clean.

## Deferred follow-up (flogence, not this ask)

flogence flagged that one real model (`delta-log.scrml`) currently **fails** block-analysis emission with
`E-CODEGEN-INVALID-LOGIC` — isolated to NOT be the enum (likely residual D, multi-stmt foreign `_{}`). Separate
bug, separate follow-up; noted here so it isn't lost.
