# non-compliance.report.md
# project: giti
# generated: 2026-07-15T16:04:15-06:00
# scan mode: INCREMENTAL_UPDATE

## Summary

Total docs scanned: 22  (19 from prior scan + 3 new since ccad5ba:
docs/ast-merge/slice2-enum-merge-and-measured-boundary.md,
docs/ast-merge/prototype/slice2-enum/README.md,
docs/ast-merge/prototype/slice3-multi/README.md)
Compliant: 13  (11 carried + 2 new slice READMEs)
Non-compliant: 5 (all are deep-dive location flags — see standing note below)
Uncertain: 4 (3 carried + 1 new: the slice-2 narrative note)

> **Standing note (carried from S14, 2026-06-22):** The 5 `docs/deep-dives/` location flags are
> FALSE POSITIVES under current policy — those DDs were deliberately moved into giti as
> canonical-home per the 2026-05-17 inbox request (acted on S13). They are intentional, not
> misplaced. Do not deref them.

> **Scope note (carried, S17):** `.claude/CLAUDE.md` (fenced flobase region) is EXCLUDED from this
> scan by the mapper's own rules (`.claude/` is on the doc-glob exclusion list) — not assessed,
> not an oversight.

Docs scanned:
- giti-spec-v1.md
- README.md
- pa.md
- pa-base.md
- master-list.md
- hand-off.md
- user-voice.md
- LICENSE.md
- docs/changes/ui-idiomatic-rewrite/progress.md
- docs/deep-dives/giti-027b-per-role-ssr-content-stripping-2026-05-30.md
- docs/deep-dives/giti-collaboration-primitive-2026-04-09.md
- docs/deep-dives/giti-conflict-resolution-2026-04-09.md
- docs/deep-dives/giti-design-constraints-from-friction-2026-04-10.md
- docs/deep-dives/giti-radical-doubt-2026-04-09.md
- docs/deep-dives/giti-vcs-model-2026-04-09.md
- docs/ast-merge/v0-approach-d-shared-note.md
- docs/ast-merge/compiler-ask-v0.md
- docs/ast-merge/prototype/README.md
- docs/ast-merge/slice2-enum-merge-and-measured-boundary.md  ← NEW since ccad5ba (S18)
- docs/ast-merge/prototype/slice2-enum/README.md  ← NEW since ccad5ba (S18)
- docs/ast-merge/prototype/slice3-multi/README.md  ← NEW since ccad5ba (S18)
- .pa-base/profile

---

## New docs assessed this scan (S18)

### docs/ast-merge/prototype/slice2-enum/README.md — COMPLIANT
Documents `slice2-enum/merge-driver-enum.mjs` (enum variant-add merge) + its fixtures. Every claim is
verifiable against present, runnable code: the driver consumes the shipped `--emit-block-analysis`
`members[]` array directly (re-parse layer dropped), splices added variants verbatim by span, keys on
`{name, typeText}`, and the collide fixtures (`sideA-collide`/`sideB-collide`) correctly CONFLICT.
Same footing as the existing slice-1 prototype/README.md — docs-for-working-code. Gate is stated
("must compile" via a direct `scrml compiler compile`). No aspirational claims.

### docs/ast-merge/prototype/slice3-multi/README.md — COMPLIANT
Documents `slice3-multi/merge-driver-multi.mjs` (multi-entity same-file merge). Claims match the code:
disjoint entities that git text-conflicts on adjacent lines are combined by whole-entity splice;
same-entity-both-sides recurses into the shared `mergeMembers` path (struct field-merge and enum
variant-merge unified because both emit `members[]`). Runnable, gate-verified, docs-for-working-code.

### docs/ast-merge/slice2-enum-merge-and-measured-boundary.md — UNCERTAIN, needs human review
**Reason:** same mixed-status shape as the carried `v0-approach-d-shared-note.md`. This is a dated
(2026-07-15) write-up whose §1–§2b describe **shipped, gate-verified** work (slice 2 enum merge + slice 3
multi-entity — both verified directly against the present, runnable `slice2-enum/` and `slice3-multi/`
drivers) but whose framing (the "measured #6b boundary", the flogence↔giti #6b co-sign it is building
toward) is a forward-looking research/ask artifact — it locates where the CURRENT approach breaks and
argues for a FUTURE compiler `#6b` classification surface that does not exist yet.
**Grep cross-check:** backticked identifiers split between giti-local prototype files (resolve) and
sibling-repo / spec references (`semdiff.ts`, `#6b`, `--emit-block-analysis` acceptance-shape) — the
raw grep-mismatch heuristic fires by construction (cross-repo joint note), not because the doc is stale.
**What to check:** whether this doc gets the same canonical-home carve-out already granted to
`docs/deep-dives/` and pending on `v0-approach-d-shared-note.md`. It is functionally the same kind of
artifact (a §4.3 design/research note co-authored with flogence). Decide the two together. Until decided,
the BUILT `prototype/slice2-enum/` + `slice3-multi/` code (mapped in structure.map.md) is unaffected —
only this narrative .md is in question.

---

## Carried assessments (unchanged from prior scan)

### docs/ast-merge/prototype/README.md — COMPLIANT
Slice-1 struct field-add prototype docs; real, runnable, gate-verified. (Full detail in prior scan.)

### .pa-base/profile — COMPLIANT (operational config, not a code-feature claim)
flobase boot manifest, parallel to pa-base.md. Living config note; minor STACK-line count drift is
expected mid-session, not a false claim about current code. No action needed.

### docs/ast-merge/v0-approach-d-shared-note.md — UNCERTAIN, needs human review
Mixed status (shipped slices vs forward-looking §6–§7/§9 scoped-later). Cross-repo joint note (giti +
flogence) for giti-spec §4.3/§4.4. Grep-mismatch fires by construction (identifiers resolve to the
flogence sibling repo). **What to check:** the canonical-home carve-out decision (same as the new
slice-2 narrative above). The BUILT prototype/ code is unaffected either way.

### docs/ast-merge/compiler-ask-v0.md — UNCERTAIN, needs human review
An ASK document by its own framing — requested two `--emit-block-analysis` extensions (member emission +
bodySpan) that have SINCE SHIPPED as oracle-ask #6 (confirmed by slice-2's verified-on-real-sidecar
write-up). It is a formal cross-repo ask filed via giti's standing authorization. **What to check:**
whether sent asks-to-scrml belong committed in giti's repo (durable record) or only in the receiving
repo / shared ledger. Now that #6 shipped, this doc reads as a "sent request, resolved" record.

---

## Non-compliant docs

### docs/deep-dives/giti-collaboration-primitive-2026-04-09.md
**Reason:** location — deep-dive doc belongs in scrml-support, not the project repo
**Detail:** doc is under docs/deep-dives/ with a dated filename (2026-04-09). Per mapping rules,
deep-dives belong in scrml-support/docs/. This is a historical design rationale document.
**Suggested disposition:** deref to scrml-support/docs/  [STANDING NOTE: FALSE POSITIVE per S13 canonical-home move]

### docs/deep-dives/giti-conflict-resolution-2026-04-09.md
**Reason:** location — deep-dive doc belongs in scrml-support, not the project repo
**Detail:** Same reason as above; dated filename 2026-04-09, historical design rationale.
**Suggested disposition:** deref to scrml-support/docs/  [STANDING NOTE: FALSE POSITIVE]

### docs/deep-dives/giti-design-constraints-from-friction-2026-04-10.md
**Reason:** location — deep-dive doc belongs in scrml-support, not the project repo
**Detail:** Same reason as above; dated filename 2026-04-10, historical design rationale.
**Suggested disposition:** deref to scrml-support/docs/  [STANDING NOTE: FALSE POSITIVE]

### docs/deep-dives/giti-radical-doubt-2026-04-09.md
**Reason:** location — deep-dive doc belongs in scrml-support, not the project repo
**Detail:** Same reason as above; dated filename 2026-04-09, historical design rationale.
**Suggested disposition:** deref to scrml-support/docs/  [STANDING NOTE: FALSE POSITIVE]

### docs/deep-dives/giti-vcs-model-2026-04-09.md
**Reason:** location — deep-dive doc belongs in scrml-support, not the project repo
**Detail:** Same reason as above; dated filename 2026-04-09, historical VCS model design rationale.
**Suggested disposition:** deref to scrml-support/docs/  [STANDING NOTE: FALSE POSITIVE]

---

## scrmlTS References — Status (unchanged from prior scan)

The following `scrmlTS` occurrences were found and assessed. **None are non-compliant** — they are all
correctly categorized as either (a) intentional legacy back-compat code, (b) historical test fixtures
for the legacy path, or (c) historical narrative in master-list.md and hand-off.md.

**Correct back-compat code (compliant — intentional):**
- `src/lib/resolve-compiler.scrml` and `src/lib/resolve-compiler.js` — `SCRMLTS_PATH` env var and
  `../scrmlTS` sibling path are explicitly documented as legacy fallbacks. This is by design.
- `tests/land.test.js` — tests the legacy `SCRMLTS_PATH` and `../scrmlTS` fallback paths, verifying the
  stated backward-compatibility contract.

**Cosmetic historical comments in scrml source (compliant — low priority):**
- `ui/*.scrml`, `ui/repros/repro-*.scrml` — historical version stamps in comments. Cosmetic scrmlTS-era
  flavor text is low priority, no incorrect claims about current behavior. (Note: the S18 UI migration
  touched every page's server fns — grep confirms no `await` and no `try`/`catch` remain in any
  ui/*.scrml or src/lib/*.scrml source.)
- `tests/compile-ui.test.js:7` — comment referencing "scrmlTS" in a historical note about GITI-011.

**Historical narrative (compliant — expected in a live dev log):**
- `master-list.md`, `hand-off.md` — extensive `scrmlTS` references in session-log narrative; both note
  the rename and known lingering cosmetic references.
- `docs/deep-dives/giti-027b-...md`, `docs/changes/ui-idiomatic-rewrite/progress.md` — external path
  citations / historical compiler-finding notes.

---

## Uncertain docs (needs human review)

### docs/deep-dives/giti-027b-per-role-ssr-content-stripping-2026-05-30.md
**Reason:** mixed status — deep-dive describing per-role SSR HTML stripping, partially implemented
(Part-A warning exists) and partially deferred (Part-B). Some identifiers live in the scrml compiler
repo, not giti. Relocated to giti as canonical per the 2026-05-17 move.
**What to check:** confirm the canonical-home decision still holds; verify whether Part-B deferral status
has changed.

### docs/ast-merge/v0-approach-d-shared-note.md
See "Carried assessments" above.

### docs/ast-merge/compiler-ask-v0.md
See "Carried assessments" above.

### docs/ast-merge/slice2-enum-merge-and-measured-boundary.md
See "New docs assessed this scan (S18)" above.

---

## Notes

**giti-spec-v1.md** — authoritative spec, dated 2026-04-09. §4.3 and §4.4 (cited by the docs/ast-merge/
notes) exist as-cited. COMPLIANT.

**README.md** — single-line (`# giti`). No claims to verify. COMPLIANT.

**hand-off.md** — documents the scrmlTS→scrml rename, session state, known cosmetic lingering references.
COMPLIANT as a session state artifact.

**master-list.md** — live dev log. Historical `scrmlTS` narrative is expected content. COMPLIANT.

**user-voice.md** — user feedback/design inputs. No code identifiers to verify. COMPLIANT.

**LICENSE.md** — license text. COMPLIANT.

**pa-base.md**, **docs/changes/ui-idiomatic-rewrite/progress.md** — carried COMPLIANT from prior scan,
unaffected by S18 changes.

---

## Tags
#non-compliance #project-mapper #cleanup #giti #ast-merge

## Links
- [primary.map.md](./primary.map.md)
- [structure.map.md](./structure.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [scrml-support archive convention](../../../scrml-support/pa.md)
