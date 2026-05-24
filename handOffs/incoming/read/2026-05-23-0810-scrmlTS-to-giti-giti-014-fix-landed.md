---
from: scrmlTS
to: giti
date: 2026-05-23
subject: GITI-014 FIX LANDED — zero-arg arrow object-literal paren wrap
needs: fyi
status: unread
---

GITI-014 (zero-arg arrow returning object literal misses parens — all 5 giti UI pages broken at runtime) is **FIXED** in scrmlTS as of S122 Unit DD.

## Landing commit

`18b90f12 fix(codegen Wave 14 Unit DD): GITI-014 zero-arg arrow returning object literal — paren-wrap all 5 thunk emit sites in emit-logic.ts`

## Scope of fix

The bug was at **5 thunk emit sites** in `compiler/src/codegen/emit-logic.ts` (not just 1 as the GITI-014 report framed it — the agent surveyed the full surface area):

- `_emitDefaultSidecar` line 560 — `_scrml_default_set` thunk
- `_emitInitThunkSidecar` structured arm line 634 — `_scrml_init_set` (initExpr path)
- `_emitInitThunkSidecar` fallback arm line 644 — `_scrml_init_set` (raw-string path)
- tilde-decl reactive arm line 1448 — `_scrml_derived_declare`
- const @-decl derived arm line 1781 — `_scrml_derived_declare`

Plus a helper extension in `compiler/src/codegen/emit-expr.ts`:
- Exported `arrowBodyNeedsParens` (existing GITI-013 helper)
- Added `arrowBodyStringNeedsParens` for string-form arrow bodies (the fallback sites in emit-logic.ts use raw strings, no structured ExprNode — needed the string variant)

## Verification

- Source pattern: `@probe = { error: not, count: 0 }`
- Pre-fix emit: `_scrml_init_set("probe", () => {error: null, count: 0});` ← BROKEN (block-with-labelled-statements)
- Post-fix emit: `_scrml_init_set("probe", () => ({error: null, count: 0}));` ← correct
- `node --check` passes on emit output

14 new regression tests in `compiler/tests/unit/arrow-object-literal-init-thunks.test.js` covering init_set / default_set / derived_declare across scalar / array / object / GITI-013 coexistence. 0 regressions in full suite.

## Pre-existing finding noted (NOT GITI-014 scope)

During the fix the agent surfaced an unrelated defect: `~snapshot = {...}` tilde-decl with reactive deps emits `let _scrml_tilde_3 = ~;` (raw tilde sigil leaked into output). Filed as separate observation. Not blocking; doesn't affect GITI-014's resolution.

## scrmlTS SHA at fix landing

`a2eb9096` (S122 wrap, includes Unit DD `18b90f12` + many other Wave 12-14 + M6 Wave 1 landings).

## Recommendation

Pull scrmlTS to S122 wrap (will be available on origin post-push), recompile your UI repros, confirm all 5 pages render real data again. If anything residual, file a fresh bug report with sidecar repro per the cross-repo bug-report convention.

## Tags
#giti-014 #scrmlTS-s122 #unit-dd #codegen #arrow-paren-wrap #FIXED
