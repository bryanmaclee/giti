---
from: scrmlTS
to: giti
date: 2026-05-29
subject: Resume dogfooding on v0.6.7 — Bug-51-class audit landed; channels/SSE/auth are the high-value targets
needs: action
status: unread
---

# Resume scrml dogfooding — build v0.6.7

The compiler is ready for giti to resume dogfooding + bug-hunting. **Pull `origin/main` and use the `v0.6.7` tag (release `18de30ba`)** — do NOT dogfood on v0.6.6 or earlier; several silent-miscompiles were just fixed.

## The headline lesson from this round (S140 Bug-51-class audit)

We ran an empirical audit and found **5 silent-miscompiles on 8 shipped surfaces**: features that compile to exit-0, pass `node --check` on every emitted artifact, but are **runtime-broken** — because the test tier was emit-string-only with no happy-dom runtime coverage. The class hid bugs for multiple sessions.

**The single most valuable thing you can report: anything that compiles clean but behaves wrong at runtime.** "It compiled but the list didn't render / the handler threw / the button never enabled" is gold — that's exactly the class our unit tests miss. Don't assume "it compiled, so the compiler's fine."

## Fixed in v0.6.7 (re-test these if you hit them before)

- **`<each>` Tier-1 iteration** — was shipping a runtime-dead list (`_scrml_reconcile_list` called but never defined → ReferenceError on first render). Any `<each>`-only page is now correct. (Bug 57)
- **`<tableFor selectable=…>` per-row checkbox** — every per-row toggle threw `ReferenceError: evt is not defined`. Fixed. (Bug 59)
- **`formFor` validation surface** — the form rendered inputs but validation was 100% dead (validators unwired, `isValid`/errors/`submitted` never emitted) AND the submit button stayed disabled even when valid (`@form.isValid` read the wrong cell). Both fixed: the validity surface emits + is reactive, and the submit button enables when valid — **`formFor` is now functional end-to-end.** (Bug 58 + Bug 61)
- **GITI-017** (`not` keyword corrupting regex literals) — RESOLVED.

## Known-broken — please do NOT re-report (route around these)

- **Bug 54** — `<tableFor>` `<column field="x" :let={(row) => <custom markup/>}>` custom per-cell renderer is **silently dropped** at the parse layer; the column falls back to default text render. DEFERRED (parse-layer fix). Avoid `:let` on `<column>` for now.
- **Bug 60** — render-by-tag on a **nested compound field** (`<form><userName/></form>` where `userName` is a Shape-2 field inside the `form` compound) emits literal tags; the input never appears. DEFERRED. Top-level Shape-2 render-by-tag works fine.
- **GITI-015** — still queued (LOW).

## Highest-value targets for giti specifically

The S140 audit covered each / formFor / tableFor / schemaFor / engine-effect / onTransition / lifecycle. It did **NOT** exercise the runtime tier of the surfaces giti leans on hardest — these are where the next silent-miscompiles most likely live:

- **`<channel>`** (§38) — file-level, V5-strict body (`<x> = init` declares an auto-synced cell; `@x` reads/writes; no `@shared`). Multi-client sync, `broadcast()`/`disconnect()`, `onserver:*`/`onclient:*` handlers.
- **SSE** (§37) — `server function*` generators.
- **Real-time multi-user** — concurrent writes, reconnect (`channel-reconnect=`), cross-client state convergence.
- **Auth** (§40) — `<auth role="…">` first-class element (compile-time visibility, per-role chunk splitting), `scrml:auth` / `scrml:oauth` stdlib, login-redirect inference.
- **Schema + migrations** (§39) — `<schema>` DDL, `schemaFor(Struct)`, the dev-mode migration diff.

## Reproducer protocol (required — see the cross-repo bug-report rule)

Every bug report MUST include a minimal, self-contained `.scrml` reproducer (inline fenced block for ≤~200 lines, or a sidecar `.scrml` next to the report), version-stamped (`compiled against scrmlTS@v0.6.7 / 18de30ba`, exact command), with expected-vs-actual stated. Drop reports into `scrmlTS/handOffs/incoming/`. Without a reproducer we'll bounce it back asking for one.

Fire away — your surfaces are the ones we haven't runtime-swept yet.
