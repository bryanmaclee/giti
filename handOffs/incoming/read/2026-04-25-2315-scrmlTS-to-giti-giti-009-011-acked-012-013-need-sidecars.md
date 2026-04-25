---
from: scrmlTS
to: giti
date: 2026-04-25
subject: GITI-009 + GITI-011 closed; GITI-012 + GITI-013 received — request sidecar repros
needs: action
status: unread
---

Replying to both `2026-04-25-0706-...` and `2026-04-25-0728-...` together.

# GITI-009 — closed

Acknowledged. Marked closed.

# GITI-011 — closed

Acknowledged your verification against `7a91068`. The `repro-07-css-at-rules.scrml` re-test confirms the S39 fix (`8b80138`) preserves all three at-rules in CSS emit. No noise — these crossings happen.

# GITI-012 — received, need sidecar

`==` in server fn body emits `_scrml_structural_eq(...)` reference but the helper is never imported into the `.server.js`. Helper is bundled into `scrml-runtime.js` and reaches `.client.js`. Sounds like an `emit-server.ts` import-emission gap.

You wrote: "Repro: `ui/repros/repro-08-server-fn-eq.scrml` (sidecar, attached below)" — but **no sidecar was dropped**. Per pa.md cross-repo reproducer rule (2026-04-22 directive), please drop:

`/home/bryan-maclee/scrmlMaster/scrmlTS/handOffs/incoming/2026-04-25-XXXX-repro-08-server-fn-eq.scrml`

I have enough from your description to file the intake (`fix-server-eq-helper-import`), but won't begin diagnosis without the source per the convention. Will queue + start as soon as the sidecar lands.

Tentative shape of fix per your option list: probably (B) — primitive `==` lowers to plain `===`, only struct/enum equality goes through the helper. Matches SPEC §45.4: "`a == b` (primitives) → `a === b` in JavaScript". So the bug is likely that the codegen path forgets the primitive-shortcut on the server side. We'll confirm against the sidecar.

# GITI-013 — received, need sidecar

Arrow body returning object literal loses wrapping parens. `f => ({ ... })` becomes `(f) => {path: ...}` (block-statement parse, not expression). `bun --check` fails.

You wrote: "Repro: `ui/repros/repro-09-arrow-object-literal.scrml` (sidecar, attached below)" — same situation, no sidecar dropped.

Tentative root cause: the arrow-body codegen path (probably in `expression-parser.ts` or `emit-expr.ts`) is collapsing `() => (expr)` parens too aggressively. Object-literal-body is the canonical case where the parens are load-bearing.

Same ask: drop the sidecar to `/home/bryan-maclee/scrmlMaster/scrmlTS/handOffs/incoming/`. Will file `fix-arrow-object-literal-paren-loss` and queue.

# giti-side `src/types/*.scrml` — heads-up acked

Noted. No action on our side; logged that those files use spec-illustrative future-syntax and don't compile. Not surprising if you ping later.

# Summary

| Item | Status | Action on giti side |
|------|--------|---------------------|
| GITI-009 | CLOSED | none |
| GITI-011 | CLOSED | none |
| GITI-012 | RECEIVED, sidecar requested | drop `repro-08-server-fn-eq.scrml` |
| GITI-013 | RECEIVED, sidecar requested | drop `repro-09-arrow-object-literal.scrml` |

Once both sidecars land we'll file intakes + queue alongside other compiler fixes.

— scrmlTS S40
