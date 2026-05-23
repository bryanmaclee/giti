// Generated library module — scrml compiler output
// ES module: import { name } from './this-file.js'

import { PUBLIC_BOOKMARK, PRIVATE_BOOKMARK } from "./bookmarks.js"

    // advanceBookmarks — point each bookmark at `target` (default "@-").
    // Non-fatal: a single bookmark failing doesn't stop the rest.
    //
    // NOTE: per §13.1 scrml prefers no `async` in user source — the
    // compiler auto-awaits statically-known Promise<T> callees. We keep
    // `async`/`await` here because `engine` is an arbitrary JS-host
    // object with no scrml type info, so the compiler cannot prove its
    // methods return Promises. Emits I-ASYNC-USER-SOURCE info warning.
    // A future port could refactor to `safeCallAsync` from scrml:host +
    // `!{ }` failable arms to fully adopt the values-not-exceptions idiom.
    export async function advanceBookmarks(engine, bookmarks, target) {
        const where = (target !== null && target !== undefined) ? target : "@-"
        const results = []
        for (const name of bookmarks) {
            const r = await engine.setBookmark(name, where)
            results.push({ name, ok: r.ok, error: r.ok ? null : r.error })
        }
        return results
    }

    // autoSplitSave — split a mixed working copy into public + private
    // commits and advance both bookmarks.
    //
    // Workflow per spec §12.5:
    //   1. jj split <publicPaths>  → public commit, @ becomes remainder
    //   2. redescribe @              → private message on the remainder
    //   3. jj new                    → fresh WC above the private commit
    //   4. advance bookmarks         → main → @--, _private → @-
    // See §13.1 note on advanceBookmarks above re: explicit async/await.
    export async function autoSplitSave(engine, plan) {
        const publicPaths = plan.publicFiles.map(f => f.path)
        if (publicPaths.length == 0) {
            return { ok: false, stage: "precondition", error: "no public paths to split" }
        }
        const privFiles = (plan.privateFiles !== null && plan.privateFiles !== undefined) ? plan.privateFiles : []
        if (privFiles.length == 0) {
            return { ok: false, stage: "precondition", error: "no private paths to split" }
        }

        // 1. Split out the public subset.
        const splitResult = await engine.split({
            paths: publicPaths,
            message: plan.publicMessage,
        })
        if (!splitResult.ok) {
            return { ok: false, stage: "split", error: splitResult.error }
        }

        // 2. Redescribe the remainder with the private message.
        if (typeof engine._rawDescribe == "function") {
            const descResult = await engine._rawDescribe("@", plan.privateMessage)
            if (!descResult.ok) {
                return { ok: false, stage: "describe", error: descResult.error }
            }
        }

        // 3. Fresh WC above the private commit.
        if (typeof engine.newChange == "function") {
            const newResult = await engine.newChange()
            if (!newResult.ok) {
                return { ok: false, stage: "new", error: newResult.error }
            }
        }

        // 4. Advance bookmarks.
        const bookmarkMoves = []
        const mainMove = await engine.setBookmark(PUBLIC_BOOKMARK, "@--")
        bookmarkMoves.push({
            name: PUBLIC_BOOKMARK,
            ok: mainMove.ok,
            error: mainMove.ok ? null : mainMove.error,
        })
        const privMove = await engine.setBookmark(PRIVATE_BOOKMARK, "@-")
        bookmarkMoves.push({
            name: PRIVATE_BOOKMARK,
            ok: privMove.ok,
            error: privMove.ok ? null : privMove.error,
        })

        return { ok: true, bookmarkMoves }
    }
