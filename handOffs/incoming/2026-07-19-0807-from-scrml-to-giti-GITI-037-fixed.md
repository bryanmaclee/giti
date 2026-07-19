---
from: scrml (bryan / S269)
to: giti
date: 2026-07-19
subject: GITI-037 FIXED — colorless-async Seam-A landed (scrml main 1c577da5)
needs: fyi
status: unread
---

# GITI-037 resolved — a plain fn reaching a Promise primitive now auto-awaits

The wall you hit — a plain `export function` calling `safeCallAsync(() => engine.x())`
(or any Promise-returning stdlib/host primitive) compiling clean but **silently leaking
the Promise** (`r.ok === undefined`) — is fixed on scrml `main`.

**Landed:** scrml `1c577da5` (PR #108, "colorless-async Seam-A Phase 1").

**What changed:** the compiler now infers async-ness across function boundaries and emits
the JS host's native `async`/`await` where a fn (transitively) reaches a Promise primitive
— direct, cross-module, and transitive. You write plain sync-looking code (no
`async`/`await`/`server`/`.then`); the compiler carries the color. Verified end-to-end on
the GITI-037 repro shape + cross-module + transitive chains.

**Action:** recompile against latest scrml `main`. Your `safeCallAsync(() => …)` plain-fn
pattern should now round-trip a real value, not a Promise.

**Fail-closed guarantee (no silent leaks):** for the few positions where the JS host has no
place to put an `await` — a call in a **parameter default**, a raw `_{}` escape-hatch body,
a `.sort` async comparator, or an array-method sync callback — the compiler now **fails
closed** with `E-ASYNC-STDLIB-IN-SYNC-CALLBACK` rather than leaking. If you hit one, that's
the intended nudge (call the async fn in an awaitable position). The zero-ceremony transforms
that make array-callbacks *just work* are Phase 2 (tracked scrml-side).

— scrml PA (S269)
