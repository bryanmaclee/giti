# AST Semantic Merge — Approach-D shared research note (v0)

**Status:** v0 draft · **giti drives** (merge semantics), **flogence fills** the compiler-seam section (§6).
**Authors:** giti PA (v0) + flogence PA (compiler-interface). **Date:** 2026-07-06. **Operator-directed tag-team.**
**Grounding (source-normative):** `giti-spec-v1.md` §4.3 (v2 AST Semantic Merge), §4.4 (v3 Compiler Type-Diff),
§3.7 (Engine-Independence Gate), §7 (Real-Time Conflict Detection), OQ-3/OQ-4/OQ-5; and
`docs/deep-dives/giti-conflict-resolution-2026-04-09.md` (ratified **A+C+D layered stack**).

> This note scopes the **minimal first slice** of giti's §4.3 AST merge and the **minimal compiler API** it
> needs from scrml — not the whole conflict taxonomy. Narrow on purpose: prove the driver shape on one case,
> hand scrml a sharp ask, iterate.

> **v0.1 UPDATE — the first slice is BUILT + gate-verified** (`prototype/`, giti PA 2026-07-06). The
> `.scrml` state-type field-add merge works end-to-end on shipping tech (`--emit-block-analysis`, no compiler
> `--merge` entrypoint): git conflicts on the case → the driver produces `AppState { count, name, theme, locale }`
> → **the merged file compiles clean**; the same-field collision case correctly conflicts. This empirically
> answers **§6 Q2 (consumer path) = YES for the first slice**, and sharpens §7 (the two findings below).

---

## 1. Why now — the convergence (not a new pitch)

Two independent tracks hit the *same wall*:

- **giti §4.3** (founding design): same-file edits that touch different entities should not conflict — "two
  developers adding different fields to the same state type in the same file will no longer produce a
  conflict; the AST merge will combine them." Spec-stage, no impl.
- **flogence region-leasing** (shipped slice 1 + harness increment 2): dispatch N agents at one `.scrml` app,
  partitioned by the compiler's per-block write/read footprint. Worktrees + git text-merge land *file-disjoint*
  work trivially; **two agents editing the same file in disjoint blocks break** — git's line-based 3-way
  conflicts even when the blocks are semantically independent (or an agent reflows lines). flogence's lease
  monitor can **admit** the pair as safe-to-combine, but **admission is an oracle, not a merger** — it cannot
  *produce the merged file*.

**That merger is giti §4.3, verbatim.** Region-leasing is the forcing function; giti's AST merge is the unlock.

## 2. The layered target (spec §4, ratified A+C+D)

Conflict resolution is layered + versioned for progressive impl. This note targets **v2**, the first layer
above jj text-merge:

| layer | what | status |
|---|---|---|
| **A** — jj storage (conflict-as-data) | jj `Merge<T>`, conflicts as first-class values | shipped (engine) |
| **C** — v2 AST semantic merge (**this note**) | merge-driver layer *before* jj conflict storage; entity-granularity | spec-stage → **first slice here** |
| **D** — v3 compiler type-diff | compiler type-checks the merged candidate; flags semantic conflicts | spec-stage (§4.4, later) |

**Gate it feeds (§3.7):** when the scrml compiler can do AST-level conflict resolution on `.scrml`, jj's
text-merge becomes less load-bearing and giti's architecture is re-evaluated (does `Merge<T>` still add value;
is the jj subprocess overhead justified; would native storage enable typed/state-aware history). **This note is
the first concrete step toward that gate.** Until met, jj stays — we build *above* it, not replacing it.

## 3. AST source — DECIDED (operator, 2026-07-06)

**scrml-parser PRIMARY, tree-sitter FALLBACK** — congruent with §4.3's own layering:
1. `.scrml` → **scrml parser**, entity-level merge (state-type field granularity). **The high-value path** —
   giti's whole domain is `.scrml`, entity-granularity pays off here, and it's the §3.7 lever. The first slice
   and the compiler ask live here.
2. other parseable → **tree-sitter** (Mergiraf-compatible) — the generic fallback; real but **deferred**
   (bigger scope, weaker footprint, duplicates what the compiler already knows).
3. unparseable (binary/opaque) → **text merge** fallback (unchanged).

flogence's `--emit-block-analysis` is the shipping beachhead for path 1 (see §6).

---

## 4. [giti-owned] Merge-driver architecture

**Where it intercepts.** giti registers AST merge as a **merge-driver layer that runs BEFORE jj commits a
conflict to storage.** Flow for a file giti merges:

```
base, sideA, sideB  ─▶  is .scrml? ──yes─▶ [AST merge driver] ──┬─ clean ─▶ merged file ─▶ jj records a normal (non-conflict) change
                             │                                  └─ conflict ─▶ fall through to jj text-merge / conflict-as-data (layer A)
                             └──no──▶ tree-sitter (deferred) / text merge (today)
```

- **Non-destructive over jj:** the driver only *upgrades* outcomes — a clean AST merge replaces what would have
  been a text conflict; anything it can't resolve falls straight through to jj's existing conflict-as-data. jj
  stays the storage + fallback engine (§3.7: "do not prematurely replace it").
- **`giti resolve` integration:** auto-resolved merges are **logged + reviewable** (`giti status --merge-log`,
  §4.3.4). A developer MAY flag any merge — even a clean one — for human review before landing (§4.4.4). Auto
  ≠ silent.
- **jj `Merge<T>` question (§3.7, scoped-later):** does the AST driver *feed* jj's `Merge<T>` (produce a
  resolved tree jj records) or *bypass* it? v0 position: **feed** — the driver produces a merged file; jj
  records it as an ordinary change. Bypassing jj's algebra is a §3.7-gate re-evaluation, not a v2 concern.

## 5. [giti-owned] Entity-granularity merge semantics

**The canonical case (§4.3):** base state type `S`; sideA adds field `x`; sideB adds field `y`. Entity =
the state type `S`. Both edits touch the *same entity* but *disjoint fields* → **combine** into `S {x, y}`.
Line-merge conflicts (adjacent insertions); entity-merge does not.

**What combines cleanly (v2 scope):**
- disjoint field-adds to the same state type (the first slice);
- edits to *different* top-level entities in the same file (already flogence's disjoint-block case);
- append-only additions (new functions/handlers) that don't touch a shared entity.

**What does NOT (explicitly out of v2 — needs v3 type-diff or human):**
- **semantic conflicts** — sideA renames a field/function, sideB adds a use of the old name. AST merge would
  produce a syntactically-clean file that doesn't type-check. This is exactly §4.4's job (compiler type-diff
  validates the candidate). v2 **must not** silently combine these — it either detects the shared-entity
  collision and falls through, or defers to v3. **Open: can block-analysis footprints detect the rename↔use
  collision, or does that require v3?** (→ §6 Q1, §7.)
- true field-level collisions (both sides add a field of the same name, different type) → conflict, fall through.

**Entity matching** is the crux: base/A/B each parse to a set of top-level entities; we need a **stable
entity identity** across the three inputs to line up "the same state type S" even if it moved. Candidate:
block-analysis `{id, kind, name}` as the entity key (see §6). Does `name`+`kind` survive a rename/move well
enough, or do we need a content-stable id?

## 6. [flogence-owned — STUB, please fill] Compiler-interface reality check

flogence lives in this seam (`scripts/leasing.ts branchFootprint` maps git `--unified=0` hunks onto
block-analysis spans). What `--emit-block-analysis` gives **today**: per top-level block
`{id, kind, name, span:{line,endLine}, reads:[cell...], writes:[cell...]}`, pure CLI, JSON sidecar. The
load-bearing questions for the driver:

- **Q1 — spans+footprints vs sub-trees.** _giti v0.1 empirical:_ block-analysis emits the `type` entity
  as a block with `{id, kind:"type", name, span, reads:[], writes:[]}` — enough to **match** the entity
  across base/A/B (by `kind`+`name`), but it gives **no field-level structure**. The prototype re-parses the
  struct body from the span text itself (a flat-struct parser) — works for the first slice. **The general
  case** (nested types, refinement types, and merge type-*validation*) is where the compiler emitting
  **field-level sub-structure** (or a `--merge`/type-diff entrypoint = §4.4 v3) earns its keep. _[flogence:
  confirm against your richer apps — does re-parse-from-span hold, or do your blocks need sub-ASTs sooner?]_
- **Q2 — consumer vs entrypoint.** _ANSWERED by the prototype:_ **(a) the consumer path works TODAY** —
  giti assembles the merged file from block-analysis of base/A/B, no compiler change (`prototype/`, gate-passed).
  **(b) a compiler `--merge base A B → merged | conflict-list` entrypoint** (the literal OQ-3 answer) is the
  *v3/§4.4 target*, not needed for the v2 first slice. So v2 ships on (a); (b) is the type-validation upgrade.
  _[flogence: agree (a)-now / (b)-later, or does region-leasing need (b) sooner?]_
- **Q3 — headless completeness.** `--emit-block-analysis` is pure-CLI ✓ (prototype invokes it per-version,
  no server). Does a merge-time invocation need any state the current headless mode doesn't expose (stdlib
  resolution, the full cell graph, cross-file entity refs)? _[flogence: headless reality check]_
- **Q4 (NEW, giti v0.1) — tight `bodySpan`.** block-analysis `span.end` extends past the entity's closing
  `}` into trailing trivia; a splice-merge must re-derive a tight end (the prototype welded `}appState>`
  until fixed). A compiler-emitted **tight body span** would remove that. Low-cost, concrete — fold into the
  ask. _[flogence: do you want this too, or does line-based hunk-overlap not care?]_

## 7. [joint] The minimal compiler ask to scrml

Scoped **after** §6 is answered, then carried via flogence's standing **compiler-as-oracle** ledger to scrml,
**co-signed by giti**. It **converges** giti's solo 2026-07-05 ask to scrml (block-analysis as a VCS merge
oracle) — a single minimal joint ask is strictly stronger than two. Target shape: the smallest compiler
addition (sub-AST/content-hash emit, and/or a `--merge` entrypoint) that unblocks the §8 first slice — no more.

## 8. First slice (the narrow proof) — ✅ BUILT + gate-verified (`prototype/`)

**`.scrml` state-type field-add merge** — giti's own §4.3 example. **Built, runs, compiles.**
- **Input:** base + sideA (adds field `x` to `S`) + sideB (adds field `y` to `S`), same file.
- **Steps:** block-analysis each → entity-match `S` across the three → detect disjoint field-adds → emit
  combined `S {x, y}` → hand jj a clean change.
- **Acceptance:** the merge git would conflict on lands clean + type-checks; logged in `--merge-log`; a
  same-name/different-type collision correctly *falls through* (no false combine).
- **Explicitly NOT in the slice:** renames, semantic conflicts, non-scrml files, real-time detection (§7),
  perf-at-scale (OQ-4). All scoped-later below.

## 9. Scoped-later (tracked, not now)

- **v3 compiler type-diff (§4.4)** — validates the merged candidate; the real answer to semantic conflicts.
- **tree-sitter fallback** for non-scrml parseable files (§4.3.2).
- **real-time keystroke detection (§7)** — linked-branch AST cache, ~42ms compile budget; downstream of this infra.
- **OQ-4 perf at scale** — 500-file repo, 50 concurrent modified; degradation behavior.
- **§3.7 re-evaluation** — once the gate is met, revisit jj `Merge<T>` / storage.

## 10. Decisions log

| decision | value | by |
|---|---|---|
| Engage the tag-team | **now, in parallel** (UI-dogfood is GITI-033-blocked → idle capacity) | operator 2026-07-06 |
| AST source | **scrml-parser primary + tree-sitter fallback** | operator 2026-07-06 |
| Who drives v0 note | **giti** (merge semantics), flogence fills §6 + reviews | operator 2026-07-06 |
| First slice | **`.scrml` state-type field-add merge** — ✅ BUILT + gate-verified (`prototype/`) | giti PA 2026-07-06 |
| Consumer vs compiler entrypoint (§6 Q2) | **ANSWERED** — consumer path (a) works today for v2; compiler `--merge` (b) is the v3/§4.4 target | giti prototype 2026-07-06 |
| Entity-identity key (§5) | **prototype uses `(kind,name)`** — sufficient for the slice; content-hash still open for rename-robustness | giti PA 2026-07-06 |
| Compiler ask (§7) | sharpened: field-level sub-structure (nested/refinement) + tight `bodySpan` — the minimal delta over shipping block-analysis | giti prototype 2026-07-06 |
