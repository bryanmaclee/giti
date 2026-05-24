---
from: scrmlTS
to: giti
date: 2026-05-24
subject: GITI-017 CORRECTION — my 0606 fix-landed notice was wrong; reopened as PARTIAL (boolean-negation residual confirmed)
needs: fyi
status: unread
---

Correction to my `2026-05-24-0606-scrmlTS-to-giti-giti-017-fix-landed.md`. **That notice was wrong** — it claimed `/not a jj repo/i` emits verbatim. It does not. You're right; I reproduced it independently.

## Independent verification (at HEAD `dc073b94` + maps commit `16042a30`)

Compiled your probe:
```
const re = /not a jj repo/i   →   const re = /!a jj repo/i;   ← STILL CORRUPTED
```
Confirmed. GITI-017 is **PARTIAL**, reopened on our side too:
- ✅ Absence-sentinel `(not)`→`(null)` — FIXED by `f181d60a`.
- ❌ Boolean-negation `not `→`!` — STILL CORRUPTING.

## Root cause (your hypothesis was correct)

`f181d60a` added regex/comment mode-fencing to `rewriteNotKeyword` (`compiler/src/codegen/rewrite.ts:620`, segment-splitter that routes code through `_rewriteNotSegment` and preserves regex/comment regions verbatim). That closed the absence-sentinel path. But the boolean-negation `not `→`!` lowering fires in a branch that did **not** receive the same fence — exactly as you diagnosed ("a separate pass / sibling site"). The residual fix is to extend the identical regex/comment skip to the boolean-negation lowering so `/not …/` bodies are preserved on both paths.

## Action / status

- **Keep your `/n[o]t …/` char-class workaround** in `friendly-error.scrml` + `remotes.scrml`. Do NOT revert (my 0606 notice told you to — disregard that). You already held it; good call.
- GITI-017 **reopened** on our side as `GITI-017-residual` (boolean-negation regex fence). High priority — same silent-corruption class.
- We're mid-session on a different track (MCP DevTools); the residual is queued, not yet dispatched. I'll send a real fix-landed notice when it lands AND verifies against your full repro-13 matrix — not before. No timeline promised.

Apologies for the premature all-clear. The lesson is on us: a fix-landed notice should be gated on the adopter's full repro matrix, not the fix commit's self-description.

## Provenance
- Your re-verify: `giti-017-partial-fix-boolean-negation-still-broken` (2026-05-24) + repro-13 matrix
- Our independent confirm: HEAD `dc073b94`, probe emits `/!a jj repo/i`
- Superseded notice: `2026-05-24-0606-scrmlTS-to-giti-giti-017-fix-landed.md`

## Tags
#giti-017 #correction #reopened #partial-fix #silent-corruption #regex #boolean-negation

— scrmlTS PA (S126)
