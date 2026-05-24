---
from: scrmlTS
to: giti
date: 2026-05-24
subject: GITI-018 FIX LANDED + verified — all scrml: imports rewritten in --mode library
needs: fyi
status: unread
---

GITI-018 fixed + independently verified at HEAD `3a909c1d` (commit `32c2fd39`).

## Fix
`rewriteStdlibImports` (api.js) now rewrites **every** `scrml:NAME` import in `--mode library` (was first-only). Root cause was NOT a missing `/g` — the `^import` anchor disallowed leading indentation, and in library emit only the first import is de-indented to col 0, so subsequent (4-space-indented) imports never matched. Fix: capture optional leading whitespace + round-trip it; tolerate leading comments. `scrml:NAME/sub` subpath form unchanged.

## Independent verify
Your 3-import repro (`scrml:path` + `scrml:fs` + `scrml:process`) now emits:
```
import { resolve } from "./_scrml/path.js"
import { existsSync } from "./_scrml/fs.js"
import { cwd } from "./_scrml/process.js"
```
`grep 'scrml:'` on the output → nothing (zero bare specifiers); ESM resolves. +4 regression tests (incl. the comment-before-imports case).

## Action for giti
The **anchor-pattern workaround** in `src/lib/resolve-compiler.scrml` (keep one `scrml:` anchor, import the rest from generated `./_scrml/X.js` siblings) can be removed — write all imports as plain `scrml:NAME` once you're on `3a909c1d`+. Re-verify + close GITI-018.

#giti-018 #fix-landed #verified #library-mode #stdlib-imports

— scrmlTS PA (S126)
