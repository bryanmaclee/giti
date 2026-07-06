# non-compliance.report.md
# project: giti
# generated: 2026-07-06T10:16:06-06:00
# scan mode: INCREMENTAL_UPDATE

## Summary

Total docs scanned: 19  (15 from prior scan + 4 new since ccad5ba: docs/ast-merge/v0-approach-d-shared-note.md,
docs/ast-merge/compiler-ask-v0.md, docs/ast-merge/prototype/README.md, .pa-base/profile)
Compliant: 11
Non-compliant: 5 (all are deep-dive location flags — see standing note below)
Uncertain: 3 (1 carried, 2 new — both in docs/ast-merge/)

> **Standing note (carried from S14, 2026-06-22):** The 5 `docs/deep-dives/` location flags are
> FALSE POSITIVES under current policy — those DDs were deliberately moved into giti as
> canonical-home per the 2026-05-17 inbox request (acted on S13). They are intentional, not
> misplaced. Do not deref them.

> **Scope note (S17):** `.claude/CLAUDE.md` (new this session, fenced flobase region) is EXCLUDED from
> this scan by the mapper's own rules (`.claude/` is on the doc-glob exclusion list) — not assessed,
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
- docs/ast-merge/v0-approach-d-shared-note.md  ← NEW since ccad5ba
- docs/ast-merge/compiler-ask-v0.md  ← NEW since ccad5ba
- docs/ast-merge/prototype/README.md  ← NEW since ccad5ba
- .pa-base/profile  ← NEW since ccad5ba

---

## New docs assessed this scan

### docs/ast-merge/prototype/README.md — COMPLIANT
Documents `docs/ast-merge/prototype/merge-driver.mjs`, a real, runnable, gate-verified CLI (3-way merges
a `.scrml` state-type field-add off the scrml compiler's `--emit-block-analysis` sidecar; gate = the
merged output must compile). Read merge-driver.mjs directly: its structure (blocksOf/entity/parseStruct/
mergeFields/mergeDriver, byte-span slicing, tight-end re-derivation) matches every claim in the README
line for line, including the two documented LIMITS (flat-structs-only, additions-only, single-diverged-
entity). No aspirational claims beyond what the code does. This is executable source with accurate
accompanying docs — compliant, same footing as any other README-for-working-code in this repo.

### .pa-base/profile — COMPLIANT (minor observation, not flagged)
flobase boot manifest — operational PA/agent config, not a claim-about-code-feature document (parallel
to the previously-assessed `pa-base.md`). Spot-checked verifiable claims: "46 .js" (hand-authored, non-
compiled-sibling files under src/, excluding dist/) — confirmed exact match by `find`. "375/0 across 14
files" — confirmed by re-running `bun test` (375 pass, 0 fail, 14 files). One minor staleness noted, not
flagged: the STACK line's "61 .scrml" was accurate at the profile's own commit (ce4aeb3) but the repo
has since grown to 65 (repro-33 + docs/ast-merge/prototype/slice/ fixtures added later in the same
session). This is expected drift in a living config note mid-session, not a false claim about current
code behavior — no action needed.

### docs/ast-merge/v0-approach-d-shared-note.md — UNCERTAIN, needs human review
**Reason:** mixed status, same shape as the giti-027b precedent below. This is a live, dated (2026-07-06)
joint design/research note (giti + flogence, an external project's PA) scoping giti-spec §4.3 (AST
semantic merge) and §4.4 (v3 compiler type-diff). Sections 1-3, 8-9 describe **shipped, gate-verified**
work (the first slice IS built — verified directly against `docs/ast-merge/prototype/merge-driver.mjs`,
which exists and runs). Sections 6-7 and most of the "scoped-later" list (§9: real-time keystroke
detection, OQ-4 perf-at-scale, v3 type-diff, tree-sitter fallback) describe **unimplemented, future**
work by design — this is explicitly a forward-looking research/ask note, not a reference doc.
**Grep cross-check:** >20% of backticked identifiers (`scripts/leasing.ts`, `branchFootprint`,
`ast-merge-fieldadd.ts`, `delta-log.scrml`) resolve to a SIBLING repo (flogence), not giti's own source
tree — expected for a joint cross-repo note, but it means the raw grep-mismatch heuristic fires by
construction, not because the doc is stale.
**What to check:** (a) Whether this doc should get the same canonical-home carve-out already granted to
`docs/deep-dives/` (2026-05-17 decision, acted on S13) — it is functionally the same kind of artifact
(a design/research note for a giti spec section, co-authored with a sibling project). (b) If NOT granted
canonical-home status, this doc (and its "scoped-later" §9) should be flagged non-compliant as
aspirational content and dispositioned — likely to `scrml-support/docs/` per the deep-dives convention.
Until decided, the BUILT prototype/ code itself (mapped in structure.map.md) is unaffected either way —
only the two narrative/ask .md files are in question.

### docs/ast-merge/compiler-ask-v0.md — UNCERTAIN, needs human review
**Reason:** content-heuristic — this is, by its own framing, an ASK document: it requests two compiler
extensions from scrml that do not exist yet (`typeShape`/`members` field-level emission, a `bodySpan`).
Every acceptance criterion in the doc describes behavior the compiler does NOT currently implement
("Ask 1", "Ask 2", "Acceptance:" section describing what `--emit-block-analysis` should emit but
doesn't yet). This is squarely the "planned/proposal, describes behavior the code does not currently
implement" pattern the mapper is instructed to flag — EXCEPT it is not a giti-source claim at all; it is
a formal, actively-tracked cross-repo ask (per `pa.md` / `.pa-base/profile`, giti has standing
authorization to file cross-repo bug/asks to `../scrml` without per-instance permission — this looks like
that same channel, routed via flogence's compiler-as-oracle ledger rather than `handOffs/incoming/`).
**What to check:** Confirm whether asks-to-scrml belong committed in giti's own repo (as a durable
record of what was requested and why) or should live only in the receiving repo / a shared ledger.
If the former, this doc is compliant as a "sent request, kept for the record" — same category as filed
bug reports. If the latter, disposition is a deref to `scrml-support/` or wherever the joint ledger lives.

---

## Non-compliant docs

### docs/deep-dives/giti-collaboration-primitive-2026-04-09.md
**Reason:** location — deep-dive doc belongs in scrml-support, not the project repo
**Detail:** doc is under docs/deep-dives/ with a dated filename (2026-04-09). Per mapping rules,
deep-dives belong in scrml-support/docs/. This is a historical design rationale document, not a
current reference used by dev agents working on this codebase.
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
- `tests/land.test.js` — tests the legacy `SCRMLTS_PATH` and `../scrmlTS` fallback paths. These tests
  verify that the legacy path still works, which is the stated backward-compatibility contract.

**Cosmetic historical comments in scrml source (compliant — low priority):**
- `ui/live.scrml`, `ui/feed.scrml` — historical version stamps in comments ("scrmlTS rewrites…", "GITI-009
  fixed upstream"). `ui/status.scrml`, `ui/history.scrml`, `ui/diff.scrml`, `ui/bookmarks.scrml`,
  `ui/land.scrml` had their interpolation-related comments touched/cleaned in S15/S17; cosmetic
  scrmlTS-era flavor text is low priority, no incorrect claims about current behavior.
- `tests/compile-ui.test.js:7` — comment referencing "scrmlTS" in a historical note about GITI-011.
- `ui/repros/repro-*.scrml` — repro files have `scrmlTS`-versioned comments. Expected in reproducers.
  Repro-32/33 (S17) correctly use `scrml @<hash>` version stamps, not `scrmlTS`.

**Historical narrative (compliant — expected in a live dev log):**
- `master-list.md` — extensive `scrmlTS` references in the session log narrative (S11, S12, etc.).
- `hand-off.md` — explicitly notes the rename and the known lingering cosmetic references.
- `docs/deep-dives/giti-027b-per-role-ssr-content-stripping-2026-05-30.md` — external path citations like `scrmlTS/compiler/SPEC.md:...`.
- `docs/changes/ui-idiomatic-rewrite/progress.md` — references to `scrmlTS` in historical compiler-finding notes.

---

## Uncertain docs (needs human review)

### docs/deep-dives/giti-027b-per-role-ssr-content-stripping-2026-05-30.md
**Reason:** mixed status — this deep-dive is more recent (2026-05-30) and describes a feature (per-role
SSR HTML stripping) that is **partially implemented** (Part-A: W-AUTH-CONTENT-NOT-GATED warning exists)
and **partially deferred** (Part-B: per-role HTML stripping). Some identifiers in the doc (`flagContentNotGated`,
`auth-graph.ts`) live in the scrml compiler repo, not giti. As a design deep-dive it nominally belongs in
scrml-support, but it was explicitly relocated to giti as canonical per the 2026-05-17 canonical-home-move
request (per master-list.md:65).
**What to check:** Confirm whether the canonical-home decision for deep-dives at giti is still the intent,
or whether the scrml-support move policy supersedes it. If giti is canonical, the doc is compliant.
If scrml-support is the home, flag for deref. Also verify whether Part-B deferral status has changed.

### docs/ast-merge/v0-approach-d-shared-note.md
See "New docs assessed this scan" above.

### docs/ast-merge/compiler-ask-v0.md
See "New docs assessed this scan" above.

---

## Notes

**giti-spec-v1.md** — authoritative spec, dated 2026-04-09. All code references to spec sections
(§2.1, §3.2, §12.3, etc.) were spot-checked and resolve correctly. §4.3 and §4.4 (cited by the new
docs/ast-merge/ note) exist in the spec as-cited. COMPLIANT.

**README.md** — single-line (`# giti`). No claims to verify. COMPLIANT.

**hand-off.md** — correctly documents the scrmlTS→scrml rename, stale map status, and known cosmetic
lingering references. COMPLIANT as a session state artifact.

**master-list.md** — live dev log. Historical `scrmlTS` narrative is expected content for a dev log.
All source file paths that could be checked exist. COMPLIANT.

**user-voice.md** — user feedback/design inputs. No code identifiers to verify. COMPLIANT.

**LICENSE.md** — license text. COMPLIANT.

**pa-base.md**, **docs/changes/ui-idiomatic-rewrite/progress.md** — carried COMPLIANT from prior scan,
unaffected by S17 changes.

---

## Tags
#non-compliance #project-mapper #cleanup #giti #ast-merge

## Links
- [primary.map.md](./primary.map.md)
- [structure.map.md](./structure.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [scrml-support archive convention](../../../scrml-support/pa.md)
