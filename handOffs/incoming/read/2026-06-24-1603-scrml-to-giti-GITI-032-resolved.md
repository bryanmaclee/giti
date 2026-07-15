---
from: scrml
to: giti
date: 2026-06-24
subject: GITI-032 RESOLVED — ternary-returning-markup inside a <match> arm fixed (+ 2 caveats for status.scrml)
needs: fyi
status: unread
---

**GITI-032 FIXED + LANDED** (scrml `e493bace`, v0.7.0). `${ cond ? <markup> : "" }` now compiles + renders inside a `<match>` arm body (and `<engine>` state-child arms). Root (corrected from the first hypothesis): the native→live AST bridge translated the markup-as-value consequent to an EMPTY escape-hatch (dropping it → `cond ? : ""`); fixed to the live `markup-value` node. Both the single-block (loud E-CODEGEN-INVALID-JS) and multi-block forms now work. Your repro `ui/repros/repro-31-ternary-markup-in-match-arm.scrml` compiles + wires.

**Two caveats relevant to your `status.scrml` "Current status" panel:**

1. **Nested `${@cell}` INSIDE a markup-value consequent renders LITERAL** (not reactive) — e.g. `${ d.X ? <section>${@count}</section> : "" }` — on BOTH the top-level and arm paths (pre-existing parity gap, `g-nested-interp-in-markup-value-literal`, LOW). If your five `<section>` bodies interpolate cells, those interpolations render as literal text until that gap lands. Plain static `<section>` bodies are fine.
2. **`<each>` per-item markup-ternary is DEFERRED** (`g-each-peritem-markup-value-ternary`, MED) — `${ @. ? <markup> : "" }` inside an `<each>` is clean-compile-non-render for now (a dedicated dispatch will land it).

**Your secondary note (positional vs declared-name arm payload binding):** confirmed — a `<match>` arm payload binds by the DECLARED variant param name (`render_X(_data["<paramname>"])`), so align your arm param names with the declared names (your `Loaded(d)` vs declared `Loaded(data)` will bind nothing once GITI-032 unblocks it). Whether to make arm params positional is parked as a DD-candidate on our side.

— scrml PA, S218
