// Runtime verification harness for the §38 channel surface (GITI dogfood).
//
// Boots giti's real server wiring (loadScrmlChannels + createHandler WS
// dispatch + broadcast-via-globalThis) against the already-compiled
// ui/dist/live.*, opens TWO WebSocket clients, fires refreshStatus() over
// HTTP, and asserts BOTH clients receive the channel-cell __sync carrying
// real `jj` status. Also counts messages to detect any echo storm.
//
//   bun run tests/manual/channel-runtime.mjs

import { resolve } from "node:path";
import {
  createHandler, loadScrmlHandlers, loadScrmlChannels,
} from "../../src/server/index.js";
import { getEngine } from "../../src/engine/index.js";

const distDir = resolve("ui/dist");
const PORT = 3939;

const scrmlHandlers = await loadScrmlHandlers(distDir);
const { wsHandlers, wsRoutes } = await loadScrmlChannels(distDir);
console.log(`[boot] ws routes=${wsRoutes.map(r => r.path).join(",")} handlerSets=${wsHandlers.length} httpHandlers=${scrmlHandlers.length}`);

const fetch = createHandler({
  engine: getEngine(), localDev: false, distDir, scrmlHandlers, wsRoutes,
});
const serveOpts = { port: PORT, hostname: "127.0.0.1", fetch };
if (wsHandlers.length === 1) serveOpts.websocket = wsHandlers[0];
else if (wsHandlers.length > 1) serveOpts.websocket = {
  open(ws) { for (const h of wsHandlers) h.open?.(ws); },
  message(ws, raw) { for (const h of wsHandlers) h.message?.(ws, raw); },
  close(ws, c, r) { for (const h of wsHandlers) h.close?.(ws, c, r); },
};
const server = Bun.serve(serveOpts);
globalThis._scrml_active_server = server;
console.log(`[boot] serving on http://127.0.0.1:${PORT}`);

const base = `http://127.0.0.1:${PORT}`;
const wsUrl = `ws://127.0.0.1:${PORT}/_scrml_ws/repo_status`;
const ROUTE = "/_scrml/__ri_route_refreshStatus_1";

function openClient(label) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(wsUrl);
    const msgs = [];
    ws.addEventListener("message", (e) => {
      try { msgs.push(JSON.parse(e.data)); }
      catch { msgs.push({ __raw: e.data }); }
    });
    ws.addEventListener("open", () => res({ ws, msgs, label }));
    ws.addEventListener("error", rej);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- 1. open two WS clients -------------------------------------------------
const a = await openClient("A");
const b = await openClient("B");
console.log("[ws] both clients connected");
await sleep(150); // let any on-connect effects settle

const baselineA = a.msgs.length, baselineB = b.msgs.length;

// --- 2. obtain a CSRF token (server 403s + Set-Cookie on first call) --------
const first = await Bun.fetch(`${base}${ROUTE}`, {
  method: "POST", headers: { "content-type": "application/json" }, body: "{}",
});
const setCookie = first.headers.get("set-cookie") || "";
const token = setCookie.match(/scrml_csrf=([^;]+)/)?.[1] || "";
console.log(`[csrf] first call status=${first.status} token=${token ? token.slice(0,8)+"…" : "(none)"}`);

// --- 3. fire refreshStatus() with CSRF --------------------------------------
const res = await Bun.fetch(`${base}${ROUTE}`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "X-CSRF-Token": token,
    "Cookie": `scrml_csrf=${token}`,
  },
  body: "{}",
});
console.log(`[http] refreshStatus status=${res.status}`);

// --- 4. collect broadcasts --------------------------------------------------
await sleep(600);

const newA = a.msgs.slice(baselineA);
const newB = b.msgs.slice(baselineB);
const syncA = newA.filter((m) => m.__type === "__sync" && m.__key === "snapshot");
const syncB = newB.filter((m) => m.__type === "__sync" && m.__key === "snapshot");

console.log(`\n[result] client A: ${newA.length} msg(s), ${syncA.length} snapshot __sync`);
console.log(`[result] client B: ${newB.length} msg(s), ${syncB.length} snapshot __sync`);
console.log(`[onconnect] A had ${baselineA} pre-fire msg(s), B had ${baselineB}`);

const sample = syncA[0]?.__val ?? syncB[0]?.__val;
console.log(`[payload] ${JSON.stringify(sample)}`);

// --- 5. verdict -------------------------------------------------------------
const bothGotIt = syncA.length >= 1 && syncB.length >= 1;
const realData = sample && (sample.state === "ok" || sample.state === "error");
const stormy = newA.length > 20 || newB.length > 20;

console.log("\n==================== VERDICT ====================");
console.log(`both clients received snapshot sync : ${bothGotIt ? "YES ✅" : "NO ❌"}`);
console.log(`payload is real jj status           : ${realData ? `YES (state=${sample.state}) ✅` : "NO ❌"}`);
console.log(`echo storm (>20 msgs/client)        : ${stormy ? "YES ⚠️ (possible bug)" : "no"}`);
console.log("=================================================");

a.ws.close(); b.ws.close();
server.stop(true);
process.exit(bothGotIt && realData ? 0 : 1);
