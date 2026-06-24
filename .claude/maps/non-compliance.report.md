# non-compliance.report.md
# project: giti
# generated: 2026-06-24T14:00:00Z
# scan mode: INCREMENTAL_UPDATE

## Summary

Total docs scanned: 15  (13 from prior scan + 2 new since b2fde19)
Compliant: 9
Non-compliant: 5 (all are deep-dive location flags — see standing note below)
Uncertain: 1

> **Standing note (carried from S14, 2026-06-22):** The 5 `docs/deep-dives/` location flags are
> FALSE POSITIVES under current policy — those DDs were deliberately moved into giti as
> canonical-home per the 2026-05-17 inbox request (acted on S13). They are intentional, not
> misplaced. Do not deref them.

Docs scanned:
- giti-spec-v1.md
- README.md
- pa.md
- pa-base.md  ← NEW since b2fde19
- master-list.md
- hand-off.md
- user-voice.md
- LICENSE.md
- docs/changes/ui-idiomatic-rewrite/progress.md  ← NEW since b2fde19
- docs/deep-dives/giti-027b-per-role-ssr-content-stripping-2026-05-30.md
- docs/deep-dives/giti-collaboration-primitive-2026-04-09.md
- docs/deep-dives/giti-conflict-resolution-2026-04-09.md
- docs/deep-dives/giti-design-constraints-from-friction-2026-04-10.md
- docs/deep-dives/giti-radical-doubt-2026-04-09.md
- docs/deep-dives/giti-vcs-model-2026-04-09.md

---

## New docs assessed this scan

### pa-base.md — COMPLIANT
Vendored copy of the project-agnostic PA-base doctrine (`pa-base v1`, 2026-06-11). Per its own
provenance note, consuming projects carry an inline copy — this is by design. No aspirational
content, no stale identifiers.

### docs/changes/ui-idiomatic-rewrite/progress.md — COMPLIANT
Append-only WIP log for the S15 idiomatic UI rewrite. Describes completed work (7 pages rewritten,
compiler findings reported). Content matches what is now in the ui/*.scrml source files. Standard
change-tracking artifact.

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
- `ui/live.scrml`, `ui/diff.scrml`, `ui/feed.scrml`, `ui/bookmarks.scrml` — historical version stamps
  in comments ("scrmlTS rewrites…", "GITI-009 fixed upstream"). Post-S15 the scrmlTS→scrml rename
  references in page headers are stale flavor text; `ui/status.scrml` and `ui/history.scrml` had them
  cleaned as part of S15; remaining 5 pages retain them. Cosmetic only — no incorrect claims about
  current behavior.
- `tests/compile-ui.test.js:7` — comment referencing "scrmlTS" in a historical note about GITI-011.
- `ui/repros/repro-*.scrml` — repro files have `scrmlTS`-versioned comments. Expected in reproducers.

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

---

## Notes

**giti-spec-v1.md** — authoritative spec, dated 2026-04-09. All code references to spec sections
(§2.1, §3.2, §12.3, etc.) were spot-checked and resolve correctly. COMPLIANT.

**README.md** — single-line (`# giti`). No claims to verify. COMPLIANT.

**hand-off.md** — correctly documents the scrmlTS→scrml rename, stale map status, and known cosmetic
lingering references. COMPLIANT as a session state artifact.

**master-list.md** — live dev log. Historical `scrmlTS` narrative is expected content for a dev log.
All source file paths that could be checked exist. COMPLIANT.

**user-voice.md** — user feedback/design inputs. No code identifiers to verify. COMPLIANT.

**LICENSE.md** — license text. COMPLIANT.

---

## Tags
#non-compliance #project-mapper #cleanup #giti

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [scrml-support archive convention](../../../scrml-support/pa.md)
