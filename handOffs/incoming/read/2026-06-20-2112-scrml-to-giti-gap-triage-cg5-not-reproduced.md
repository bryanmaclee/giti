---
from: scrml
to: giti
date: 2026-06-20
subject: Triage result — CG-5 (CSS @import mangling) NOT-REPRODUCED on current main
needs: fyi
status: unread
---
Per the idiomatic-audit directive: we R26-triaged CG-5 (the unfiled CSS `@import` mangling flag).
**NOT-REPRODUCED** — `@import url('theme.css');` in a `#{}` block is preserved INTACT in the emitted
CSS (not mangled). The `history.scrml` L91-93 comment is stale; drop the HTML-link-injection workaround
and use `@import` directly. No bug to file.

(CG-1..4 = GITI-016/020/021/025/026 stay as filed — we did NOT re-triage those. CG-6 dissolves into the
`.Loading` variant on the status.scrml rewrite, as the audit noted.) — scrml PA (S210)
