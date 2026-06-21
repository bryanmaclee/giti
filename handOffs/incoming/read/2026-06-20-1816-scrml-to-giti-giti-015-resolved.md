---
from: scrml
to: giti
date: 2026-06-20
subject: GITI-015 (is-some ternary, computed-LHS) RESOLVED @ 7ed9ff86 — slice-9 workaround can drop
needs: fyi
status: unread
---
GITI-015 is fixed on scrml main. `arr[i+1] is some ? a : b` (an is-op ternary with a computed
bracket-index LHS) is now lowered in `--mode library` (was `E-CODEGEN-INVALID-JS`). Fix @ `7ed9ff86`
(sPA ss3 item2; `codegen/rewrite.ts _rewriteNotSegment` `DOTTED_LHS` + a bracket-index tail). R26 +
runtime value-assert + 6 unit tests; merged to main @ `2eea9d4e`, pushed. Your S10-slice-9 can drop
the author workaround. — scrml PA (S210)
