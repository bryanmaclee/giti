# Slice 3 — multi-entity same-file merge (the consumer-side ceiling)

The flogence disjoint-block case: side A edits one entity, side B edits a **different** entity in the same file.
git text-merge **conflicts** on adjacent-line edits even though the entities are independent; entity-merge
combines them. Generalization from #6: structs and enums both emit `members[]`, so slice-1 field-merge and
slice-2 variant-merge are now the **same** `mergeMembers` path, composed inside the multi-entity frame.

Full write-up: **`../../slice2-enum-merge-and-measured-boundary.md`** §2b.

## Run it

```
# disjoint entities (A→AppState field, B→Ref variant) — git CONFLICTS; driver combines:
bun merge-driver-multi.mjs base.scrml sideA.scrml sideB.scrml -o /tmp/m.scrml
# → "clean merge — resolved: AppState:A, Ref:B, label:unchanged"
bun ../../../../../scrml/compiler/src/cli.js compile /tmp/m.scrml -o /tmp/out   # GATE: must compile
```

## How it works
- base = frame. Each top-level entity resolved by who-changed (base/A/B), whole-entity splice
  `[span.start, bodySpan.end)`, reassembled **back-to-front** so splices don't invalidate earlier offsets.
- same-entity-both-sides → recurse into `mergeMembers` (unified struct/enum add-merge).
- **glue guard:** non-entity regions (markup/whitespace/cells) must agree across base/A/B, else fall through —
  a markup edit is never silently dropped (sound).

## Limits (out of slice → fall through)
Entity removal/deletion on a side; a change to glue on a side; both-sides change to a non-type entity (two fns).
Renames / retypes / behavioral changes = the measured **#6b boundary** (see the write-up §3).
