# First-slice prototype — `.scrml` state-type field-add merge

**Proves:** giti §4.3's canonical case (two devs add disjoint fields to the same state type in the
same file → git conflicts → AST merge combines them) is buildable **today** on shipping scrml tech —
the compiler's `--emit-block-analysis` sidecar, no compiler `--merge` entrypoint. This is the empirical
answer to the shared note's §6 Q2 ("consumer vs compiler entrypoint") for the first slice.

## Run it

```
# base + two sides that each add a disjoint field to `type AppState:struct`:
bun merge-driver.mjs base.scrml sideA.scrml sideB.scrml -o merged.scrml
# → "clean merge: AppState { count, name, theme, locale }"
# then GATE it — the merged file must compile:
bun ../../../../scrml/compiler/src/cli.js compile merged.scrml -o /tmp/out
```

Fixture (`slice/`, regenerable): base `{count, name}`; sideA adds `theme`; sideB adds `locale`.
**git 3-way merge CONFLICTS** on this (both edit the same struct line); the driver produces
`{ count, name, theme, locale }` and it **compiles clean**. The collision negative test
(both sides add `theme`, different types) correctly returns `CONFLICT`, exit 1.

## How it works (consumer path, Approach D)

1. `--emit-block-analysis` on base/A/B → per-block `{id, kind, name, span:{start,end,line,endLine}, reads, writes}`.
2. Entity-match the `type` block by `(kind, name)` across the three versions.
3. Slice each struct's source text via the **byte-precise span**, parse the flat field list.
4. 3-way field merge: base ∪ (A-adds) ∪ (B-adds); collision iff same new field name, different type.
5. Splice the rebuilt struct back into base at a **tight** boundary; the compiler is the gate.

## Two empirical findings for the compiler ask (§7 of the shared note)

1. **block-analysis gives spans, not field-level structure.** The consumer re-parses the struct body
   itself (a tiny flat-struct parser here). Fine for the first slice; but nested types, refinement
   types, and merge type-validation are where the compiler emitting **field-level sub-structure** (or a
   type-diff / `--merge` entrypoint = §4.4 v3) earns its keep. → the minimal ask starts here.
2. **span.end is NOT tight to the entity's `}`** — it extends into trailing trivia (the `\n  <` before
   the next block). flogence's line-based hunk-overlap use never hits this; a splice-merge does (v0.1
   welded `}appState>` until fixed by re-deriving a tight end). A compiler-emitted **tight `bodySpan`**
   would remove the re-derivation. Low-cost, concrete ask.

## LIMITS (deliberately out of the v0 slice — flagged, not handled)

- **Additions only.** Field removals and type-changes on one/both sides → the driver refuses
  (falls through to text merge / flags a semantic conflict). Removal-vs-keep and retype-vs-use are v3
  (§4.4 compiler type-diff) or human.
- **Flat structs only** (no nested braces / inline object types). Nested → needs the compiler's
  sub-structure (finding 1).
- **Single diverged entity.** Multi-entity same-file merges = one driver pass per diverged entity;
  the non-diverged blocks come through unchanged (git already agrees on them).
- **`type X:struct` only.** Enums, functions, reactive cells, components = later slices.
- **Prototype in JS/Bun** (matches flogence's `leasing.ts`); the production merge driver should be
  scrml per giti's 100%-scrml goal — pending the subprocess primitive (see giti's 2026-07-05 scrml ask).
