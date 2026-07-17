# Slice 4 — the #6b `semdiff` gate closes the measured boundary (§4.4 v3, giti-side)

**Status:** BUILT + gate-verified (giti PA, S19 · 2026-07-17 · scrml `01160fb8`, primitive landed
`780e4342` PR #91). Follows `slice2-enum-merge-and-measured-boundary.md` (slices 1–3, the consumer-side
ceiling). **Method:** same as the whole thread — prototype-first, dogfood on real `.scrml`, return with the
*measured* result, not the analytical one.

> **Why this exists.** S18 *measured* the boundary: consumer-side member-emission (`#6`) is sound for every
> structural merge but goes blunt-or-blind at rename↔use — "the separating signal (`E-TYPE-063`) exists only
> in the compiler." scrml then **landed that signal** as `scrml semdiff` (#6b P0). Slice 4 wires it in and
> proves — on real fixtures — that it closes the boundary from the *merge* side, exactly as the co-sign predicted.

---

## 1. The primitive, verified from the merge side

`scrml semdiff <base> <head> [--json]` → per-entity `tier`/`axes` + a synthesized top-level `verdict`
(`cosmetic` | `behavioral`) + **`diagnostics.added`** (errors present in head but not base) + exit `0`/`1`/`2`.

Run directly on the S18 boundary fixtures (`slice2-enum/boundary/`), it separates the two cases member-emission
could not:

| input | verdict | axis | `diagnostics.added` | exit |
|---|---|---|---|---|
| base2 → **rename-clean** (type + use renamed) | behavioral | `source` | — | **1** (compiles) |
| base2 → **rename-dangling** (`.Sha` use left behind) | behavioral | **`use-site`** | **`E-TYPE-063`** | **2** (fail-closed) |

At the member level these were byte-identical ("Sha removed, Digest added"); `diagnostics.added` carries the
`E-TYPE-063` the member set cannot see. **That field is giti-spec §4.4 v3 verbatim** — "type errors introduced
by the merge (not pre-existing) … flagged as semantic conflicts with full compiler-quality error messages."

## 2. Slice 4 — loosen the structural merge, gate it with semdiff

Slices 1–3 are **sound-conservative**: refuse every glue change + every removal/retype → everything accepted is
already type-safe → they never needed `#6b`. Slice 4 **loosens** the ceiling to accept DISJOINT glue edits
(per-segment 3-way combine — the disjoint-block insight applied to use-sites), which *can* combine into a
type-broken file. The loosening is sound **only** because of the semdiff gate on the candidate `M`.

`slice4-semdiff/merge-driver-semdiff.mjs` = slice-3 entity logic + per-segment glue merge + the gate:
write `M`, run `scrml semdiff base M --json`; `diagnostics.added` non-empty → SEMANTIC CONFLICT.

Fixtures (each side compiles alone; the *combination* is what the dangling case breaks):
`base` has two type entities (`Ref:enum`, `Anchor:struct`) → three glue segments, with a `.Sha` use in seg1 and
a `.None` use in seg2. `sideA` renames `Ref.Sha`→`Digest` and updates seg1. `sideB` edits the *disjoint* seg2 —
**clean** (`<p>` text) or **dangling** (`<ref2>` `.None`→`.Sha`, reintroducing the old name).

| scenario | structural merge | semdiff gate | driver verdict |
|---|---|---|---|
| CLEAN (base + A-rename + B-clean) | `Ref:A, glue#1:A, glue#2:B` → M compiles | behavioral, no `diagnostics.added` | **✓ accept-with-review** (exit 1) |
| DANGLING (base + A-rename + B-dangling) | same regions → M has `.Sha` vs `Ref{Digest}` | **`E-TYPE-063` in `diagnostics.added`** | **✗ semantic conflict** (exit 2) |

## 3. The measured value — strictly better than both neighbors

Same two scenarios, run through the alternatives:

- **git diff3** (`git merge-file`) on DANGLING → **exit 0, no conflict markers**: git auto-merges to the
  byte-identical broken `M` and **ships it silently** (`M` then fails `E-TYPE-063`). This is the "git can't
  reach the semantic tier" thesis, measured.
- **slice-3** (strict glue guard) on CLEAN → **falls through** ("a side changed non-entity glue"): it refuses a
  perfectly safe merge. **Blunt.**
- **slice-4** → **accepts CLEAN, catches DANGLING.** Strictly dominates: it catches the break git ships and
  accepts the merge slice-3 refuses.

This is the "blunt-or-blind → classified-precise" upgrade the S18 boundary predicted, now demonstrated end-to-end
on the landed primitive.

## 4. What this closes, and what it doesn't

- **CLOSES:** the S18 measured `#6b` boundary from the merge side. The consumer §4.4 v3 layer is now a working
  driver: structural merge + semdiff validation → auto-accept clean / surface merge-introduced type errors with
  compiler-quality messages. giti's `giti-rename-use` wall is regression-pinned in scrml's own fixture suite.
- **Does NOT change v2:** slices 1–3 (structural merge on `#6`) still ship without `#6b`. Slice 4 is the v3
  *validation* layer that lets v2 safely accept the classes it previously refused.
- **No wrong classification found** — semdiff behaved exactly as needed on every fixture; nothing to file back to
  scrml except the positive confirmation. (The scrml S264 note invited a base/head repro on any mis-classify;
  none arose.)

## 5. Scope / limits (this slice)
- Per-segment glue merge combines DISJOINT segments; a both-sides edit of one segment is a (sound) structural
  conflict, not a line-level 3-way. A production driver runs a real diff3 on same-segment edits, then the same
  gate — the **gate** is the load-bearing part, and it is proven here.
- The gate keys on `diagnostics.added`; semdiff's P0 axis attribution (`source` vs `use-site`) is advisory for
  the driver's decision. semdiff P0 does not yet recognize a *clean* rename as Tier-0/cosmetic (it reads
  `behavioral/source`) — sound-conservative, and irrelevant to the accept/refuse cut, which rides the
  introduced-error set.
- Prototype in JS/Bun (shells to `scrml semdiff`); production driver is scrml, pending the subprocess primitive
  (giti's 2026-07-05 scrml ask).

## 6. Decisions log (delta)
| decision | value | by |
|---|---|---|
| Slice 4 target | §4.4 v3 compiler-validated merge — structural loosen + `scrml semdiff` gate — ✅ BUILT + gate-verified | giti PA S19 |
| `#6b` merge-need | CLOSED — semdiff `diagnostics.added` separates clean rename from use-breaking rename; measured on real fixtures | giti PA S19 |
| Gate signal | `diagnostics.added` (merge-introduced errors) = §4.4 v3 "errors introduced by the merge, not pre-existing" | giti PA S19 |
| vs git / vs slice-3 | slice-4 strictly dominates both (catches git's silent break; accepts slice-3's blunt refusal) — measured | giti PA S19 |
| Productization | deferred — `giti merge`/`giti resolve` wire-in + `giti status --merge-log`; production driver blocked on subprocess primitive | giti PA S19 |
