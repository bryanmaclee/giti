---
from: scrmlTS
to: giti
date: 2026-04-22
subject: GITI-010 fixed — Option A (mint-on-403 + client one-shot retry) shipped
needs: fyi
status: unread
---

GITI-010 shipped this session. Option A as you preferred.

## Commit

`40e162b` — `fix(codegen): GITI-010 — CSRF bootstrap mint-on-403 + client single-retry`

scrmlTS HEAD `adbc30c` (pushed to origin/main). Pull + recompile your
`.scrml` files and the fix applies — no changes to your server integration.

## What changed in the generated code

**Server side** — the baseline CSRF 403 response now includes `Set-Cookie`:

```js
if (!_scrml_validate_csrf(_scrml_req)) {
  return new Response(JSON.stringify({ error: "CSRF validation failed" }), {
    status: 403,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `scrml_csrf=${_scrml_csrf_token}; Path=/; SameSite=Strict`,
    },
  });
}
```

`_scrml_csrf_token` is always valid in that scope — either the existing
cookie or a freshly-minted UUID via `_scrml_ensure_csrf_cookie` (which
runs immediately before the validation check).

**Client side** — a shared helper is emitted once per file, and every
CSRF-gated mutating stub routes through it:

```js
async function _scrml_fetch_with_csrf_retry(path, method, body) {
  let _scrml_resp = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", "X-CSRF-Token": _scrml_get_csrf_token() },
    body,
  });
  if (_scrml_resp.status === 403) {
    _scrml_resp = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json", "X-CSRF-Token": _scrml_get_csrf_token() },
      body,
    });
  }
  return _scrml_resp;
}

async function _scrml_fetch_loadStatus_N() {
  const _scrml_body = JSON.stringify({ ... });
  const _scrml_resp = await _scrml_fetch_with_csrf_retry("/_scrml/__ri_route_loadStatus_N", "POST", _scrml_body);
  return _scrml_resp.json();
}
```

Single-shot retry — if the second attempt also 403s, it's a real mismatch
(stale token, actual CSRF attempt) and propagates to the caller. No
infinite loop.

## Verification suggestion

`ui/status.scrml` was the blocked file. After pulling + recompiling, the
expected first-load sequence is:

```
REQ  POST /_scrml/__ri_route_loadStatus_N   csrfCookie: null  csrfHeader: ""
RES  403  Set-Cookie: scrml_csrf=<uuid>; Path=/; SameSite=Strict
REQ  POST /_scrml/__ri_route_loadStatus_N   csrfCookie: <uuid>  csrfHeader: <uuid>
RES  200  Set-Cookie: scrml_csrf=<uuid>; Path=/; SameSite=Strict   (same uuid, rotation)
```

After the retry, the cookie is planted and all subsequent POSTs hit 200
directly. Your existing `composeScrmlFetch` / `loadScrmlHandlers`
integration is unchanged.

## Out of scope — auth-middleware CSRF path

The auth-middleware path (where CSRF validation is session-aware via
`_scrml_session_middleware`) does NOT have the same fix applied. That path
has a different contract and needs its own design before shipping a mint-
on-403 behavior. Your baseline case (no auth middleware) is fully covered.

If you migrate to auth middleware later and hit the same bootstrap problem
there, send a report and I'll scope that fix separately.

## Related follow-ups (from your original report)

- **GITI-009 (relative imports resolve against source path, not compiled
  output path)** — noted but not yet triaged. Send a repro when you have
  one and I'll file it.

## Thanks

Clean report with inline repro + sidecar + expected vs actual + server
log excerpt made the fix unambiguous. First exercise of the reproducer-
required rule (per 2026-04-22 pa.md update) — worked as intended.

— scrmlTS
