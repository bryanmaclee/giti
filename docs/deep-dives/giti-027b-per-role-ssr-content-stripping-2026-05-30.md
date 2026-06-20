---
status: complete
last-reviewed: 2026-05-30
tier: write-once
---

# Deep Dive: GITI-027B — per-role HTML content-stripping (SSR subtree elision) for `<auth role>`

**Date:** 2026-05-30
**Scope confirmed:** yes (PA pre-locked; verified against source in Phase 2)
**Feeds into:** debate (A vs B vs D — genuine multi-approach fork) → spec decision (lift or affirm the §40.9.5 deferral)

> **DISPOSITION (S146 — user-ratified directly; no debate run).** The user ratified the outcome rather than running the recommended debate: **A ratified canonical-now** (server-side omission; PA recipe-verified — the secret stays in `.server.js` only, 0 in HTML/client.js, compiles exit-0); **D ratified as the strategic direction**, queued as a high-leverage-gated arc (server-render-time gating runtime; spec-ahead-of-impl); **B rejected** (no per-role-static-variant prior art; re-opens OQ-A4-E (b); catastrophic-misconfig surface); **C killed** (security theater). SPEC §40.9.5 amended to record A-canonical + D-direction + B-rejected. design-insight 35. A and D compose via the §58 build-target declaration (A = static-target / until-D-ships answer; D = dynamic-target framework-owned gate). User verbatim: *"ratify A now, ratify D now but as an arc that can be started as immediately as is high leverage."*

---

## Scope

**Question:** Should scrml lift the §40.9.5 deferral and make `<auth role>` withhold HTML *content* per viewer role (per-role SSR subtree elision), or keep `<auth role>` as a JS-mount/code-split gate only and make server-side content omission the canonical answer?

**In scope:**
- The decision between (A) keep-deferred + sharpen the server-side recipe, (B) compile-time per-role HTML variants + serve-layer manifest, (D) server-render-time role-gating runtime.
- The static-compile-vs-request-time tension (§58.1) and its degradation story for static-CDN adopters under each option.
- A-4 splitter / reachability-solver reuse cost for (B).
- Prior art: Next.js, Remix, Astro, SvelteKit.
- giti's compile-on-serve unblock path under each option.

**Out of scope:**
- The 027A warning `W-AUTH-CONTENT-NOT-GATED` (already shipped, correct; not re-litigated).
- Option (C) runtime pre-paint DOM prune — PRE-KILLED (documented below in one paragraph; no research budget spent).
- The role-enum resolution / closure-analysis JS-mount-set machinery (already shipped, working per giti's report).
- Multiple-role-enum-per-unit (deferred to a later wave per §40.9.5).

---

## Context

**The §40.9.5 normative ruling (verified, `compiler/SPEC.md:19636-19645`).** `<auth role>` is normatively a JS-mount gate, NOT a content-secrecy control. Verbatim:

> "Per-role HTML content-stripping (SSR subtree elision) is NOT defined by this section and is a deferred design question."

And the canonical server-side answer is already stated:

> "Authors who need to withhold sensitive CONTENT from lower-role viewers SHALL enforce that gating server-side (e.g. branch on the authenticated role in a server-fn or page loader and omit the sensitive markup from the response body)."

So Approach A is *already the spec's stated answer*; GITI-027B asks whether to keep it as the answer or upgrade to B/D.

**The two-mode leak (verified, `auth-graph.ts:582-639` + giti report).** In DEFAULT mode (`compile <uiDir> -o <dist>`, no `--emit-per-route` — the mode giti actually serves) the gate is a complete content no-op: the `<auth role="Owner">` tag passes through `emit-html.ts` as a literal element and all children render verbatim. Under `--emit-per-route` the JS *mount set* is role-split but the served HTML still carries the gated subtree. giti measured both:

> "secret marker in served HTML: 1 / owner-only button in served HTML: 1 / owner handler wired in client bundle: 1 / role-check guards in client bundle: 0 / W-AUTH warning emitted: 0" (giti report, pre-027A; the warning ships now).

**The prior ratification that B reopens — OQ-A4-E (S91; `docs/changes/a-4-per-route-artifact-splitter-SCOPING/SCOPING.md:522-534`).** A-4 already deliberated *exactly* option B (per-(route,role) HTML) and rejected it for option C (hybrid: ONE HTML per route + role-bootstrap that loads the per-role JS chunk). The recorded rejection rationale:

> "Option (b) explodes the per-route output count (24 trucking-dispatch pages × 5 roles = 120 HTML files) and couples HTML emission to server-side role-routing infrastructure which scrml doesn't have today."

And the chosen shape's defining property, verbatim:

> "Per-route HTML is the SAME bytes for every role. Per-role variance is in the initial chunk. This is the simplest spec-shape."

CRITICAL: that S91 rejection was made on *output-count + infrastructure* grounds, with the SSR leak treated as acceptable. The **security footgun was not weighed in the OQ-A4-E decision.** GITI-027B is the first time the leak is the driving concern. So B is not "already killed" — it was killed on a different axis. (`emit-html.ts:2161-2163` carries the OQ-A4-E ruling in-code: "ONE HTML per route... No per-(route, role) HTML files are emitted.")

**The static-compile commitment (verified, `SPEC.md:30406-30423`, §58.1).** scrml is `compile(source, buildStory) → artifact`, a *pure function*. Verbatim:

> "This is **deliberately not a live or hot-swappable compiler.** ... No build axis outside `(source, buildStory)` — wall-clock time, environment variables, build-host identity, telemetry — SHALL participate in artifact content."

Role is a **request-time** property. It is by construction NOT an input to `compile()`. This is the load-bearing tension: per-role content-gating that depends on the *request* cannot be a pure-compile output unless it is materialized as multiple artifacts (B) selected by an external serve layer, or deferred to a runtime that scrml does not currently ship (D).

**The infrastructure that already exists (verified).** The reachability solver already computes the per-role verdict and exposes it as a reusable predicate: `reachability-solver.ts` / `component-4.ts` `computeAuthGatedBoundariesVisibleTo(role)` and the exported `isVisibleForRole(nodeId, role, gateVisibility, gateAncestry)` (`component-4.ts:527-545`). The route-splitter (`route-splitter.ts` `emitPerRouteChunks`, A-4) already calls `isVisibleForRole` to filter JS atoms per `(EntryPointId, RoleVariant, ChunkTier)`. The HTML emitter already emits a `_SCRML_CHUNKS` route-keyed-by-role manifest + a role-detection bootstrap (`emit-html.ts:2180-2299`, `augmentHtmlForChunks`). **What the HTML emitter does NOT do:** consult `isVisibleForRole` when rendering markup. It renders all children of `<auth role>` verbatim. That is the single gap B would close.

**giti's deployment reality.** giti runs `compile <uiDir> -o <dist>` on **compile-on-serve** (their server invokes the compiler, then serves the dist). They are NOT a static CDN — they have a live serve layer in the request path. This matters: giti can consume a B manifest or a D runtime. The "static CDN serves one file to everyone" degradation case is a *different* adopter class than giti.

---

## Approaches

### Approach A: Keep deferred; sharpen the canonical server-side answer

**How it works:** `<auth role>` stays a JS-mount/code-split gate (already §40.9.5-normative). Content-secrecy is the adopter's responsibility, enforced server-side: branch on the authenticated role in a server-fn / page loader and omit the sensitive markup from the response body. Deliverable is a documented recipe + optionally an ergonomic helper (e.g. a server-fn-shaped `<auth role>` analogue that gates the *fetched data*, not the markup). The 027A warning stays as the compile-time footgun signal. No architecture change.

**scrml example** (the canonical server-side branch — giti's repro, fixed under A):

```scrml
<program>
type UserRole:enum = { Anonymous, Owner }
<count> = 0

<state viewerRole> = ^server currentRole()

<div class="app">
  <h1>giti</>
  <p>Public status: ${@count}</>

  <!-- content-gate: the markup only EXISTS in the response when the
       server-resolved role admits it. The secret never enters the
       payload for an Anonymous viewer. -->
  <div if=${@viewerRole == UserRole::Owner}>
    <button onclick=${@count = @count + 1}>OWNER-ONLY: bump</button>
    <p class="secret">owner-only-marker-12345</>
  </div>
</div>

${
  server function currentRole() {
    // resolves the authenticated role from the request session
    return session.role
  }
}
</program>
```

The `if=${@viewerRole == ...}` gate is `§17.1` DOM-existence (not visibility) — the element does not exist in the DOM when the predicate is false. Combined with the server-resolved `@viewerRole`, the secret markup is conditionally rendered server-side and absent from the Anonymous payload. `<auth role>` is reserved for its honest job (JS mount/code-split), and the data-driven `if=` over a server-resolved role is the content gate.

**Gains:**
- Zero new architecture; zero new spec surface beyond a recipe + maybe one helper.
- Correct on EVERY deployment target including a static CDN — because it does not depend on the compiler knowing the role; the *adopter's server code* resolves the role at request time using a primitive scrml already has (`^server` fetch + `if=`).
- Matches the unanimous prior-art pattern (Remix loaders, Next.js server components, SvelteKit `+layout.server`, Astro server islands all gate content in *render-time server code*, not compile-time variants).
- giti unblocks immediately by writing the branch (they already have a server in the path).

**Loses:**
- `<auth role>` does not "just work" for content secrecy — the adopter must reach for a *different* mechanism (`if=` over server-resolved role) than the element whose name implies content gating. This is a least-surprise cost (the 027A warning mitigates but does not eliminate it).
- Cuts against Pillar 3 ("the compiler owns the wiring") — the adopter writes the role-branch wiring by hand.
- No declarative single-surface for "gate this content by role"; it is a composition of two primitives.

**Complexity:** compiler ~0 (recipe is docs; an optional helper is small). Spec: small (sharpen §40.9.5, add a recipe section). Developer: medium (must learn the composition; the warning teaches it).

**Prior art:**
- **Remix:** "By performing all authorization checks in loaders (server-side), you ensure sensitive data is never sent to clients who lack proper permissions." Loaders return role-shaped data; the component renders only what the loader returned. — *worked well; canonical Remix RBAC.*
- **Next.js App Router:** "Always assert permissions at the very top of your Server Component before initiating database calls" — content gating is render-time server-component logic, not a static variant. — *worked well; production-standard.*
- **SvelteKit:** per-user content uses `+layout.server`/`load` returning role-shaped data under a runtime adapter; "static prerendering generates the same content for all users at build time." — *worked well; the static adapter is explicitly NOT used for per-user content.*

---

### Approach B: Compile-time per-role HTML variants + serve-layer manifest

**How it works:** Extend the A-4 per-route splitter from per-role JS chunks to per-role *HTML*. The HTML emitter consults the Component-4 verdict (`isVisibleForRole`) it currently ignores and, for each effective role, emits an HTML variant with non-admitted `<auth role>` subtrees elided. The serve layer routes by viewer role using a manifest (extend the existing `_SCRML_CHUNKS` route×role manifest to a route×role → HTML-file map). This is exactly OQ-A4-E option (b), which S91 rejected on output-count + infrastructure grounds — but those grounds did not weigh the security footgun.

**scrml example** (same source as giti's repro; B changes the *output*, not the source):

```scrml
<program>
type UserRole:enum = { Anonymous, Owner }
<count> = 0
<div class="app">
  <h1>giti</>
  <p>Public status: ${@count}</>
  <auth role="Owner">
    <button onclick=${@count = @count + 1}>OWNER-ONLY: bump</button>
    <p class="secret">owner-only-marker-12345</>
  </auth>
</div>
</program>
```

Under `compile --emit-per-route --emit-per-role-html`, the emitter produces:

```
dist/index.Anonymous.html   # <auth role="Owner"> subtree ELIDED — no secret, no button
dist/index.Owner.html       # full markup
dist/chunks.json            # route × role → { html, initial, tier1, ... }
```

`index.Anonymous.html` body contains only `<h1>giti</h1>` + `<p>Public status: ...</p>` — the `owner-only-marker-12345` text is absent from that file's bytes. The serve layer reads the authenticated role from the session and serves the matching variant.

**Gains:**
- Closes the content leak under a dynamic serve layer: the secret is genuinely absent from the Anonymous payload (view-source is clean).
- High A-4 reuse: the per-role verdict (`isVisibleForRole`) and the route×role manifest plumbing already exist; the new work is (a) wiring `isVisibleForRole` into the markup-render walk in `emit-html.ts`, (b) extending the manifest with an `html` field, (c) a serve-layer contract doc. Estimated 60-75% reuse of existing A-4 + reachability machinery.
- Declarative: `<auth role>` becomes the single content-gate surface — strong Pillar-3 fit ("compiler owns the wiring").
- Stays within the static-compile model: each variant is a deterministic pure-compile output; the *selection* is the serve layer's job (no live compiler).

**Loses:**
- Output explosion: N roles × M routes HTML files (S91's "120 HTML files" figure for trucking-dispatch). Determinism + content-addressing (§47, §40.9.8) must extend cleanly to the new variant axis.
- **Useless on a static CDN.** A CDN serving one file to everyone cannot select the variant — and serving the most-restrictive (`Anonymous`) variant to an Owner breaks the app. So B *requires* a role-aware serve layer; the degradation story for static hosts is: the warning stays, OR a compile error/warn fires if `<auth role>` content-gating is requested against a static build target (see §58 interaction below).
- Introduces a serve-layer contract scrml did not previously assume — couples HTML emission to "there is a server that knows the role." This is the exact coupling S91 cited as the reason to reject (b).
- Reverses a ratified decision (OQ-A4-E option c). Needs explicit re-ratification, not just an extension.
- "Variant the markup" interacts with hydration: the per-role JS chunk's mount set must agree with the per-role HTML it hydrates, or hydration mismatches. The chunk side already filters by `isVisibleForRole`; the HTML side must filter by the *same* verdict so the two stay in lockstep (they share the predicate, which helps).

**Complexity:** compiler medium (new render-walk filter + variant emission + manifest extension + content-addressing extension). Spec: medium-high (overturn OQ-A4-E, define variant axis, define serve-layer contract, define static-target degradation). Developer: low-to-zero (the gate "just works" if they have a serve layer).

**Prior art:**
- **No mainstream framework emits per-role static HTML variants at build time.** Searches across Next.js, Remix, SvelteKit, Astro returned *zero* per-role-static-variant approaches; all gate at render time. The closest neighbor is Next.js **Cache Components** ("configure cache key to include role, and you get cache hits across all admins, separate cache for all members") — but that is a *render-time cache keyed by role*, materialized on first request, not a *build-time* variant emission. — *the variant concept exists as a render-time cache, not a compile-time emission; B's build-time framing has no direct precedent.*
- **SvelteKit `prerender` entries:** you CAN prerender a fixed set of pages, but "the fundamental issue is that static prerendering generates the same content for all users at build time" — SvelteKit explicitly does NOT prerender per-user variants. — *abandoned/never-built for the per-user case.*
- **Static-site i18n (e.g. Astro/Next per-locale static output):** the *mechanism* of emitting N static variants of one route by an axis (locale) and selecting at the edge is proven for *locale* (a low-cardinality, non-secret, request-derivable axis). — *worked well for locale; role differs in that role is a SECURITY axis and the wrong-variant failure mode is a leak, not a cosmetic mismatch.*

---

### Approach D: Server-render-time role-gating runtime

**How it works:** scrml ships a server runtime that, at request time, renders only the `<auth role>` subtrees admitted for the request's authenticated role. One artifact; the runtime evaluates the gate per request using the Component-4 verdict baked into the artifact. This is the strongest secrecy (the secret never leaves the server for non-admitted viewers) and the closest match to how Next.js/Remix/SvelteKit/Astro actually work — but it moves scrml toward *shipping an SSR server*, the largest commitment of the three.

**scrml example** (identical source to giti's repro — D changes nothing in the source; the gate becomes load-bearing at render time):

```scrml
<program>
type UserRole:enum = { Anonymous, Owner }
<count> = 0
<div class="app">
  <h1>giti</>
  <p>Public status: ${@count}</>
  <auth role="Owner">     <!-- runtime renders this subtree ONLY when the request's role admits it -->
    <button onclick=${@count = @count + 1}>OWNER-ONLY: bump</button>
    <p class="secret">owner-only-marker-12345</>
  </auth>
</div>
</program>
```

Served by the scrml server runtime: for an Anonymous request the `<auth role="Owner">` subtree is never serialized into the response; for an Owner request it is. One artifact, request-time decision.

**Gains:**
- Strongest secrecy; matches the prior-art consensus exactly (render-time server gating).
- Single declarative surface (`<auth role>` does what its name says) — strongest Pillar-3 fit.
- No output explosion (one artifact; the role axis is resolved at request time, not at build time).
- Composes with the §40 middleware boundary and §52 authority model — the auth context is already a request-boundary concern there.

**Loses:**
- **Largest architectural commitment:** scrml ships and maintains an SSR server runtime. This is a strategic-scope decision, not a feature.
- **Tension with §58.1's "deliberately not a live compiler":** D is a live *renderer*, not a live *compiler* — those are distinct (the artifact is still pure-compiled; rendering happens after). But it introduces a request-time evaluation surface scrml has so far avoided, and it must be carefully framed so it does not erode the pure-`compile()` story. The artifact stays deterministic-from-source; the *render* takes the request as input. This is defensible but must be stated.
- **Useless on a static CDN** for the same reason as B — no server in the path means no per-request rendering. Degradation story identical to B: warning stays, or build-target gate.
- Touches §40 (middleware), §52 (authority), §12 (route inference) — broad blast radius.
- Highest effort by far.

**Complexity:** compiler/runtime high (new SSR server runtime + per-request gate evaluation). Spec: high (§40/§52/§12 interactions + the §58.1 framing). Developer: lowest (gate just works, no extra mechanism, no variant management).

**Prior art:**
- **Next.js App Router (Server Components):** render-time server gating is THE model — "Server Components ... controls what data and UI renders on the server." Production-standard. — *worked extremely well; this is the dominant pattern.*
- **Astro server islands:** "render a portion of your page on the server on-demand" for per-user content (e.g. "a logged-in visitor's profile picture") — render-time, per-request, single artifact. — *worked well; shipped late 2024, removed the "whole page must be static" constraint.*
- **SvelteKit (SSR adapter):** "Where different users see different content ... a server-side rendered (SSR) model is a better choice than static site generation." — *worked well; the canonical answer for per-user content.*
- **Phoenix LiveView** (Elixir): server holds the rendered tree and pushes diffs; the server decides per-connection what to render. — *worked well; render-time gating is intrinsic.*

---

### Approach C (PRE-KILLED): Runtime pre-paint DOM prune

**Kill rationale (one paragraph, no research budget spent):** A single shared HTML plus a head-script that strips non-admitted `<auth>` subtrees before paint is **security theater**. The secret is already in the served payload — `view-source`, the network tab, a `curl` of the URL, or disabling JS all reveal it. Pruning the DOM after the bytes have reached the client withholds nothing from anyone who reads the response body. It would actively *worsen* the footgun by giving the false impression that content is gated when it is not. The security-expert lens (below) confirms: any control that runs after the secret crosses the trust boundary to the client is not a content-secrecy control. C is eliminated.

---

## Trade-off Matrix

| Dimension | A (keep deferred) | B (per-role HTML variants) | D (server-render runtime) |
|---|---|---|---|
| **Secrecy strength** | Strong (server omits markup; correct everywhere incl. static CDN) | Strong on a dynamic serve layer; NONE on static CDN | Strongest (secret never leaves server) |
| **Static-CDN degradation** | Works (adopter server resolves role; or no secret to gate) | Useless — wrong-variant failure; needs warn/error on static target | Useless — no server in path; needs warn/error on static target |
| **Serve-layer contract burden** | None (adopter already owns their server logic) | New: serve layer must select variant by role from a manifest | High: scrml ships/owns an SSR server runtime |
| **A-4 / reachability reuse %** | ~0 (no codegen change) | ~60-75% (verdict + route×role manifest exist; add HTML render-filter + manifest `html` field) | ~40% (verdict exists; new render runtime is mostly new) |
| **Pillar-3 fit ("compiler owns wiring")** | Weak (adopter hand-wires the role branch) | Strong (declarative `<auth role>` is the gate) | Strongest (declarative + no variant management) |
| **§58 build-story fit** | Native (no new build axis) | Good (variants are pure-compile outputs; needs target-declared static-vs-dynamic) | Tension (render-time eval; artifact still pure but new request-time surface) |
| **Adopter ergonomics** | Medium (compose `if=` + `^server` role) | Low cost IF serve layer present | Lowest (gate just works) |
| **giti unblock path** | Immediate (write the `if=` branch; they have a server) | Immediate once B ships (compile-on-serve consumes manifest) | Immediate once D ships (compile-on-serve runs the runtime) |
| **Reverses a ratified decision** | No (affirms §40.9.5) | YES (re-opens OQ-A4-E option (b) — per-role HTML; S91 chose hybrid (c), same-bytes HTML + per-role chunks; S91 rejected (b) on output-count + "no server-side role-routing", security footgun NOT weighed) | No (new layer; OQ-A4-E unaffected — though D *builds* the server-routing whose absence was S91's 2nd ground for rejecting (b)) |
| **Prior-art confidence** | High (unanimous: server-side render-time gating) | Low (no framework emits per-role static variants at build time) | High (Next/Remix/SvelteKit/Astro/LiveView all do render-time gating) |
| **Est. effort** | XS (docs + optional helper; <1 wave) | M (extend emitter + manifest + content-addressing + re-ratify; ~1-2 waves) | XL (ship an SSR server; multi-wave strategic commitment) |

---

## Prior Art Table

| Framework | Problem they solved | Their approach | Result |
|---|---|---|---|
| **Next.js App Router** | Per-role content + data gating | Layered: edge middleware (path) + Server Components (render-time content gating) + Server Actions (mutation) + Cache Components (role-keyed render cache). No build-time per-role static variants. | Production-standard; dominant pattern |
| **Remix** | Don't send unauthorized data to client | Loaders run server-side, return role-shaped data; component renders only loader output; "sensitive data is never sent to clients who lack proper permissions" | Worked well; canonical RBAC |
| **Astro** | Per-user region in a mostly-static page | Server islands (`server:defer`) render a per-user region on-demand at request time; rest of page prerendered; "opt out of prerendering on routes that ... display personalized content" | Worked well (shipped late 2024) |
| **SvelteKit** | Per-user authenticated content | SSR adapter + `+layout.server`/`load` returning role-shaped data; static adapter explicitly NOT used — "static prerendering generates the same content for all users at build time" | Worked well; static adapter rejected for per-user |
| **Static i18n (Astro/Next per-locale)** | N static variants of one route by a request-derivable axis | Emit per-locale static HTML; select at the edge | Worked well for LOCALE (non-secret, cosmetic-failure axis) — the only build-time-variant precedent, and it is NOT a security axis |

**Conclusion of prior-art search:** the per-role/per-auth content-gating problem is universally solved at **render time on a server** (A's recipe and D's runtime). **No mainstream framework emits per-role static HTML variants at build time** (B's core mechanism). The only build-time-static-variant precedent is per-locale i18n, where the failure mode is cosmetic, not a security leak. B is therefore the least-precedented approach; A and D both have strong, unanimous precedent.

---

## Dev Agent + Expert Signal

> **Method note:** The Agent/Task dispatch tool is not available in this environment, so per the Source-C escalation rule ("If the runtime denies sub-agent dispatch, synthesis IS the only available path") the dev-agent and expert positions below are **synthesized from agent posture files** (`~/.claude/agents-store/scrml-dev-*.md`, `~/.claude/agents/{security-expert,simplicity-defender,nix-expert}.md`, `~/.claude/agents-store/{react-server-actions,sveltekit-ssr,roc}-expert.md`). They are labeled accordingly; none is a live poll.

### Dev agents (synthesized from mental-model posture)

- **scrml-dev-react — synthesized.** Maps `<auth role>` to the RSC `'use server'` boundary. Position: a React dev expects content gating to be a **render-time server decision** ("assert permissions at the top of the Server Component before the DB call"). Least-surprise match: **D** (render-time gating == RSC), then **A** (loader-shaped server branch == the Remix/RSC data pattern). B's build-time variants have NO React analogue — a React dev would find per-role static HTML files surprising. Confidence: high (RSC is the dev-react posture's stated frame, `scrml-dev-react.md:36` `server annotation = 'use server' in RSC`).
- **scrml-dev-elixir — synthesized.** Maps `<auth role>` to LiveView `handle_event` / server-held render tree. Position: in Phoenix the server **always** decides per-connection what to render; content gating is intrinsic to the server render. Least-surprise match: **D** (LiveView == server renders per-connection). Would view A as acceptable (server branch) and B as alien (LiveView never emits static per-role files). Confidence: high (`scrml-dev-elixir.md:37` `server = LiveView handle_event`).
- **scrml-dev-go — synthesized.** Go-web mental model is explicit `http.Handler` + template execution per request. Position: gating is a per-request server concern; the handler chooses what to write. Least-surprise match: **D** then **A**. B's manifest-driven variant selection is a build-output concern Go devs would expect to write themselves in the handler (closer to A). Confidence: medium (extrapolated from the explicit-server-handler frame).
- **scrml-dev-svelte — synthesized.** SvelteKit frame: per-user content => SSR adapter + `load`; static adapter is for same-for-everyone content. Position: a Svelte dev would expect the warning to say "you need a server" (which 027A effectively does) and reach for the `load`-equivalent (A's `^server` + `if=`). Would recognize B's "prerender per-role" as the thing SvelteKit explicitly does NOT do. Least-surprise match: **A** then **D**. Confidence: high (SvelteKit's static-vs-SSR split is its defining doctrine).

**Dev consensus (synthesized):** **render-time server gating (D, or A's server-side composition) is the least-surprise model for 3/4 polled frames; B (build-time per-role static HTML) matches NO dev frame's expectation** and would be a novel mechanism every dev would have to learn. The split between A and D among the dev frames is "do I write the branch (A)" vs "does the framework own the gate (D)."

### Experts

- **security-expert — synthesized from agent description.** Position: the only meaningful question is *does the secret cross the trust boundary to the client?* Any control after that boundary is theater (confirms the **C kill**). On a **static CDN, A is the only correct option** — B and D both require a server in the path, and a static CDN has none, so the secret either ships to everyone (no gate) or the build must refuse/warn. On a dynamic serve layer, B and D both genuinely close the leak; D closes it most completely (secret never serialized for non-admitted viewers; B writes an Anonymous file that is clean but the Owner file still exists on disk and must be access-controlled by the serve layer). The expert would also note B's failure mode is **catastrophic-on-misconfiguration**: if the serve layer mis-selects (serves the Owner variant to Anonymous), the leak is total and silent — a worse failure surface than A's "adopter forgot to branch" (which the 027A warning already flags). Steel-man: determinism is a security property — B's per-role artifacts are independently verifiable (you can audit that `Anonymous.html` contains no secret), which D's request-time render is not (you must trust the running server). Confidence: high on the C-kill and the static-CDN-A-only ruling; medium on the B-vs-D verification nuance (extrapolated from the content-addressing-as-trust posture).
- **simplicity-defender — synthesized from agent description.** Position: **A**, emphatically. The §40.9.5 deferral is the simple answer and it is *already correct*; B and D both add surface area (a variant axis + serve-layer contract for B; an entire SSR server for D) to solve a problem the adopter can solve by composing two primitives scrml already has (`^server` + `if=`). Hickey lens: B braids HTML emission with serve-layer role-routing (un-simple); D braids the compiler with a runtime renderer (un-simple). Wirth lens: each successor should be *smaller*; B and D are strictly larger. Armstrong lens: content-gating-by-role is a *library/recipe on top of small primitives*, not a new language feature. Steel-man for NOT-A: if the footgun keeps biting adopters despite the 027A warning, "the compiler owns the wiring" (Pillar 3) is a legitimate counter-pull — a feature that prevents a security footgun by construction can pay for its complexity. But the defender's default is: prove the warning is insufficient first. Confidence: high (this is squarely the agent's home position).
- **nix-expert — synthesized from agent description.** Position (deployment-target/distribution lens): B is the most Nix-congenial of the three — N per-role artifacts are content-addressed, independently reproducible, and a static-CDN-or-not is just "which store consumes which closure node." The role axis becomes part of the artifact's content address (extends §47/§40.9.8 cleanly). D's request-time render is the LEAST Nix-congenial — it reintroduces a non-reproducible request-time surface (the served bytes depend on the request, not just the closure). Steel-man: even under B, the *selection* of variant is a non-reproducible serve-layer decision; Nix would push that selection into a declared, pinned routing config (a `scrml.toml` serve-target declaration) so the whole pipeline stays auditable. Confidence: medium (extrapolated from the content-addressed-store + hermetic-build posture; the agent does not directly address per-role web artifacts).
- **react-server-actions-expert / sveltekit-ssr-expert — synthesized from agent descriptions.** Both converge on render-time server gating as the proven model (D, or A's server-composition). The RSA expert's frame ("server returns typed data, client drives state") maps to A's `^server` role fetch + `if=`. The SvelteKit-SSR expert's frame ("SSR + load is the answer for per-user content; static is same-for-everyone") maps to D for the framework-owns-it case and confirms B has no SvelteKit precedent. Confidence: high (both postures are explicitly render-time-server-gating).

**Expert consensus:** **C is killed** (security-expert). **A is the only universally-correct option** (correct on static CDN; security-expert + simplicity-defender + the dev frames all support it as at-minimum-sufficient). **D has the strongest prior art and the strongest dev/expert least-surprise fit but the largest commitment.** **B is the most reproducibility-friendly (nix-expert) but the least-precedented and carries a catastrophic-misconfiguration failure surface (security-expert) and overturns OQ-A4-E.**

---

## §58 Build-Story Interaction

Per §58.1, `compile(source, buildStory)` is pure and the build story is the *second input* — "read once, before any parse begins." The static-vs-dynamic *deployment target* is a natural candidate for a build-story / `scrml.toml` declaration:

- Under **B**, a `scrml.toml` serve-target declaration (`[serve] target = "dynamic-role-router"` vs `"static-cdn"`) would let the compiler **emit per-role variants only when the target is role-aware**, and **fire a compile error/warning when `<auth role>` content-gating is requested against a `static-cdn` target** (the honest degradation: a static CDN cannot gate, so refuse to pretend). This makes the static-vs-dynamic decision a *declared, pinned, auditable* part of the build — which is exactly the §58 philosophy (the nix-expert's "push the selection into pinned config" steel-man).
- Under **D**, the build story would pin "this artifact targets the scrml SSR runtime"; a static-CDN target would be a compile error for any `<auth role>` content gate.
- Under **A**, no build-story change is needed — A is target-agnostic by construction (it depends on the adopter's server, not the compiler's target).

**The degradation story is cleanest under A** (no target dependency) and **requires a new build-target axis under both B and D** (so the compiler can honestly refuse to gate on a static host rather than silently ship the leak — closing the giti-027 footgun class structurally rather than via a warning).

---

## Open Questions

- **Does the 027A warning empirically reduce the footgun enough that A is sufficient?** Unknowable without adopter telemetry post-027A; giti is the n=1 and they were blocked *before* 027A shipped. The simplicity-defender's "prove the warning is insufficient first" gate depends on this.
- **For B: does extending content-addressing (§47/§40.9.8) to a per-role-HTML variant axis introduce any determinism hazard the per-role-JS-chunk axis didn't already solve?** The JS-chunk axis is already per-role and content-addressed; the HTML axis *should* extend identically, but this is unverified — needs a spec/impl probe.
- **For B vs D on a dynamic serve layer: is the catastrophic-misconfiguration risk (serve layer mis-selects the variant) materially worse than D's "trust the running server"?** The security-expert flagged it but the comparison is not resolved — B's artifacts are independently auditable (a plus) but the selection is fallible (a minus); D's selection is in-process (less to misconfigure) but not independently auditable.
- **Does scrml WANT to ship an SSR server (D)?** This is a strategic-scope question above the deep-dive's pay grade — it is a language-direction decision, not a feature trade-off. D cannot be chosen without answering it.
- **Is there a B/D hybrid** — ship D's render-time gate as the dynamic-target answer AND keep A's recipe as the static-target answer, with the build-target declaration selecting between them? Not separately costed here; it is the natural synthesis if the debate finds A-alone insufficient but D-everywhere too heavy.

---

## Recommendation for Debate

This is a genuine multi-approach fork with philosophical contrast (simplicity/defer vs compiler-owns-wiring vs ship-a-server). It should go to debate, not a unilateral decision.

**Approaches worth debating:** A, B, D. All three have genuine merit and meaningfully different trade-offs (effort XS/M/XL; reverses-ratification no/yes/no; prior-art high/low/high; static-CDN-correct yes/no/no).

**Approaches that can be eliminated:**
- **C (runtime pre-paint DOM prune)** — eliminated. Security theater; the secret is in the served payload regardless of any client-side prune (security-expert confirmed). Documented kill above.

**Suggested debate framing (the one-sentence challenge):**
> "Should scrml lift the §40.9.5 deferral and make `<auth role>` withhold HTML content per viewer role — and if so, via compile-time per-role HTML variants + a serve-layer manifest (B), or a server-render-time gating runtime (D) — or keep `<auth role>` a JS-mount gate and make server-side content omission the canonical, target-agnostic answer (A)?"

**Suggested participants:**
- **A (keep deferred / sharpen recipe):** `simplicity-defender` — squarely its home position (the deferral is already correct; prove the 027A warning insufficient before adding surface).
- **B (per-role HTML variants):** a Pillar-3 "compiler-owns-the-wiring" voice (no dedicated expert exists; the closest is `nix-expert` for the content-addressed-variant + pinned-serve-target framing — B is the most reproducibility-congenial option and Nix is the natural advocate). Consider forging a `pillar3-compiler-wiring` advocate if a pure Pillar-3 voice is wanted; `nix-expert` is the strong existing proxy.
- **D (server-render-time runtime):** `sveltekit-ssr-expert` and/or `react-server-actions-expert` — both argue render-time server gating as the proven, least-surprise model; pair with `scrml-dev-elixir` (LiveView frame) for the "server-decides-per-connection" intuition.
- **Threat model / cross-cutting judge input:** `security-expert` — confirms the C-kill, the static-CDN-A-only ruling, and the B-catastrophic-misconfiguration vs D-trust-the-server distinction. Should weigh in on all three, not advocate one.
- **Deployment-target lens:** `nix-expert` (build-target-as-pinned-config) and optionally `roc-expert` (platform/host distribution lens) for the §58 build-target-axis sub-question.

**Note for the debate:** B is NOT a fresh idea — it is OQ-A4-E option (b), rejected at S91 on output-count + infrastructure grounds. The debate must explicitly weigh the NEW axis (security footgun) that the S91 decision did not, and decide whether it changes the verdict. The build-target-declaration sub-question (§58) is the likely bridge: it lets B or D be the dynamic-target answer while A remains the honest static-target answer, structurally closing the giti-027 footgun rather than relying on the warning.

---

## Tags

#giti-027b #auth #§40.9.5 #content-visibility #ssr #per-role-html #static-vs-dynamic #§58-build-story #security #deep-dive #debate-ready #OQ-A4-E #pillar-3

## Links

- SPEC §40.9.5 (deferral + server-side-canonical ruling): `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC.md:19636-19645`
- SPEC §40.1.1 (static role classification): `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC.md:19043-19060`
- SPEC §40.9.9 (worked example): `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC.md:19707-19768`
- SPEC §58.1 (compilation as pure function; "deliberately not a live compiler"): `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC.md:30406-30423`
- W-AUTH-CONTENT-NOT-GATED catalog row: `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC.md:16661`
- `flagContentNotGated` fire site (027A): `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/auth-graph.ts:581-639`
- HTML emitter passthrough + chunk-manifest augmenter: `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/codegen/emit-html.ts:2161-2299`
- Component-4 visibility verdict (`isVisibleForRole`, `computeAuthGatedBoundariesVisibleTo`): `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/reachability/component-4.ts:195,527-545`
- Route-splitter (`emitPerRouteChunks`, A-4): `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/codegen/route-splitter.ts:431`
- OQ-A4-E ratification (per-role HTML rejected for hybrid at S91): `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/changes/a-4-per-route-artifact-splitter-SCOPING/SCOPING.md:522-534`
- giti bug report + repro: `/home/bryan-maclee/scrmlMaster/scrmlTS/handOffs/incoming/read/2026-05-30-1126-giti-to-scrmlTS-giti-027-auth-role-no-content-gating.md`
- Prior art — Next.js RBAC: https://nextjslaunchpad.com/article/nextjs-role-based-access-control-authjs-v5-middleware-server-component-authorization
- Prior art — Remix RBAC in loaders: https://www.jacobparis.com/content/simple-rbac
- Prior art — Astro server islands: https://docs.astro.build/en/guides/server-islands/
- Prior art — SvelteKit static adapter (per-user not prerenderable): https://svelte.dev/docs/kit/adapter-static
- This deep dive: `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/giti-027b-per-role-ssr-content-stripping-2026-05-30.md`
