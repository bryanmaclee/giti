# non-compliance.report.md
# project: giti
# generated: 2026-06-22T00:00:00Z
# scan mode: FULL_COLD_START

## Summary

Total docs scanned: 13
Compliant: 7
Non-compliant: 5 (1 RESOLVED S14 — see pa.md below; 4 remaining are deep-dive location flags)
Uncertain: 1

> **S14 note (2026-06-22):** The 5 `docs/deep-dives/` location flags are FALSE POSITIVES under
> current policy — those DDs were deliberately moved into giti as canonical-home per the 2026-05-17
> inbox request (acted on S13). They are intentional, not misplaced. Do not deref them.

Docs scanned:
- giti-spec-v1.md
- README.md
- pa.md
- master-list.md
- hand-off.md
- user-voice.md
- LICENSE.md
- docs/deep-dives/giti-027b-per-role-ssr-content-stripping-2026-05-30.md
- docs/deep-dives/giti-collaboration-primitive-2026-04-09.md
- docs/deep-dives/giti-conflict-resolution-2026-04-09.md
- docs/deep-dives/giti-design-constraints-from-friction-2026-04-10.md
- docs/deep-dives/giti-radical-doubt-2026-04-09.md
- docs/deep-dives/giti-vcs-model-2026-04-09.md

---

## Non-compliant docs

### pa.md — RESOLVED 2026-06-22 (S14)
**Reason:** content-heuristic — stale counts and stale command list
**Detail:** pa.md §"Current state" said: "88 tests pass, 1,079 LOC across 10 commands". Actual counts:
~375 tests (14 test files), 15 commands (15 files under src/commands/). The repo layout diagram showed
10 commands and omitted src/lib/, src/private/, src/server/, ui/.
**Disposition:** FIXED this session — §"Current state" now reads "375 tests, ~2,495 LOC across 15
commands" + a scrml-dogfood line; layout diagram expanded to show src/server/, src/private/, src/lib/,
ui/, docs/deep-dives/, and the full 15-command list.

### docs/deep-dives/giti-collaboration-primitive-2026-04-09.md
**Reason:** location — deep-dive doc belongs in scrml-support, not the project repo
**Detail:** doc is under docs/deep-dives/ with a dated filename (2026-04-09). Per mapping rules,
deep-dives belong in scrml-support/docs/. This is a historical design rationale document, not a
current reference used by dev agents working on this codebase.
**Suggested disposition:** deref to scrml-support/docs/

### docs/deep-dives/giti-conflict-resolution-2026-04-09.md
**Reason:** location — deep-dive doc belongs in scrml-support, not the project repo
**Detail:** Same reason as above; dated filename 2026-04-09, historical design rationale.
**Suggested disposition:** deref to scrml-support/docs/

### docs/deep-dives/giti-design-constraints-from-friction-2026-04-10.md
**Reason:** location — deep-dive doc belongs in scrml-support, not the project repo
**Detail:** Same reason as above; dated filename 2026-04-10, historical design rationale.
**Suggested disposition:** deref to scrml-support/docs/

### docs/deep-dives/giti-radical-doubt-2026-04-09.md
**Reason:** location — deep-dive doc belongs in scrml-support, not the project repo
**Detail:** Same reason as above; dated filename 2026-04-09, historical design rationale.
**Suggested disposition:** deref to scrml-support/docs/

### docs/deep-dives/giti-vcs-model-2026-04-09.md
**Reason:** location — deep-dive doc belongs in scrml-support, not the project repo
**Detail:** Same reason as above; dated filename 2026-04-09, historical VCS model design rationale.
**Suggested disposition:** deref to scrml-support/docs/

---

## scrmlTS References — Status

The following `scrmlTS` occurrences were found and assessed. **None are non-compliant** — they are all
correctly categorized as either (a) intentional legacy back-compat code, (b) historical test fixtures
for the legacy path, or (c) historical narrative in master-list.md and hand-off.md.

**Correct back-compat code (compliant — intentional):**
- `src/lib/resolve-compiler.scrml` and `src/lib/resolve-compiler.js` — `SCRMLTS_PATH` env var and
  `../scrmlTS` sibling path are explicitly documented as legacy fallbacks. This is by design.
- `tests/land.test.js` — tests the legacy `SCRMLTS_PATH` and `../scrmlTS` fallback paths. These tests
  verify that the legacy path still works, which is the stated backward-compatibility contract.

**Cosmetic historical comments in scrml source (compliant — low priority):**
- `ui/status.scrml:3` — "Built against scrmlTS d23fd54+" (historical version stamp)
- `ui/history.scrml:14` — "scrmlTS rewrites relative-import paths" (cosmetic comment; hand-off.md §notes records this as intentionally left to avoid a recompile)
- `ui/live.scrml:3`, `ui/diff.scrml:16`, `ui/feed.scrml:3`, `ui/bookmarks.scrml:10` — similar historical version stamps in comments
- `tests/compile-ui.test.js:7` — comment referencing "scrmlTS" in a historical note about GITI-011
- `ui/repros/repro-*.scrml` — multiple repro files have `scrmlTS`-versioned comments (e.g., "compiled against scrmlTS@v0.6.7"). These are compiler-bug reproducers, not production code; historical version stamps in comments are expected.

**Historical narrative (compliant — expected in a live dev log):**
- `master-list.md` — extensive `scrmlTS` references in the session log narrative (S11, S12, etc.). These are historical records of bug-filing interactions; they should not be updated. Not flagged.
- `hand-off.md` — explicitly notes the rename and the known lingering cosmetic references. Compliant.
- `docs/deep-dives/giti-027b-per-role-ssr-content-stripping-2026-05-30.md` — external path citations like `scrmlTS/compiler/SPEC.md:...`. These are historical cross-references to where spec sections lived at time of authoring; hand-off.md records them as intentionally left.

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
