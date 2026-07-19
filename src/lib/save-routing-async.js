// Generated library module — scrml compiler output
// ES module: import { name } from './this-file.js'

import { PUBLIC_BOOKMARK, PRIVATE_BOOKMARK } from "./bookmarks.js"
    import { safeCallAsync } from "./_scrml/host.js"

    // advanceBookmarks — point each bookmark at `target` (default "@-").
    // Non-fatal: a single bookmark failing doesn't stop the rest.
    //
    // S20 (GITI-037 closed, scrml 1c577da5): this module used to carry
    // explicit `async`/`await` because `engine` is an arbitrary JS-host
    // object with no scrml type info, so the compiler could not prove its
    // methods return Promises. Colorless-async Seam-A now infers async-ness
    // across function boundaries from the `safeCallAsync` host primitive, so the
    // source is plain and synchronous-looking; the compiler carries the
    // color. The `::Thrown` arm also coerces a host throw into the engine's
    // own `{ ok, error }` result shape, so downstream readers are unchanged.
    

    // autoSplitSave — split a mixed working copy into public + private
    // commits and advance both bookmarks.
    //
    // Workflow per spec §12.5:
    //   1. jj split <publicPaths>  → public commit, @ becomes remainder
    //   2. redescribe @              → private message on the remainder
    //   3. jj new                    → fresh WC above the private commit
    //   4. advance bookmarks         → main → @--, _private → @-
    // See the colorless-async note on advanceBookmarks above.

export async function advanceBookmarks(engine, bookmarks, target) {
  const where = (target !== null && target !== undefined) ? target : "@-";
  const results = [];
  for (const name of bookmarks) {
    let _scrml__scrml_result_1 = await safeCallAsync(() => engine.setBookmark(name, where));
  if (_scrml__scrml_result_1 && _scrml__scrml_result_1.__scrml_error) {
    if (_scrml__scrml_result_1.variant === "Thrown") {
      const msg = _scrml__scrml_result_1.data;
      _scrml__scrml_result_1 = {ok: false, error: msg};
    }
    else { return _scrml__scrml_result_1; }
  }
  var r = _scrml__scrml_result_1;
    results.push({name, ok: r.ok, error: r.ok ? null : r.error});
  }
  return results;
}

export async function autoSplitSave(engine, plan) {
  const publicPaths = plan.publicFiles.map((f) => f.path);
  if ((publicPaths.length === 0)) {
    return {ok: false, stage: "precondition", error: "no public paths to split"};
  }
  const privFiles = ((__scrml_is_v) => __scrml_is_v !== null && __scrml_is_v !== undefined)(plan.privateFiles) ? plan.privateFiles : [];
  if ((privFiles.length === 0)) {
    return {ok: false, stage: "precondition", error: "no private paths to split"};
  }
  let _scrml__scrml_result_2 = await safeCallAsync(() => engine.split({paths: publicPaths, message: plan.publicMessage}));
  if (_scrml__scrml_result_2 && _scrml__scrml_result_2.__scrml_error) {
    if (_scrml__scrml_result_2.variant === "Thrown") {
      const msg = _scrml__scrml_result_2.data;
      _scrml__scrml_result_2 = {ok: false, error: msg};
    }
    else { return _scrml__scrml_result_2; }
  }
  var splitResult = _scrml__scrml_result_2;
  if (!splitResult.ok) {
    return {ok: false, stage: "split", error: splitResult.error};
  }
  if ((typeof engine._rawDescribe === "function")) {
    let _scrml__scrml_result_3 = await safeCallAsync(() => engine._rawDescribe("@", plan.privateMessage));
  if (_scrml__scrml_result_3 && _scrml__scrml_result_3.__scrml_error) {
    if (_scrml__scrml_result_3.variant === "Thrown") {
      const msg = _scrml__scrml_result_3.data;
      _scrml__scrml_result_3 = {ok: false, error: msg};
    }
    else { return _scrml__scrml_result_3; }
  }
  var descResult = _scrml__scrml_result_3;
    if (!descResult.ok) {
    return {ok: false, stage: "describe", error: descResult.error};
  }
  }
  if ((typeof engine.newChange === "function")) {
    let _scrml__scrml_result_4 = await safeCallAsync(() => engine.newChange());
  if (_scrml__scrml_result_4 && _scrml__scrml_result_4.__scrml_error) {
    if (_scrml__scrml_result_4.variant === "Thrown") {
      const msg = _scrml__scrml_result_4.data;
      _scrml__scrml_result_4 = {ok: false, error: msg};
    }
    else { return _scrml__scrml_result_4; }
  }
  var newResult = _scrml__scrml_result_4;
    if (!newResult.ok) {
    return {ok: false, stage: "new", error: newResult.error};
  }
  }
  const bookmarkMoves = [];
  let _scrml__scrml_result_5 = await safeCallAsync(() => engine.setBookmark(PUBLIC_BOOKMARK, "@--"));
  if (_scrml__scrml_result_5 && _scrml__scrml_result_5.__scrml_error) {
    if (_scrml__scrml_result_5.variant === "Thrown") {
      const msg = _scrml__scrml_result_5.data;
      _scrml__scrml_result_5 = {ok: false, error: msg};
    }
    else { return _scrml__scrml_result_5; }
  }
  var mainMove = _scrml__scrml_result_5;
  bookmarkMoves.push({name: PUBLIC_BOOKMARK, ok: mainMove.ok, error: mainMove.ok ? null : mainMove.error});
  let _scrml__scrml_result_6 = await safeCallAsync(() => engine.setBookmark(PRIVATE_BOOKMARK, "@-"));
  if (_scrml__scrml_result_6 && _scrml__scrml_result_6.__scrml_error) {
    if (_scrml__scrml_result_6.variant === "Thrown") {
      const msg = _scrml__scrml_result_6.data;
      _scrml__scrml_result_6 = {ok: false, error: msg};
    }
    else { return _scrml__scrml_result_6; }
  }
  var privMove = _scrml__scrml_result_6;
  bookmarkMoves.push({name: PRIVATE_BOOKMARK, ok: privMove.ok, error: privMove.ok ? null : privMove.error});
  return {ok: true, bookmarkMoves};
}
