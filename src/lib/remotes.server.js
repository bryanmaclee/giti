// Generated server route handlers
// This file is compiler IR — not meant for direct consumption.

import { dirname, join } from "./_scrml/path.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "./_scrml/fs.js";

// --- Baseline CSRF protection (compiler-generated, double-submit cookie) ---
function _scrml_ensure_csrf_cookie(req) {
  const cookieHeader = req.headers.get('Cookie') || '';
  const existing = cookieHeader.match(/scrml_csrf=([^;]+)/)?.[1] || null;
  return existing || crypto.randomUUID();
}

function _scrml_validate_csrf(req) {
  const cookieHeader = req.headers.get('Cookie') || '';
  const cookieToken = cookieHeader.match(/scrml_csrf=([^;]+)/)?.[1] || '';
  const headerToken = req.headers.get('X-CSRF-Token') || '';
  return cookieToken.length > 0 && cookieToken === headerToken;
}

async function _scrml_handler_emptyConfig_1(_scrml_req) {
  // route.query injection (SPEC §20.3)
  const _scrml_url = new URL(_scrml_req.url, 'http://localhost');
  const route = { query: Object.fromEntries(_scrml_url.searchParams) };
  // Baseline CSRF: get or generate cookie token
  const _scrml_csrf_token = _scrml_ensure_csrf_cookie(_scrml_req);
  // CSRF validation (compiler-generated, baseline double-submit cookie)
  if (!_scrml_validate_csrf(_scrml_req)) {
    return new Response(JSON.stringify({ error: "CSRF validation failed" }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `scrml_csrf=${_scrml_csrf_token}; Path=/; SameSite=Strict`,
      },
    });
  }
  const _scrml_result = await (async () => {
    const _scrml_body = await _scrml_req.json();
    return {remotes: []};
  })();
  return new Response(JSON.stringify(_scrml_result ?? null), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `scrml_csrf=${_scrml_csrf_token}; Path=/; SameSite=Strict`,
    },
  });
}

export const __ri_route_emptyConfig_1 = {
  path: "/_scrml/__ri_route_emptyConfig_1",
  method: "POST",
  handler: _scrml_handler_emptyConfig_1,
};

async function _scrml_handler_loadRemoteConfig_2(_scrml_req) {
  // route.query injection (SPEC §20.3)
  const _scrml_url = new URL(_scrml_req.url, 'http://localhost');
  const route = { query: Object.fromEntries(_scrml_url.searchParams) };
  // Baseline CSRF: get or generate cookie token
  const _scrml_csrf_token = _scrml_ensure_csrf_cookie(_scrml_req);
  // CSRF validation (compiler-generated, baseline double-submit cookie)
  if (!_scrml_validate_csrf(_scrml_req)) {
    return new Response(JSON.stringify({ error: "CSRF validation failed" }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `scrml_csrf=${_scrml_csrf_token}; Path=/; SameSite=Strict`,
      },
    });
  }
  const _scrml_result = await (async () => {
    const _scrml_body = await _scrml_req.json();
    const repoRoot = _scrml_body["repoRoot"];
    const abs = join(repoRoot, REMOTES_PATH);
    if (!existsSync(abs)) {
      return emptyConfig();
    }
    try {
      const raw = readFileSync(abs, "utf8");
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.remotes)) {
        return emptyConfig();
      }
      const remotes = parsed.remotes.filter((r) => r && (typeof r.name === "string")).map((r) => ({name: r.name, url: (typeof r.url === "string") ? r.url : "", scope: SCOPES.includes(r.scope) ? r.scope : "public"}));
      return {remotes};
    }
    catch {
      return emptyConfig();
    }
  })();
  return new Response(JSON.stringify(_scrml_result ?? null), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `scrml_csrf=${_scrml_csrf_token}; Path=/; SameSite=Strict`,
    },
  });
}

export const __ri_route_loadRemoteConfig_2 = {
  path: "/_scrml/__ri_route_loadRemoteConfig_2",
  method: "POST",
  handler: _scrml_handler_loadRemoteConfig_2,
};

async function _scrml_handler_saveRemoteConfig_3(_scrml_req) {
  // route.query injection (SPEC §20.3)
  const _scrml_url = new URL(_scrml_req.url, 'http://localhost');
  const route = { query: Object.fromEntries(_scrml_url.searchParams) };
  // Baseline CSRF: get or generate cookie token
  const _scrml_csrf_token = _scrml_ensure_csrf_cookie(_scrml_req);
  // CSRF validation (compiler-generated, baseline double-submit cookie)
  if (!_scrml_validate_csrf(_scrml_req)) {
    return new Response(JSON.stringify({ error: "CSRF validation failed" }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `scrml_csrf=${_scrml_csrf_token}; Path=/; SameSite=Strict`,
      },
    });
  }
  const _scrml_result = await (async () => {
    const _scrml_body = await _scrml_req.json();
    const repoRoot = _scrml_body["repoRoot"];
    const cfg = _scrml_body["cfg"];
    const abs = join(repoRoot, REMOTES_PATH);
    const dir = dirname(abs);
    if (!existsSync(dir)) {
      mkdirSync(dir, {recursive: true});
    }
    const normalized = {remotes: cfg.remotes || [].map((r) => ({name: r.name, url: r.url || "", scope: SCOPES.includes(r.scope) ? r.scope : "public"}))};
    writeFileSync(abs, JSON.stringify(normalized, null, 2) + "\n", "utf8");
  })();
  return new Response(JSON.stringify(_scrml_result ?? null), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `scrml_csrf=${_scrml_csrf_token}; Path=/; SameSite=Strict`,
    },
  });
}

export const __ri_route_saveRemoteConfig_3 = {
  path: "/_scrml/__ri_route_saveRemoteConfig_3",
  method: "POST",
  handler: _scrml_handler_saveRemoteConfig_3,
};

// --- S35 insight 22: aggregate routes + WinterCG fetch handler ---
export const routes = [__ri_route_emptyConfig_1, __ri_route_loadRemoteConfig_2, __ri_route_saveRemoteConfig_3];

export async function fetch(request) {
  const url = new URL(request.url, 'http://localhost');
  for (const r of routes) {
    if (r.path === url.pathname && r.method === request.method) {
      return r.handler(request);
    }
  }
  return null;
}
