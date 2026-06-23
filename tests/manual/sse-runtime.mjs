// Runtime verification harness for the §37 SSE surface (giti feed.scrml dogfood).
//
// Boots giti's real server route from the compiled feed.server.js, consumes the
// text/event-stream as a faithful client would, and COUNTS DELIVERED FRAMES —
// the check S12 flagged that scrmlTS's own emit-string tests never make.
//
// Two phases isolate the suspected root cause (enum `Phase` undefined in the
// server bundle): phase 1 runs the route as emitted; phase 2 injects
// globalThis.Phase and re-runs. If phase 1 = 0 frames and phase 2 > 0 frames,
// the missing server-side enum binding is proven as the cause.
//
//   bun run tests/manual/sse-runtime.mjs <dist-dir>

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const distDir = resolve(process.argv[2] || "/tmp/giti-sse-probe");
const serverMod = pathToFileURL(resolve(distDir, "feed.server.js")).href;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Consume the SSE route's ReadableStream for `windowMs`, parsing event/data
// frames. Returns { frames, sample, raw }.
async function probe(label, windowMs = 2500) {
  const mod = await import(serverMod + `?t=${label}`); // cache-bust per phase
  const route = mod.routes[0];
  const req = new Request("http://127.0.0.1/_scrml/__ri_route_watchStatus_1", {
    method: "GET",
  });
  const res = await route.handler(req);
  const ctype = res.headers.get("Content-Type");

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const frames = [];
  const deadline = Date.now() + windowMs;

  while (Date.now() < deadline) {
    const chunk = await Promise.race([
      reader.read(),
      sleep(deadline - Date.now()).then(() => ({ __timeout: true })),
    ]);
    if (chunk.__timeout) break;
    if (chunk.done) break;
    buf += dec.decode(chunk.value, { stream: true });
    // SSE frames are separated by a blank line
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const rawFrame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const evMatch = rawFrame.match(/^event: (.+)$/m);
      const dataMatch = rawFrame.match(/^data: (.+)$/m);
      frames.push({
        event: evMatch ? evMatch[1] : "(default)",
        data: dataMatch ? safeParse(dataMatch[1]) : null,
      });
    }
  }
  try { await reader.cancel(); } catch {}

  console.log(`[${label}] content-type=${ctype} frames=${frames.length}`);
  if (frames.length) console.log(`[${label}] first frame: ${JSON.stringify(frames[0])}`);
  return { frames, ctype };
}

function safeParse(s) { try { return JSON.parse(s); } catch { return s; } }

// --- phase 1: route as emitted (Phase undefined in server scope) ------------
console.log("=== PHASE 1: route as emitted ===");
const p1 = await probe("as-emitted");

// --- phase 2: inject globalThis.Phase, re-run -------------------------------
console.log("\n=== PHASE 2: globalThis.Phase injected ===");
globalThis.Phase = Object.freeze({ Idle: "Idle", Ok: "Ok", Error: "Error" });
const p2 = await probe("phase-injected");

// --- verdict ----------------------------------------------------------------
console.log("\n==================== VERDICT ====================");
console.log(`phase 1 (as emitted)     frames: ${p1.frames.length}`);
console.log(`phase 2 (Phase injected) frames: ${p2.frames.length}`);
const diagnosed = p1.frames.length === 0 && p2.frames.length > 0;
const alreadyWorks = p1.frames.length > 0;
if (alreadyWorks) {
  console.log("RESULT: SSE delivers frames as emitted ✅ (no server-enum bug)");
} else if (diagnosed) {
  console.log("RESULT: 0 frames as emitted; frames flow once Phase is defined ❌");
  console.log("        → CONFIRMED: enum ref in `server function*` is undefined in the server bundle");
} else {
  console.log("RESULT: 0 frames in BOTH phases — cause is NOT (only) the enum binding; investigate further");
}
console.log("=================================================");
process.exit(0);
