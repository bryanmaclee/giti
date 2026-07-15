# Slice 2 — `.scrml` enum variant-add merge (on shipped `#6` member-emission)

Enum analog of `../` slice 1 (struct field-add). **Proves:** with oracle-ask #6 delivered
(`--emit-block-analysis` now emits `typeShape` + `members[]` + tight `bodySpan`), the payload-union enum
merge runs **consumer-side with the re-parse layer dropped** — the driver consumes `members[]` directly and
splices each added variant **verbatim** (`source.slice(member.span)`).

Full write-up + the measured #6b boundary: **`../../slice2-enum-merge-and-measured-boundary.md`**.

## Run it

```
# disjoint variant-adds (git text-merge CONFLICTS on these) → driver combines them:
bun merge-driver-enum.mjs base.scrml sideA.scrml sideB.scrml -o /tmp/merged.scrml
# → "clean merge: Ref { Sha, None, FileLine, Tag }"
bun ../../../../../scrml/compiler/src/cli.js compile /tmp/merged.scrml -o /tmp/out   # GATE: must compile

# collision negative (both add Tag, different arg-tuple) → CONFLICT, exit 1:
bun merge-driver-enum.mjs base.scrml sideA-collide.scrml sideB-collide.scrml
```

## Files
- `base.scrml` / `sideA.scrml` / `sideB.scrml` — disjoint variant-add fixture (`Sha`,`None` + `FileLine` / `Tag`).
- `sideA-collide.scrml` / `sideB-collide.scrml` — same-name/different-arg collision negative test.
- `boundary/` — the measured-boundary fixtures: `base2` (uses `.Sha`), `rename-dangling` (compiler `E-TYPE-063`),
  `rename-clean` (compiles). Shows member-emission can't tell a safe rename from a use-breaking one — the #6b cut.
- `merge-driver-enum.mjs` — the driver (no re-parse; splice-one-member verbatim).

## Gate
The merged output must **compile via the scrml CLI directly** (not `bun test`, not `giti land`) — same as slice 1.
