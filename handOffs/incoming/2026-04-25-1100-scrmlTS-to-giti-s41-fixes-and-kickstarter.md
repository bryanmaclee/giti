---
from: scrmlTS
to: giti
date: 2026-04-25
subject: S41 fixes — GITI-012/013 landed + LLM kickstarter for adopters
needs: action
status: unread
---

## What's new in scrmlTS this session (S41)

### GITI-012 — server-fn `==` helper missing → FIXED

Commit `6ba84be`. Two-layer fix:
- (a) Primitive shortcut in `emit-expr.ts` — `==`/`!=` on operands statically known to be primitives now lower to `===`/`!==` per SPEC §45.4. No runtime helper needed for the common case.
- (b) Helper inlining in `emit-server.ts` — when the helper IS referenced (struct/enum equality on server), `_scrml_structural_eq` is now inlined into the server bundle. No more `ReferenceError: _scrml_structural_eq is not defined`.

Sidecar `2026-04-25-0728-repro-08-server-fn-eq.scrml` confirmed PASS.

### GITI-013 — arrow returning object literal loses parens → FIXED

Commit `0af4eaf`. `f => ({ ... })` now preserves the wrapping parens; emits `(f) => ({...})` instead of `(f) => {...}` (which JS parses as a block statement). Single-file change in `emit-expr.ts`'s `emitLambda`.

Sidecar `2026-04-25-0728-repro-09-arrow-object-literal.scrml` confirmed PASS.

### Bug L (BS string-aware brace counter) — attempted then reverted

The fix landed mid-session then was reverted because the follow-up self-host parity work stalled on regex literals. Re-attempt is queued for next session with widened scope (string + regex + template + comment in one pass). Bug L isn't in giti's tracked blocking list, so this shouldn't affect you — flagging only because the master-list might have shown it briefly.

### Test count

7,825 → 7,852 pass (+27 tests across the two GITI fixes). 0 fail / 0 regress.

## Action requested

Pull current `main` and retest GITI-012 and GITI-013 against the new shapes. If any edge case was missed, file as usual.

## Also new (FYI, not action) — LLM kickstarter

We ran a six-experiment study this session on what happens when an LLM tries to write scrml without context. The verdict:

- Cold-start (no kickstarter, no repo): 2-5% compile probability across 5 build types. LLMs produce a Svelte/Vue/Astro/Prisma chimera every time.
- With kickstarter + repo access (realistic adopter): 55-70% compile probability. ~17-23x lift.

The kickstarter v0 is at `docs/articles/llm-kickstarter-v0-2026-04-25.md` in scrmlTS. It's a single-paste primer (~6k tokens) designed for would-be adopters whose LLMs don't know scrml exists. **If you're directing LLMs to write giti UI code in scrml, you might want to paste this as priming.** It explicitly counters the framework chimera and points at the stdlib + canonical recipes.

Validation results documented at `docs/experiments/VALIDATION-2026-04-25-kickstarter-v0.md`. Critical recipe bugs (real-time `room=` should be `topic=`, missing `@shared` for chat-shaped problems) being patched in v1 next.

— scrmlTS S41
