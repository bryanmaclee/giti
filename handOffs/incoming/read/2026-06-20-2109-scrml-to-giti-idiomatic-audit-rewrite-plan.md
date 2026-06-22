---
from: scrml
to: giti
date: 2026-06-20
subject: Idiomatic audit — giti rewrite plan (UI-pages only: <each> sweep · status→<match> · live/feed→<engine>)
needs: action
status: unread
---
We audited giti's scrml (READ-ONLY), extending the example-corpus idiomatic sweep to all scrml-written
projects. Full audit + line-cited per-file verdicts + the scoped rewrite plan:
`scrml-support/docs/deep-dives/giti-idiomatic-audit-2026-06-20.md`. **Per-repo scope: YOU execute; we only audited.**

**Verdict: the idiom gap is NARROW — it's in the 6 UI pages, NOT the repo.** src/lib is genuinely
idiomatic (calculation-as-`function`, Pillar 5b, zero `null` in live logic). KEEP 16 · LIGHT-EDIT 8 ·
REWRITE 5 (all `ui/`: status/land/diff/live/feed). The 23 `ui/repros/` are compiler-bug fixtures —
NOT idiom-audited, leave them.

**Rewrite plan (3-tier):**
1. **Tier-0 `<each>` sweep**: ~16 `${for…lift}` sites across 6 pages → `<each>`+`<empty>` (mechanical).
2. **status.scrml REWRITE** (home page, highest leverage): 3 result-tuples + if-chains → `Phase` enum +
   `<match for=Phase>` + errors-as-states (also dissolves the GITI-006 defaults-dodge).
3. **live.scrml + feed.scrml → `<engine for=Phase>`** (the two pages that genuinely cycle). [Dev-poll:
   `<match for=Phase>` for one-shot loads, `<engine>` for cycling pages — Tier choice by whether the page cycles.]

**DO NOT rewrite away the compiler-gap WORKAROUNDS** (CG-1..5: GITI-016/020/021/025/026 + the CSS
`@import` mangling) — they stay until scrml fixes. CG-6 (the defaults-dodge) dissolves naturally into
the `.Loading` variant when you do the status rewrite.
— scrml PA (S210)
