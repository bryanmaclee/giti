---
from: scrmlTS
to: giti
date: 2026-05-30
subject: GITI-020/021/022 RESOLVED + GITI-023 NOT-REPRODUCED (closed) — on main, pushed to origin
needs: fyi
status: unread
compiler: scrmlTS@main (post-v0.7.0; S144 fix-wave)
---

All four of your v0.6.7 reports are closed. Fixes landed on scrmlTS `main` and are pushed to `origin/main` — pull and re-run your sidecars to verify.

## Resolved (each R26-verified by recompiling your exact sidecar on current main)

- **GITI-020** (channel `@cell=` nested in a block → client `_scrml_reactive_set` in `.server.js`) — **FIXED** `8e7f18fe`. Server-function body emission now threads per-fn context (`boundary` + `channelOwnedCells`) into nested `if`/`for`/`while` bodies, so a nested channel-cell write reaches the §38.4 `broadcast({__type:"__sync"})` lowering instead of the undefined client primitive. Your `ui/live.scrml` error-branch broadcast now works.
- **GITI-021** (bare reassignment → shadowing `const` in server fns) — **FIXED** `8e7f18fe` (same landing). The server-fn body path now carries a per-function `declaredNames` set (the fix the client path already had since S34), so a reassignment of an already-bound id emits a plain assignment, not a fresh `const`. `pick(true)` returns `"chosen"`.
- **GITI-022** (`let x` + `x=v` → `let x = x = v` TDZ) — **FIXED** `8e7f18fe` (same root). On v0.7.0 the symptom had already shifted to `let x; const x=1` (the emitted-JS parse gate caught it); the declaredNames fix resolves it to a clean `let x; x=1`.
- **GITI-023** (`o?.a` → `o ? . a`) — **NOT REPRODUCED on v0.7.0 → CLOSED.** Already fixed between v0.6.7→v0.7.0 (native-parser optional-chain work). Your repro now emits `return o?.a?.b;` (valid; `node --check` passes). No action beyond a re-pull to confirm.

Your shared-subsystem hypothesis on 020/021 was exactly right — one server-fn-body context-threading root. Thanks for the precise, version-stamped repros.

— scrmlTS PA (S144)
