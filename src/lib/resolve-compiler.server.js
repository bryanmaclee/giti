// Generated server route handlers
// This file is compiler IR — not meant for direct consumption.

import { resolve, join } from "./_scrml/path.js";
import { existsSync as fsExistsSync } from "./_scrml/fs.js";
import { cwd as processCwd, env as processEnv } from "./_scrml/process.js";

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

async function _scrml_handler_resolveCompilerPath_1(_scrml_req) {
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
    const opts = _scrml_body["opts"];
    const o = (opts !== null && opts !== undefined) ? opts : {};
    const myCwd = ((__scrml_is_v) => __scrml_is_v !== null && __scrml_is_v !== undefined)(o.cwd) ? o.cwd : processCwd();
    const scrmlTsPath = ((__scrml_is_v) => __scrml_is_v !== null && __scrml_is_v !== undefined)(o.env) ? o.env.SCRMLTS_PATH : processEnv("SCRMLTS_PATH");
    const myExistsSync = ((__scrml_is_v) => __scrml_is_v !== null && __scrml_is_v !== undefined)(o.fs) ? o.fs.existsSync : fsExistsSync;
    const candidates = [];
    if (scrmlTsPath) {
      candidates.push(resolve(scrmlTsPath));
    }
    candidates.push(resolve(myCwd, "..", "scrmlTS"));
    for (const root of candidates) {
      const cli = join(root, "compiler", "src", "cli.js");
      if (myExistsSync(cli)) {
      return {ok: true, path: cli, root};
    }
    }
    return {ok: false, error: "Could !find the scrmlTS compiler.\n" + "Set $SCRMLTS_PATH to your scrmlTS checkout, or place scrmlTS next to giti:\n" + "  scrmlMaster/\n" + "    giti/\n" + "    scrmlTS/"};
  })();
  return new Response(JSON.stringify(_scrml_result ?? null), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `scrml_csrf=${_scrml_csrf_token}; Path=/; SameSite=Strict`,
    },
  });
}

export const __ri_route_resolveCompilerPath_1 = {
  path: "/_scrml/__ri_route_resolveCompilerPath_1",
  method: "POST",
  handler: _scrml_handler_resolveCompilerPath_1,
};

// --- S35 insight 22: aggregate routes + WinterCG fetch handler ---
export const routes = [__ri_route_resolveCompilerPath_1];

export async function fetch(request) {
  const url = new URL(request.url, 'http://localhost');
  for (const r of routes) {
    if (r.path === url.pathname && r.method === request.method) {
      return r.handler(request);
    }
  }
  return null;
}
