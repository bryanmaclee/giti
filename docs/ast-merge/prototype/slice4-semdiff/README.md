# Slice 4 — compiler-validated merge (§4.4 v3, the #6b `semdiff` gate)

Slices 1–3 are the **sound-conservative** consumer ceiling: they refuse every glue change and
every removal/retype, so everything they accept is already type-safe — which is exactly why the
S18 measure found a pure structural merger needs only `#6` member-emission, never `#6b`.

**Slice 4 loosens that ceiling and shows why `#6b` is the primitive that makes the loosening
safe.** It accepts DISJOINT glue edits (a per-segment 3-way combine — the disjoint-block insight
applied to use-sites), then validates the candidate `M` with `scrml semdiff base M --json`. The
`diagnostics.added` field (errors in `M` that neither base nor either side had) is giti-spec
**§4.4 v3 verbatim** — "type errors introduced by the merge, not pre-existing."

## Run it

```
# CLEAN — A renames Ref.Sha->Digest (+ its use); B edits a disjoint segment safely:
bun merge-driver-semdiff.mjs base.scrml sideA.scrml sideB-clean.scrml -o /tmp/M.scrml
#   structural merge combines Ref:A, glue#1:A, glue#2:B
#   -> ✓ ACCEPT-WITH-REVIEW (semdiff: behavioral, compiles)          [exit 1]

# DANGLING — same, but B reintroduces a `.Sha` use of the OLD name in the disjoint segment:
bun merge-driver-semdiff.mjs base.scrml sideA.scrml sideB-dangling.scrml -o /tmp/M.scrml
#   structural merge combines the same regions -> candidate M has `.Sha` vs Ref{Digest}
#   -> ✗ SEMANTIC CONFLICT: E-TYPE-063 `.Sha` is not a declared variant   [exit 2]
```

## The measured value (vs the two neighbors)

| approach | CLEAN merge | DANGLING merge |
|---|---|---|
| **git diff3** (`git merge-file`) | auto-merges | **auto-merges SILENTLY → ships a file that fails `E-TYPE-063`** |
| **slice-3** (strict glue guard) | **falls through (blunt — refuses a safe merge)** | falls through |
| **slice-4** (structural + semdiff gate) | **✓ accepts** | **✗ catches `E-TYPE-063`, refuses** |

slice-4 is strictly better than both: it catches the semantic break git ships silently, and
accepts the safe merge slice-3 bluntly refuses. That is the "blunt-or-blind → classified-precise"
upgrade the S18 measured boundary predicted — now demonstrated on real `.scrml` with the landed
`#6b` primitive (`scrml semdiff`, scrml `780e4342`).

## How it works
- **Structural merge** = slice-3 entity logic (types resolved by who-changed; same-type-both →
  member-merge) + a **per-segment glue merge** (disjoint glue segments combine; a both-sides edit
  of one segment → structural conflict). Reassembled by interleaving resolved glue + resolved
  entities: `g[0] + ent[0] + g[1] + ent[1] + … + g[N]`.
- **Validation gate:** write `M`, run `scrml semdiff base M --json`. `diagnostics.added` non-empty
  → SEMANTIC CONFLICT (surface the exact compiler messages). Else `verdict:cosmetic` → auto-accept;
  `verdict:behavioral` (compiles) → accept-with-review.
- Exit: `0` auto-accept · `1` accept-with-review · `2` semantic-conflict · `3` structural conflict.

## Limits
- The per-segment glue merge combines DISJOINT segments; a both-sides edit of one segment is a
  (sound) structural conflict, not a line-level 3-way. A production driver would run a real diff3
  on same-segment edits, then the same semdiff gate — the gate is the load-bearing part.
- The gate keys on `diagnostics.added` (merge-introduced errors). semdiff's P0 axis attribution
  (`source` vs `use-site`) is advisory here; the accept/refuse decision rides the introduced-error
  set + `verdict`, which is sound.
- Prototype in JS/Bun (shells to `scrml semdiff`); the production driver is scrml, pending the
  subprocess primitive (giti's 2026-07-05 scrml ask).
