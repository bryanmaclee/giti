# non-compliance.report.md
# project: giti
# generated: 2026-07-18T11:12:13-06:00
# scan mode: INCREMENTAL_UPDATE

## Summary

Total docs scanned: 24  (22 from prior scan + 2 new since 513ef41 (S19):
docs/ast-merge/prototype/slice4-semdiff/README.md,
docs/ast-merge/slice4-semdiff-v3-validation.md)
Compliant: 14  (13 carried + 1 new: slice4-semdiff/README.md)
Non-compliant: 5 (all are deep-dive location flags — see standing note below)
Uncertain: 5 (4 carried + 1 new: the slice-4 narrative note)

> **Standing note (carried from S14, 2026-06-22):** The 5 `docs/deep-dives/` location flags are
> FALSE POSITIVES under current policy — those DDs were deliberately moved into giti as
> canonical-home per the 2026-05-17 inbox request (acted on S13). They are intentional, not
> misplaced. Do not deref them.

> **Scope note (carried, S17):** `.claude/CLAUDE.md` (fenced flobase region) is EXCLUDED from this
> scan by the mapper's own rules (`.claude/` is on the doc-glob exclusion list) — not assessed,
> not an oversight.

> **Scope note (carried, S18):** `handOffs/` is EXCLUDED from this scan by the mapper's own rules.
> S19 added two inbound reply notes under `handOffs/incoming/` (scrml's 036-fixed/037-answered reply,
> drained to `read/`; flogence's #6b-converged note; scrml's #6b-semdiff-LANDED note) — none assessed,
> per policy, not an oversight.

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
- docs/ast-merge/slice2-enum-merge-and-measured-boundary.md
- docs/ast-merge/prototype/slice2-enum/README.md
- docs/ast-merge/prototype/slice3-multi/README.md
- docs/ast-merge/slice4-semdiff-v3-validation.md  ← NEW since 513ef41 (S19)
- docs/ast-merge/prototype/slice4-semdiff/README.md  ← NEW since 513ef41 (S19)
- .pa-base/profile

---

## New docs assessed this scan (S19)

### docs/ast-merge/prototype/slice4-semdiff/README.md — COMPLIANT
Documents `slice4-semdiff/merge-driver-semdiff.mjs` (structural merge loosened to accept disjoint glue
edits, gated by `scrml semdiff base M --json`). Every claim was independently RE-EXECUTED this scan, not
just grep-checked: `bun merge-driver-semdiff.mjs base.scrml sideA.scrml sideB-clean.scrml -o /tmp/M.scrml`
produced the documented `structural merge — combined: Ref:A, glue#1:A, glue#2:B` + `✓ ACCEPT-WITH-REVIEW`
and exited **1**; the `sideB-dangling.scrml` run produced the documented
`✗ SEMANTIC CONFLICT ... E-TYPE-063` and exited **2** — matching the README's comparison table exactly.
Same footing as slice2-enum/README.md and slice3-multi/README.md — docs-for-working-code, gate stated and
verified. No aspirational claims.

### docs/ast-merge/slice4-semdiff-v3-validation.md — UNCERTAIN, needs human review
**Reason:** same mixed-status shape as the carried `slice2-enum-merge-and-measured-boundary.md` and
`v0-approach-d-shared-note.md`. Dated 2026-07-17, this write-up's §1–§3 describe **shipped,
gate-verified** work (the `scrml semdiff` primitive run directly against the S18 boundary fixtures, and
slice 4's driver behavior) — both independently re-verified this scan (§1's boundary-fixture table and
§2/§3's CLEAN/DANGLING exit codes match live execution, see slice4-semdiff/README.md assessment above).
But §5 ("Scope / limits") and §6 ("Decisions log") frame forward-looking / cross-repo state: productization
of the driver into `giti merge`/`giti resolve` is explicitly "deferred", and the doc leans on cross-repo
identifiers (scrml commit hashes `01160fb8`/`780e4342`, PR #91, `../scrml-support` asks) that resolve in
the sibling repo, not giti's own source tree.
**Grep cross-check:** backticked identifiers split between giti-local prototype files (resolve cleanly —
`merge-driver-semdiff.mjs`, `diagnostics.added`, `E-TYPE-063`, the fixture filenames) and sibling-repo /
cross-project references (`scrml semdiff`, the PR/commit hashes) — the raw grep-mismatch heuristic fires
by construction (cross-repo joint validation note), not because the doc is stale.
**What to check:** whether this doc gets the same canonical-home carve-out already pending on
`v0-approach-d-shared-note.md` and `slice2-enum-merge-and-measured-boundary.md` — it is functionally the
same kind of artifact (a §4.3/§4.4 research note grounded in a landed cross-repo primitive). Decide the
three together. Until decided, the BUILT `prototype/slice4-semdiff/` code (mapped in structure.map.md, and
directly re-executed this scan) is unaffected — only this narrative .md is in question.

---

## Carried assessments (unchanged from prior scan)

### docs/ast-merge/prototype/slice2-enum/README.md — COMPLIANT
Enum variant-add merge prototype docs; real, runnable, gate-verified. (Full detail in S18 scan.)

### docs/ast-merge/prototype/slice3-multi/README.md — COMPLIANT
Multi-entity same-file merge prototype docs; real, runnable, gate-verified. (Full detail in S18 scan.)

### docs/ast-merge/prototype/README.md — COMPLIANT
Slice-1 struct field-add prototype docs; real, runnable, gate-verified. (Full detail in prior scan.)

### .pa-base/profile — COMPLIANT (operational config, not a code-feature claim)
flobase boot manifest, parallel to pa-base.md. Living config note; minor STACK-line count drift is
expected mid-session, not a false claim about current code. No action needed.

### docs/ast-merge/v0-approach-d-shared-note.md — UNCERTAIN, needs human review
Mixed status (shipped slices vs forward-looking §6–§7/§9 scoped-later). Cross-repo joint note (giti +
flogence) for giti-spec §4.3/§4.4. Grep-mismatch fires by construction (identifiers resolve to the
flogence sibling repo). **What to check:** the canonical-home carve-out decision (same as the S19 slice-4
narrative above — decide all three cross-repo research notes together). The BUILT prototype/ code is
unaffected either way.

### docs/ast-merge/compiler-ask-v0.md — UNCERTAIN, needs human review
An ASK document by its own framing — requested two `--emit-block-analysis` extensions (member emission +
bodySpan) that have SINCE SHIPPED as oracle-ask #6 (confirmed by slice-2's verified-on-real-sidecar
write-up). It is a formal cross-repo ask filed via giti's standing authorization. **What to check:**
whether sent asks-to-scrml belong committed in giti's repo (durable record) or only in the receiving
repo / shared ledger. Now that #6 shipped (and #6b since S19), this doc reads as a "sent request,
resolved" record.

### docs/ast-merge/slice2-enum-merge-and-measured-boundary.md — UNCERTAIN, needs human review
Same mixed-status shape as v0-approach-d-shared-note.md — §1–§2b describe shipped, gate-verified work
(slice 2 + slice 3), but the "measured #6b boundary" framing was, as of S18, a forward-looking research ask.
**Update (S19):** the #6b primitive this doc anticipated has SHIPPED and been integrated as slice 4
(see slice4-semdiff-v3-validation.md above) — this doc's forward-looking claim is now resolved history,
which strengthens the case for treating it the same as compiler-ask-v0.md ("sent request, resolved").
**What to check:** same canonical-home decision, now decide all four docs/ast-merge/ narrative notes
together (v0-approach-d-shared-note, compiler-ask-v0, this doc, slice4-semdiff-v3-validation).

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
See "Carried assessments" above (updated S19).

### docs/ast-merge/slice4-semdiff-v3-validation.md
See "New docs assessed this scan (S19)" above.

---

## Notes

**giti-spec-v1.md** — authoritative spec, dated 2026-04-09. §4.3 and §4.4 (cited by the docs/ast-merge/
notes) exist as-cited. COMPLIANT.

**README.md** — single-line (`# giti`). No claims to verify. COMPLIANT.

**hand-off.md** — S19 rewrite documents the compiler-HEAD churn, the GITI-036/016/037 ledger deltas, the
slice-4 integration, and session state. Same rationale as prior scans: a session-state artifact, expected
to be rewritten every session. COMPLIANT.

**master-list.md** — live dev log. Historical `scrmlTS` narrative is expected content. COMPLIANT.

**user-voice.md** — user feedback/design inputs. No code identifiers to verify. COMPLIANT.

**LICENSE.md** — license text. COMPLIANT.

**pa-base.md**, **docs/changes/ui-idiomatic-rewrite/progress.md** — carried COMPLIANT from prior scan,
unaffected by S19 changes.

---

## Tags
#non-compliance #project-mapper #cleanup #giti #ast-merge #semdiff

## Links
- [primary.map.md](./primary.map.md)
- [structure.map.md](./structure.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [scrml-support archive convention](../../../scrml-support/pa.md)
