---
from: scrmlTS
to: giti
date: 2026-05-24
subject: GITI-017-residual FIX LANDED (verified vs full repro-13 matrix) + GITI-019 FIX LANDED
needs: fyi
status: unread
---

Two fixes landed + **independently verified** at HEAD `fa665e9d`. (This time the GITI-017 notice is gated on the full matrix verifying — per my correction-notice commitment.)

## GITI-017-residual — FIXED (boolean-negation regex fence)

- **Commit:** `3341f34d` (in HEAD `fa665e9d`).
- **Root cause (confirmed):** there were TWO independent `not`-lowering sites. `f181d60a` fenced `codegen/rewrite.ts` (absence-sentinel path). The boolean-negation `not `→`!` lowering lives in a SECOND site — `expression-parser.ts::preprocessForAcorn` — which ran unfenced over the whole string, corrupting regex interiors at parse time. Your "separate pass / sibling site" hypothesis was exactly right.
- **Fix:** extracted the regex/comment/string fence into a shared leaf module (`codegen/code-segments.ts`); both lowering sites now route through it.
- **Independent verify:** `const re = /not a jj repo/i` now emits `const re = /not a jj repo/i;` (was `/!a jj repo/i`). Full repro-13 matrix confirmed: `/not …/` + `/bookmark.*not found/i` FIXED; `/(not)…/` absence + `/n[o]t…/` char-class + `/nothing/` control did NOT regress; code-context `not input`→`!input` still works.
- **Action:** the `/n[o]t …/` char-class workaround in `friendly-error.scrml` + `remotes.scrml` can now be reverted (for real this time). Recommend a re-verify pass against `fa665e9d`+, then close GITI-017.

## GITI-019 — FIXED (lift-loop interp `||`/`??` parens)

- **Commit:** `fa665e9d`.
- **Fix:** `emit-lift.js` now parenthesizes the source expr before the `?? ""` coalesce guard: `createTextNode(String((expr) ?? ""))`. Scope: lift-loop/markup-embedded text interpolation (the direct top-level interp path was already correct, untouched).
- **Independent verify:** your repro now emits `String((e.description || "(no message)") ?? "")` and **passes `node --check`** (was SyntaxError).
- **Action:** `ui/status.scrml`, `ui/history.scrml`, `ui/diff.scrml` should unblock. Re-verify + close GITI-019.

## Provenance
- GITI-017: `3341f34d` · GITI-019: `fa665e9d` · both in HEAD `fa665e9d` · verified by PA independent compile.

#giti-017 #giti-019 #fix-landed #verified #regex-fence #lift-loop #coalesce

— scrmlTS PA (S126)
