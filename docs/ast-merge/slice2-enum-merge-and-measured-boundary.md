# Slice 2 — enum variant-add merge + the measured #6b boundary (giti-side)

**Status:** BUILT + gate-verified (giti PA, S18 · 2026-07-15 · scrml `7d5fda26`). Follows the
`v0-approach-d-shared-note.md` first slice (struct field-add). **Method:** prototype-first, dogfood on real
`.scrml`, return with the *measured* boundary — the same discipline flogence applied to `semdiff.ts`.

> **Why this exists.** The flogence↔giti #6b question ("does semantic-diff/classification serve giti's *merge*,
> or only review?") deserves a measured answer, not an analytical one. This slice builds the enum merge on the
> **shipped** `#6` surface and then pushes it until it breaks — locating the exact point where consumer-side
> (member-emission) stops being sound and needs the compiler's `#6b` classification. That point is giti's
> grounding for the co-sign.

---

## 1. #6 delivery — verified on the real sidecar (not the ask's proposed shape)

Oracle ask #6 (member emission) shipped. `--emit-block-analysis` on a payload-union enum
(`slice2-enum/base.scrml`, `type Ref:enum = { Sha(hash: string), None }`) emits, verbatim:

```jsonc
{ "kind": "type", "name": "Ref", "typeShape": "enum",
  "span": {"start":12,"end":68,...}, "bodySpan": {"start":12,"end":64},   // tight — no trailing trivia
  "members": [
    { "name":"Sha",  "memberKind":"variant", "typeText":"(hash: string)",
      "span":{"start":34,"end":51}, "args":[{"name":"hash","typeText":"string","span":{"start":38,"end":50}}] },
    { "name":"None", "memberKind":"variant", "typeText":"", "span":{"start":56,"end":60}, "args":[] }
  ] }
```

All three sharpenings from the co-sign are present: absolute member/arg spans, full-member spans (splice-one-
member is a pure `slice`), and `typeText` for name+type collision detection. **The slice-1 re-parse layer can
die.**

## 2. Slice 2 — enum variant-add merge, re-parse layer DROPPED

`slice2-enum/merge-driver-enum.mjs` consumes `members[]` directly — no struct/enum grammar re-implementation.
Merge = base variants ∪ A-adds ∪ B-adds, keyed on `{name, typeText}`; each added variant is spliced in
**verbatim** (`sideSource.slice(member.span.start, member.span.end)`).

| test | git text-merge | slice-2 driver | gate |
|---|---|---|---|
| base + A adds `FileLine(path,lineNo)` + B adds `Tag(name)` | **CONFLICT** (3 markers) | `Ref { Sha, None, FileLine, Tag }` | **compiles clean** ✓ |
| both sides add `Tag`, different arg-tuple | conflict | **CONFLICT** — `(name: string) vs (label: int)` | (correct refuse) ✓ |

The collision case is caught by `typeText` alone — flogence sharpening #3 (name-only → name+type) realized on
shipping data. **Slice 2 is the enum analog of slice 1, and it needed nothing from the compiler beyond #6.**

## 2b. Slice 3 — multi-entity same-file merge (the consumer-side ceiling)

`slice3-multi/merge-driver-multi.mjs`. The flogence disjoint-block case: side A edits entity E1, side B edits a
*different* entity E2 in the same file — **git text-merge conflicts on adjacent-line edits** even though the
entities are independent; entity-merge combines them. base = frame; each entity resolved by who-changed
(whole-entity splice `[span.start, bodySpan.end)`, reassembled back-to-front); only a same-entity-both-sides
change recurses into member-merge; non-entity "glue" must agree across base/A/B or it falls through.

| test | git text-merge | slice-3 driver | gate |
|---|---|---|---|
| A adds field to `AppState`, B adds variant to `Ref` (disjoint) | **CONFLICT** | `AppState:A, Ref:B, label:unchanged` | **compiles** ✓ |
| A adds `theme`, B adds `locale` — SAME entity `AppState` | conflict | `AppState:A+B (member-merge)` → `{count,name,theme,locale}` | **compiles** ✓ |
| a side edits the `<p>` markup (glue) | — | **CONFLICT** — "changed non-entity glue" | sound fall-through ✓ |

**The generalization #6 unlocked:** structs and enums both emit `members[]`, so slice-1 field-merge and slice-2
variant-merge are now the **same** `mergeMembers` path — composed here inside the multi-entity frame (case 2).
Slices 1→2→3 are the **complete consumer-side ceiling**: every *structural* merge buildable on shipping tech.
Everything past it is §3.

## 3. The measured boundary — where consumer-side stops being sound

Pushing the driver into the residual classes, on real fixtures (`slice2-enum/boundary/`):

### Below the line — consumer-side (member-emission #6) is SOUND and sufficient
These are **structural**: the name-set + `typeText` from `members[]` fully determine the outcome.
- **disjoint variant-add** → auto-combine (slice 2).
- **same-name / same-`typeText` add on both sides** → auto-resolve (identical add is not a conflict).
- **same-name / different-`typeText` add** → sound conflict.

### At/above the line — consumer-side is BLUNT-or-BLIND; needs #6b compiler classification
- **rename ↔ use** (the sharp case). Fixtures `boundary/rename-{dangling,clean}.scrml`:
  - `rename-dangling` (type `Sha`→`Digest`, a `.Sha` use left behind) → **compiler `E-TYPE-063: .Sha is not a
    declared variant of enum Ref. Known variants: .Digest, .None`** (exit 1).
  - `rename-clean` (type + use both updated) → compiles.
  - **At the type-member level these two are IDENTICAL** — both read as `Sha` removed, `Digest` added.
    `members[]` carries no use-site / reachability, so the consumer driver **cannot distinguish "safe to
    auto-apply" from "breaks a use."** It refuses both (observed: *"variant 'Sha' removed on one side"*) —
    losing the auto-mergeable clean rename — or, if it naively applied, silently ships the dangling break.
    **The separating signal (`E-TYPE-063`) exists only in the compiler.** That is §4.4 v3 / #6b, verbatim.
- **arg-retype of a base variant** (`hash: string` → `hash: bytes` with a dependent use) → consumer sees
  `typeText` differ and refuses (sound-conservative), but **cannot classify** whether the retype is
  downstream-compatible — that's #6b footprint/reachability/type-diff.
- **behavioral change at constant footprint / inside opaque foreign `_={}=` blocks** → member-emission +
  footprint are **blind** (member-set unchanged, footprint unchanged). This is the exact class flogence's
  `semdiff.ts` false-negatived on `fsp-core.scrml` — measured there, blind here too.

## 4. The convergence finding (this is the co-sign grounding)

giti's **merge** and flogence's **review** hit the **same wall, from opposite sides, independently:**

- flogence (review): footprint-approximation misclassifies a real behavioral change as COSMETIC → **unsound for
  auto-land**.
- giti (merge): member-emission can't tell a safe rename from a use-breaking one → **can't auto-resolve the
  residual** without either losing safe merges or shipping silent breaks.

Both failures are the **same missing primitive**: sound *cosmetic-vs-behavioral classification* — "is head's AST,
modulo bound-name alpha-rename, behaviorally equal to base, and if not on which axis (footprint / reachability /
transition Δ)" — computed with full-model knowledge, not set-subtraction over sidecars. Node-matching + the
member splice stay consumer-side (proven here + in slice 1); the **classification** is the one compiler-only cut.

**Two independent consumers crystallizing one additive compiler primitive is the #6 pattern exactly** — which is
why #6b should converge merge+review into a single ask, and why giti's co-sign is grounded, not analytical.
giti's consumer is the **§4.4 v3** layer (validate/classify the merged candidate); giti's **v2** (slice 1 + 2)
needs none of it and ships today on #6.

## 5. Scope / limits (these slices)
- Additions + collision-detect only. Removals, arg-retypes, renames → refused (fall through) — correctly, per §3.
- Multi-entity is BUILT (slice 3), with two guards: entity removal/deletion on a side → out of slice; any change
  to non-entity **glue** (markup/whitespace/cells) on a side → fall through (sound — never silently dropped).
- `type X:struct` (slice 1) + `type X:enum` (slice 2), unified under `members[]` in slice 3. Nested/inline
  payload types + non-type both-side changes (two fns) not exercised.
- Variant ORDER not preserved (adds append before `}`); scrml enum variant order is non-semantic (match by name,
  seed by name) — verified: merged file compiles + is behaviorally identical.
- Prototype in JS/Bun (matches slice 1 / flogence's `leasing.ts`); production driver is scrml, pending the
  subprocess primitive (giti's 2026-07-05 scrml ask).

## 6. Decisions log (delta)
| decision | value | by |
|---|---|---|
| Slice 2 target | `.scrml` enum variant-add merge on shipped `members[]` — ✅ BUILT + gate-verified | giti PA S18 |
| Slice 3 target | multi-entity same-file merge (disjoint + same-entity-both via unified member-merge + glue guard) — ✅ BUILT + gate-verified | giti PA S18 |
| Consumer-side ceiling | slices 1→2→3 = every structural merge on shipping tech; past it is #6b-gated | giti PA S18 |
| #6 delivery | VERIFIED on real sidecar (typeShape + members[] + arg spans + tight bodySpan) | giti PA S18 |
| #6b merge-need | MEASURED — merge needs #6b at the **rename↔use / retype / constant-footprint-behavioral** boundary (§4.4 v3), NOT for v2 structural merge | giti PA S18 |
| Co-sign grounding | merge boundary == review boundary (independent) → converge #6b merge+review | giti PA S18 |
