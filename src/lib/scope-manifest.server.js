// Generated server route handlers
// This file is compiler IR — not meant for direct consumption.
// --- §45 Structural equality helper (inlined for server, no client runtime here) ---
function _scrml_structural_eq(a, b) {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return a === b;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!_scrml_structural_eq(a[i], b[i])) return false;
    }
    return true;
  }
  if (a._tag != null && b._tag != null) {
    if (a._tag !== b._tag) return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (key === "_tag") continue;
      if (!_scrml_structural_eq(a[key], b[key])) return false;
    }
    return true;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!_scrml_structural_eq(a[key], b[key])) return false;
  }
  return true;
}


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

async function _scrml_handler_loadPrivateManifest_1(_scrml_req) {
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
    const abs = join(repoRoot, MANIFEST_PATH);
    const globs = [MANIFEST_PATH];
    if (!existsSync(abs)) {
      return globs;
    }
    const raw = readFileSync(abs, "utf8");
    for (const rawLine of raw.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
      continue;
    }
      if (_scrml_structural_eq(line, MANIFEST_PATH)) {
      continue globs;
    }
      . push ( line );
    }
    return globs;
  })();
  return new Response(JSON.stringify(_scrml_result ?? null), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `scrml_csrf=${_scrml_csrf_token}; Path=/; SameSite=Strict`,
    },
  });
}

export const __ri_route_loadPrivateManifest_1 = {
  path: "/_scrml/__ri_route_loadPrivateManifest_1",
  method: "POST",
  handler: _scrml_handler_loadPrivateManifest_1,
};

async function _scrml_handler_savePrivateManifest_2(_scrml_req) {
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
    const globs = _scrml_body["globs"];
    const abs = join(repoRoot, MANIFEST_PATH);
    const dir = dirname(abs);
    if (!existsSync(dir)) {
      mkdirSync(dir, {recursive: true});
    }
    const filtered = globs.map((g) => g.trim()).filter((g) => g && !g.startsWith("#") && !_scrml_structural_eq(g, MANIFEST_PATH));
    const unique = Array.from(new Set(filtered));
    const body = (unique.length === 0) ? "" : unique.join("\n") + "\n";
    const header = "# giti private paths (spec §12)\n" + "# One glob per line. Matching files stay on the _private bookmark\n" + "# and are never pushed to remotes scoped 'public'.\n" + "\n";
    writeFileSync(abs, header + body, "utf8");
  })();
  return new Response(JSON.stringify(_scrml_result ?? null), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `scrml_csrf=${_scrml_csrf_token}; Path=/; SameSite=Strict`,
    },
  });
}

export const __ri_route_savePrivateManifest_2 = {
  path: "/_scrml/__ri_route_savePrivateManifest_2",
  method: "POST",
  handler: _scrml_handler_savePrivateManifest_2,
};

// --- S35 insight 22: aggregate routes + WinterCG fetch handler ---
export const routes = [__ri_route_loadPrivateManifest_1, __ri_route_savePrivateManifest_2];

export async function fetch(request) {
  const url = new URL(request.url, 'http://localhost');
  for (const r of routes) {
    if (r.path === url.pathname && r.method === request.method) {
      return r.handler(request);
    }
  }
  return null;
}
