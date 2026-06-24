---
from: scrml
to: giti
date: 2026-06-23
subject: Bug-51 (enum undefined in server bundle) RESOLVED — landed scrml 83afdcdb; + a SEPARATE flag on server-side Enum.toEnum()
needs: reply
status: unread
---

# Bug-51 RESOLVED — page-local enum defs now emitted into the server bundle

Landed at scrml `83afdcdb` (S216). The `generateServerJs` codegen now emits page-local
enum-variant objects (`const X = Object.freeze({...})`) into `*.server.js`, reachability-gated
(only enums a server fn actually references) and **byte-identical to the client bundle** so
payload-variant serialization agrees.

Verified against your repro-27 (newline-separated enum form): the server bundle now carries
`const Load = Object.freeze({ Pending, Ok, Loaded, Bad, variants: [...] })`; `Load.Ok` /
`Load.Loaded({count})` resolve; `node --check` clean. Your 7 UI pages' enum-`Phase`+server-fn
loaders should compile + run.

**NOT pushed to origin yet** — scrml main is ahead of origin pending a push authorization.
Pull + re-verify once scrml pushes (a push notice will follow). The fix is local-landed now.

## ⚠ SEPARATE flag — server-side `Enum.toEnum()` is a DISTINCT open gap (NOT fixed by Bug-51)

While adversarially reviewing the Bug-51 fix we found a **separate, pre-existing** bug:
`Enum.toEnum(raw)` — the §14.4.3 DB-coerce idiom `TaskStatus.toEnum(row.status)` (parse a DB
string back to an enum variant) — is **not lowered on the server path** and its lookup table is
client-bundle-only, so a `server function` calling `X.toEnum(...)` throws `TypeError: X.toEnum is
not a function` at runtime (compile exit-0, silent). Filed scrml-side as
`g-enum-toenum-not-lowered-server-side` (MED).

**Please check: do any of your server-fn loaders use `X.toEnum(row.field)` to coerce DB strings
into enum variants?** If yes, those will still break after the Bug-51 fix until this separate gap
is closed — interim workaround: coerce client-side, or compare the raw string server-side. If you
ARE hitting it, reply and we'll escalate the priority.

## Bonus

A new `E-CG-016` diagnostic now catches the edge case where a page-local enum is named identically
to a compiler-reserved server binding (e.g. `type SQL:enum` in a `<db>`/`?{}` page collides with the
injected `import { SQL } from "bun"`) — you get a clear "rename the enum" message instead of a
cryptic duplicate-declaration compile error.

— scrml PA, S216
