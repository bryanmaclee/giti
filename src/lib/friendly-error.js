// Generated library module — scrml compiler output
// ES module: import { name } from './this-file.js'

// friendlyError — map common jj stderr patterns to friendlier messages.
    // Returns the friendly message if matched, otherwise the raw stderr
    // (capped at 300 chars).
    export function friendlyError(stderr) {
        const raw = stderr.trim()
        if (!raw) return "An unknown error occurred."

        // GIT-002: Not a giti repository.
        if (/not a jj repo/i.test(raw) || /no jj repo/i.test(raw) ||
            /there is no jj repo/i.test(raw) || /not in a git repository/i.test(raw)) {
            return "This directory is not a giti project.\nTo create a new project here: giti init\nTo work with an existing project: navigate to its directory first."
        }

        // Conflict during rebase/merge.
        if (/conflict/i.test(raw) && !/resolved/i.test(raw)) {
            return "Merge conflict detected. Run 'giti status' to see conflicted files, then resolve them and save again."
        }

        // GIT-001: Nothing changed.
        if (/no changes/i.test(raw) || /nothing changed/i.test(raw)) {
            return "Nothing to save. Your work is already captured."
        }

        // Bookmark already exists.
        if (/bookmark.*already exists/i.test(raw)) {
            const match = raw.match(/bookmark\s+"?([^\s"]+)"?/i)
            const name = (match !== null && match !== undefined) ? match[1] : "that name"
            return `A bookmark named '${name}' already exists. Pick a different name or delete the existing one first.`
        }

        // Bookmark not found.
        if (/no such bookmark/i.test(raw) || /bookmark.*not found/i.test(raw)) {
            return "That bookmark does not exist. Run 'giti branches' to see available bookmarks."
        }

        // GIT-003: Revision not found.
        if (/no such revision/i.test(raw) || /revset.*resolved to no revisions/i.test(raw)) {
            return "No context called that name found.\nCheck giti history to see what's available.\nIf you're looking for a remote branch, run giti sync first to get the latest."
        }

        // Working copy is dirty / uncommitted.
        if (/working copy.*uncommitted/i.test(raw)) {
            return "You have uncommitted changes. Save your work first before switching."
        }

        // GIT-010: Remote auth failure.
        if (/authentication/i.test(raw) || /permission denied/i.test(raw)) {
            return "Could not connect to the remote repository. Check your credentials.\nIf you recently changed your password or access token, update it with:\n  giti auth update"
        }

        // GIT-009: No remote configured.
        if (/no remote/i.test(raw) || /no git remote/i.test(raw)) {
            return "No remote repository is configured for this project.\nTo add one: giti remote add <url>"
        }

        // GIT-011: Nothing to undo.
        if (/nothing to undo/i.test(raw) || /no operations/i.test(raw) || /operation log.*empty/i.test(raw)) {
            return "Nothing to undo. This is the beginning of your project's history."
        }

        // GIT-012: Merge into self.
        if (/merge.*into itself/i.test(raw) || /same revision/i.test(raw)) {
            return "Cannot merge a context into itself.\nYou are already there. Switch to a different context first."
        }

        // GIT-008: Disk full.
        if (/no space left/i.test(raw) || /disk full/i.test(raw) || /ENOSPC/i.test(raw)) {
            return "Could not save your work. Your disk is out of space.\nFree up disk space and run giti save again.\nYour current changes are still in your working directory."
        }

        // Generic fallback — return as-is, capped at 300 chars.
        if (raw.length > 300) {
            return raw.slice(0, 297) + "..."
        }
        return raw
    }
