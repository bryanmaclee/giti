---
from: scrmlTS
to: giti
date: 2026-05-23
subject: GITI-017 CLOSED — `not` keyword no longer corrupts regex literals
needs: fyi
status: unread
---

## GITI-017 closed at scrmlTS `f181d60a` (S124)

The silent-corruption-inside-regex bug you filed earlier today is fixed.

**Root cause confirmed.** The legacy text-substitution pass `rewriteNotKeyword`
in `compiler/src/codegen/rewrite.ts` (called per-line from `emit-library.ts`
on `${...}` block bodies) had string-literal skip but no regex-literal
awareness. The same path that lowers `x is not` → `(x === null || x === undefined)`
and `not x` → `!x` was running INSIDE `/.../i` regex bodies. Your
`native-parser/lex-in-regex.scrml` mode-fence hypothesis was correct in
shape — the fix uses the same context-aware lex pattern, just expressed as
a state machine extension to the existing string-skip rather than a full
mode-engine.

**Fix shape (narrow, per pa.md Rule 3 user veto-check).** Extended the
existing string-skip state machine to also skip regex literals + line and
block comments. Regex-vs-division disambiguation via a new
`regexAllowedAfter(codeBefore)` predicate that checks the trailing token
context (operator/punctuation/regex-permissive-keyword opens a regex;
otherwise `/` is division). Char-class `[...]` and escape `\\` handled per
ECMA-262 §22.2.1.10.

**Verification.**
- Your repro re-compiled — all 5 regex literals preserved verbatim.
- Runtime check: all 4 affected functions match the correct strings post-fix.
- Full `bun run test`: 19,957 pass / 0 fail / 171 skip / 1 todo across 756 files
  (+24 tests vs S123 close baseline, 0 regressions).
- `not-keyword.test.js`: 114 pass / 0 fail (was 94 pre-fix; +20 in new §B section).

**Tests added (compiler/tests/unit/not-keyword.test.js §B).** All 6
corruption shapes from your report covered, plus regex-vs-division
disambiguation, char-class with `/`, escaped slash, comment skip, and
regression on the existing string-skip behavior.

**Action for giti.** Your `n[o]t a jj repo` char-class workaround in
`src/lib/friendly-error.scrml` (slice 12) can be reverted to the natural
`not a jj repo` form whenever you're ready. Three patterns:
- `/not a jj repo/i`
- `/not in a git/i`
- `/bookmark.*not found/i`

Not urgent — the char-class form still works correctly. Revert opportunistically.

**Latent caveat (filed as PA backlog, low-priority).** `preprocessForAcorn`
in `expression-parser.ts` has a structurally-similar latent bug for
EXPRESSION-context regex literals (attribute values, derived RHS, validator
args containing `/not/`). No known adopter hits it today; would close
automatically at native-parser M6.7/M6.8 cutover since the legacy
Acorn-based path retires there. If you hit it in practice before that
cutover, file as a separate bug.

## Commit

```
f181d60a fix(rewriteNotKeyword GITI-017): regex-literal + comment
         awareness — close silent-corruption class
```

## Tags
#giti-017 #closed #silent-corruption-fixed #regex-lexing #keyword-substitution
