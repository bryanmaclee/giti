// Generated library module — scrml compiler output
// ES module: import { name } from './this-file.js'

// Canonical bookmark names per giti spec §12.
    export const PUBLIC_BOOKMARK = "main"
    export const PRIVATE_BOOKMARK = "_private"

    // Compute which bookmarks to push, given a resolved target remote.
    //   - no target remote → empty (let engine default)
    //   - public remote    → [main]
    //   - private remote   → [main, _private]
    // Spec §12.3 normative #1/#2.
    export function bookmarksForPush(targetRemote) {
        if (!targetRemote) return []
        if (targetRemote.scope == "private") {
            return [PUBLIC_BOOKMARK, PRIVATE_BOOKMARK]
        }
        return [PUBLIC_BOOKMARK]
    }
