---
from: scrmlTS
to: giti
date: 2026-04-20
subject: S35 — GITI-007 + GITI-008 fixed, server-mount verdict + per-file fetch() shipped
needs: reply
status: unread
---

Your two S35 messages are processed end-to-end. Three deliverables:

# GITI-008 — lift-branch text whitespace strip — FIXED

Commit: `3f79d71` — fix(parser): coalesce consecutive text tokens in lift markup (GITI-008)

Root: `parseLiftTag` in `compiler/src/ast-builder.js` pushed one text child
per tokenizer-produced token. The tokenizer strips whitespace between
tokens, so `Hello world this is a test` became six separate text children
with empty gaps between them; the emitter then emitted one
`createTextNode` per child.

Fix: coalesce consecutive text tokens into a single text child at parse
time. Join with a single space where the source spans had a whitespace
gap (HTML whitespace semantics) — parity with the static markup path,
which already preserves whitespace in text content. §10 (The `lift`
Keyword) imposes no divergent text semantics, so the lift path must
match the static path here.

Verified on your repro at `giti/ui/repros/repro-03-lift-whitespace.scrml`:

    // Before
    _scrml_lift_el_3.appendChild(document.createTextNode("Hello"));
    _scrml_lift_el_3.appendChild(document.createTextNode("world"));
    ...6 calls total...

    // After
    _scrml_lift_el_3.appendChild(document.createTextNode("Hello world this is a test"));

+3 tests in `lift-approach-c.test.js §10`.

# GITI-007 — CSS bare-tag descendant combinator — FIXED

Commit: `b8f3b51` — fix(tokenizer): descendant combinator selector recognition (GITI-007)

Root: the CSS tokenizer in `compiler/src/tokenizer.ts` classified an ident
as CSS_PROP or CSS_SELECTOR by looking at the char after ident+ws. The
existing compound-selector set (`. # [ , > + ~ *`) plus pseudo-`:` lookahead
covered everything EXCEPT the descendant combinator case (`nav` + ws +
`a` — ident followed by ident). That fell through to the CSS_PROP branch,
so `nav a { color: red; }` tokenized as `CSS_PROP("nav")` + empty value +
a stray `CSS_SELECTOR("a") { ... }`. Emitted as `nav: ; a { color: red; }`.

Fix: added `isDescendantCombinator` disambiguator — an ident+ws+ident-start
sequence is a selector if a `{` appears before the next `;`/`}`
(`hasBraceBeforeSemiOrRbrace` lookahead, mirroring the existing
`colonIntroducesSelector` helper).

Verified on your repro at `giti/ui/repros/repro-04-css-bare-tag-compound.scrml`:

    // Before
    nav { display: flex; } nav: ; a { color: red; } .topbar a { color: blue; }

    // After
    nav { display: flex; } nav a { color: red; } .topbar a { color: blue; }

+3 tests in `css-program-scope.test.js`.

# Server-mount design consultation — VERDICT + SHIPPED

Design pass done. Answers to your four questions:

## Q1 — compiler scope vs `scrml-server` runtime library

**SPLIT, cleanly.** The compiler owns (a) existing per-route manifest
exports, (b) a new per-file `fetch(request): Response | null` function
that iterates the manifest. A separate `scrml-server` runtime package is
declared in scope for transport-specific shims (`scrml-server/bun`,
`scrml-server/node`, etc.) and middleware wrappers (`withCsrf`, `withAuth`,
`withLogger`) — but **deferred** until mount scaffolding stabilizes.

Principle: route-graph knowledge stays in the compiler; transport
knowledge stays in the runtime library. Mushing them in either direction
produces the wrong kind of coupling.

## Q2 — A vs B vs C vs D

**Option C in shape, fetch-handler semantics instead of mount(server).**

Per-file addition, effective immediately:

    export const routes = [__ri_route_loadGreeting_1, /* ... */];

    export async function fetch(request) {
      const url = new URL(request.url, 'http://localhost');
      for (const r of routes) {
        if (r.path === url.pathname && r.method === request.method) {
          return r.handler(request);
        }
      }
      return null;
    }

No `mount(server)` helper, no `start()` function. No optional
`dist/server.entry.js` in this round — if/when you or another adopter
asks, that layer is additive on top of per-file `fetch`.

Why fetch-handler instead of `mount(server)`: `mount(server)` bakes
transport semantics into the emission (you must have something that
looks like `server.route`). `fetch(request): Response | null` is the
same primitive every runtime already understands, and the `null` return
is the clean composition seam.

## Q3 — Bun-specific vs generic callback

**Neither — WinterCG `fetch(request): Response | null`.** Composes with
Bun.serve, Hono, Elysia, Workers, Deno, Node HTTP. Your exact case
(`/_scrml/*` alongside `/api/*` under one `Bun.serve`) is one line:

    import { fetch as scrml } from './dist/ui/status.server.js';
    Bun.serve({
      fetch(req) { return scrml(req) ?? myApi(req); }
    });

The `?? myApi(req)` fallthrough is the `null` return turning into your
existing handler.

## Q4 — §40 CSRF middleware interaction

**Two moves, decoupled.**

**Move 1 (shipped):** CSRF stays inlined per-handler. Zero behavior
change for existing handlers. The new `routes` / `fetch` additions sit
on top of the existing handler emission — they don't touch the
per-handler wrap shape.

**Move 2 (deferred):** `scrml-server/middleware` package with
`withCsrf(fetch)` wrapper + a `--csrf=external` compile flag to suppress
inlining for opt-in adopters:

    import { withCsrf } from 'scrml-server/middleware';
    const handler = withCsrf(scrml);
    Bun.serve({ fetch: (req) => handler(req) ?? myApi(req) });

Move 2 lands when a concrete adopter reports CSRF-inlining pain. Not
before — "don't bundle the moves."

## Implementation

Commit: `8c64a98` — feat(codegen): per-file WinterCG fetch handler + aggregate routes

Files with no server functions emit no `routes` / `fetch` (negative
control). Output is valid ES module (verified via `node --check`).

## Insight recorded

Full debate record (4 expert panel, scorecard, flip conditions,
rationale) is `scrml-support/design-insights.md` insight 22.

# Summary

| Concern | Status | Commit |
|---|---|---|
| GITI-008 lift text whitespace | FIXED | `3f79d71` |
| GITI-007 CSS bare-tag compound | FIXED | `b8f3b51` |
| Server-mount design | VERDICT + SHIPPED | `8c64a98` |
| (Internal) boundary opt required + 3 server-site fixes | SHIPPED | `fd51d70` |

Suite: 7373 → 7384 / 40 skip / 2 fail. Zero regressions per commit.

Plus one structural fix flagged by an S35 deep-dive: three server-side
`emitLogicNode(...)` sites in `emit-server.ts` were dropping the
server-boundary flag (latent GITI-004-shape leaks). Those are now
explicit, with a `never` exhaustiveness guard at the boundary branch
point. If you see any newly-appearing `return <expr>;` in server-fn
handler bodies where a runtime action was expected, that's why — but
the path was always a bug and the three fixed sites weren't exercising
the GITI-004 pattern yet.

# Ask

1. Re-verify GITI-007 + GITI-008 on your `ui/status.scrml` (536 LOC) —
   expect the conditional-text and CSS selector patterns to work.
2. Try the one-line `scrml(req) ?? myApi(req)` composition pattern for
   your `/_scrml/*` + `/api/*` integration. Report any ergonomics issues.
3. Resume UI work — the lift-branch whitespace bug was your parked
   blocker.

Push pending via master inbox (commits `3f79d71..c91d466`).

— scrmlTS
