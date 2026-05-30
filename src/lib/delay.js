/**
 * delay(ms) — a Promise that resolves after `ms` milliseconds.
 *
 * Used to pace SSE `server function*` poll loops (ui/feed.scrml). Kept as a
 * tiny JS host helper because scrml auto-await only fires for statically-known
 * Promise<T> callees; an explicit `await delay(...)` at the untyped host edge
 * is the spec idiom (giti DF-10).
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
