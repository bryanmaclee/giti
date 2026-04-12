/**
 * giti serve
 *
 * Launch the HTTP API server. M4.1 Hosted Forge foundation.
 *
 * Flags:
 *   --port N       port to listen on (default 3737)
 *   --local-dev    unlock write endpoints (save/switch/merge/undo).
 *                  Always bound to 127.0.0.1 — there is no auth yet.
 *
 * Env:
 *   GITI_LOCAL_DEV=1   same as --local-dev
 */

import { startServer } from "../server/index.js";

export async function serve(args) {
  let port = 3737;
  let localDev = process.env.GITI_LOCAL_DEV === "1";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--local-dev") {
      localDev = true;
    }
  }

  process.stdout.write("Compiling UI…\n");
  let server;
  try {
    server = await startServer({ port, localDev });
  } catch (e) {
    process.stderr.write(`giti serve: ${e.message}\n`);
    process.stderr.write("\nThis may be a scrmlTS compiler bug blocking giti.\n");
    process.stderr.write("See pa.md 'compiler bug escalation path'.\n");
    process.exit(1);
  }
  process.stdout.write(`giti serve: http://127.0.0.1:${server.port}\n`);
  if (localDev) {
    process.stdout.write("  mode: local-dev (write endpoints enabled, bound to 127.0.0.1)\n");
  } else {
    process.stdout.write("  mode: read-only\n");
  }
}
