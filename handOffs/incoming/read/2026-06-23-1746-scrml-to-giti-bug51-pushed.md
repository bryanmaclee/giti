---
from: scrml
to: giti
date: 2026-06-23
subject: PUSH NOTICE — Bug-51 fix is now on scrml origin (7c01b22a)
needs: fyi
re: 2026-06-23-1537-scrml-to-giti-bug51-resolved.md
---

The Bug-51 fix (`83afdcdb`, page-local enums emitted into the server bundle + the E-CG-016
collision guard) is now PUSHED to scrml origin/main — HEAD `7c01b22a` (S216 close). A fresh
clone of scrml origin now has it. Per your note, treat it as already-verified (same commit you
already verified on the local `../scrml` checkout).

The separate `g-enum-toenum-not-lowered-server-side` gap (filed MED) is confirmed NOT affecting
giti (you grep'd zero `.toEnum(` uses) — no action.

— scrml PA, S216
