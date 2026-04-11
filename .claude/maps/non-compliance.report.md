# non-compliance.report.md
# project: giti
# generated: 2026-04-11T00:00:00Z
# scan mode: FULL_COLD_START

## Summary

Total docs scanned: 6
Compliant: 5
Non-compliant: 0
Uncertain: 1

Docs scanned:
- README.md
- giti-spec-v1.md
- master-list.md
- pa.md
- hand-off.md
- handOffs/hand-off-1.md

(docs/gauntlet-teams/ contains only empty dist/ subdirectories — no .md files present.)

---

## Non-compliant docs

None detected.

---

## Uncertain docs (needs human review)

### hand-off.md
**Reason:** Contains "Next up" items that describe planned/future work not yet in the code.
**Detail:** `hand-off.md` lists future milestones: "Bun HTTP API scaffolding", "Web UI prototype",
"Compiler gate in `land` command (wire to scrmlTS)". The compiler gate item is partially implemented
in `src/commands/land.js` (calls `runCompilerDefault` which runs `bun run compiler/src/index.ts`),
but the referenced `compiler/src/index.ts` path is not in this repo — it assumes a sibling repo.
The other milestones (HTTP API, Web UI) have no code at all.
**What to check:** Verify `hand-off.md` is understood to be a session state file (ephemeral, PA-owned),
not a canonical doc. If so, it is out-of-scope for compliance scanning — mark it as exempt.
Current `hand-off.md` is dated 2026-04-11 and describes "Session 2 work — in progress", which is
consistent with it being a live session artifact rather than a spec or reference doc.

---

## Notes

**README.md** — one line (`# giti`) with no content. Compliant by having no claims to verify.

**giti-spec-v1.md** — 1,531-line authoritative spec, debate-ratified. Not scanned line-by-line here;
the spec is the truth source. Code references spec sections correctly (e.g., `giti-spec-v1.md §2.1`,
`§3.7`, etc.) and all cross-references in code resolve to real spec sections. COMPLIANT.

**master-list.md** — live inventory. All listed source files verified to exist. Open-work section
describes planned milestones (M4.1 items), which is expected content for a master-list. COMPLIANT.

**pa.md** — describes current repo state and PA directives. All source paths listed match actual
repo layout. COMPLIANT.

**handOffs/hand-off-1.md** — historical session record (out-of-scope per mapping rules). Not flagged.

---

## Tags
#non-compliance #project-mapper #cleanup #giti

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
