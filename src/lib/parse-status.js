// Generated library module — scrml compiler output
// ES module: import { name } from './this-file.js'

export function parseStatus(raw) {
        const lines = raw.split("\n")
        const changed = []
        const conflicts = []
        let bookmark = null

        for (const line of lines) {
            // Changed files: "M path", "A path", "D path"
            const fileMatch = line.match(/^([MAD])\s+(.+)$/)
            if ((fileMatch !== null && fileMatch !== undefined)) {
                const kind = fileMatch[1] == "M" ? "modified"
                    : fileMatch[1] == "A" ? "added"
                    : "deleted"
                changed.push({ kind, path: fileMatch[2].trim() })
                continue
            }

            // Conflicted files: "C path"
            const conflictMatch = line.match(/^C\s+(.+)$/)
            if ((conflictMatch !== null && conflictMatch !== undefined)) {
                conflicts.push(conflictMatch[1].trim())
                continue
            }

            // Bookmark detection from Working copy line.
            const bookmarkMatch = line.match(/^Working copy\s*:\s*\S+\s+(.+)/)
            if ((bookmarkMatch !== null && bookmarkMatch !== undefined)) {
                const rest = bookmarkMatch[1].trim()
                // Ignore "(no description set)" and similar.
                if (rest && !rest.startsWith("(")) {
                    bookmark = rest
                }
            }
        }

        const hasConflictMessage = /unresolved conflict/i.test(raw)

        return { changed, conflicts, bookmark, hasConflictMessage }
    }
