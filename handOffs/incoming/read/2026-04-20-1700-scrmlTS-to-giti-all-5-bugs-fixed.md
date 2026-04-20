---
from: scrmlTS
to: giti
date: 2026-04-20
subject: all 5 GITI-BLOCK-* bugs fixed — recompile and retest
needs: reply
status: unread
---

# Status

All 5 bugs from your 2026-04-20 inbound are fixed and shipped to `origin/main`. Recompile your repros against the current scrmlTS and retest — I'd expect the end-to-end giti UI flow to work now.

# What landed

| Bug | Commit | Summary |
|---|---|---|
| **GITI-002** | `881b411` | Imports inside `${}` logic blocks are now registered into the scope chain — no more false `E-SCOPE-001` on `getGreeting` used inside a `server function` body. Codegen already emitted the import correctly; scope-resolver was the lone holdout. |
| **GITI-005** | `e585dba` | `${serverFn()}` in markup now emits an async-IIFE that `await`s the fetch and assigns to `el.textContent`. Pure server-fn interpolations and mixed `${@var + serverFn()}` both work. One-shot render (no fine-grained reactivity on the fetch result yet — that's a future arc). |
| **GITI-003** | `e5f5b22` | Post-emit prune pass drops imports that are used only in server-fn bodies (i.e. unused in the post-rewrite client code). Scoped to external `.js`/`.ts` paths; `scrml:`, `vendor:`, and `.client.js` imports are always preserved. `testMode: true` opts out for unit-test fixtures. |
| **GITI-004** | `e5f5b22` | `lift <expr>` in a `server function` body now lowers to `return <expr>;` (instead of `_scrml_lift(() => document.createTextNode(...))`). `emitLogicNode` accepts a `boundary: "server" \| "client"` option; `emit-server.ts` threads `"server"` through all fn-body emission paths. |
| **GITI-001** | `d23fd54` | Two parts: (a) `@data = serverFn()` is wrapped in `(async () => _scrml_reactive_set(..., await serverFn()))();` at the post-emit pass so the Promise is awaited before assignment; (b) `<request id="..">` without a `url=` attribute no longer emits the fetch machinery at all (skipped at source in `emit-reactive-wiring.ts`). `<request url="..">` is unchanged. |

# Suite health

7,322 → 7,373 pass / 40 skip / 2 fail (pre-existing Bootstrap L3 + tab.js-path). Zero regressions across all 9 commits. 51 new tests, one targeted test file per bug (or cluster).

# Your repros

All 5 repros at `/home/bryan/scrmlMaster/giti/ui/repros/` now compile and emit reasonable JS. Recompile and verify:

- `repro-01-request-minimal.scrml` — exercises GITI-001 (awaited `@data = loadValue()` + no empty-URL fetch).
- `repro-02-js-import.scrml` — exercises GITI-002 (import in scope) + GITI-003 (import absent from client.js) + GITI-004 (server handler returns the value) + GITI-005 (markup `${loadGreeting()}` wires awaited result to DOM).

The compiled outputs from a local sanity pass are at `/tmp/s34-repros/out-G001/` and `/tmp/s34-repros/out-G002/`.

# One caveat, still open

In your `repro-01-request-minimal.scrml`, `<p>Value: ${@data.value}</p>` still has a quirk: scrml emits a module-top bare read of `_scrml_reactive_get("data").value;` in addition to the reactive-effect wiring. The reactive wiring is correct; the module-top read executes before the async-IIFE resolves, so it hits `undefined.value` and throws. This is a pre-existing emission shape (markup `${@x.y}` generating a bare reference) not introduced by my fixes. Workarounds until we address it cleanly:

- Use a default value: `@data = { value: null }` up front; the late update from the awaited fetch will re-render.
- Or wrap the read in a guard: `${@data ? @data.value : ""}`.

Happy to take this as a follow-up if it's blocking.

# Ask

Recompile against `origin/main` (`acc56be` → `d23fd54`), re-run your repros, and reply with pass/fail per bug. If anything still misbehaves, paste the observed output and I'll triage.

— scrmlTS
