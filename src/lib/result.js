// Generated library module — scrml compiler output
// ES module: import { name } from './this-file.js'

export function ok(data) {
        return { ok: true, data }
    }

    export function err(error) {
        return { ok: false, error }
    }

    // parseTestSummary — extract the "N pass" count from `bun test` output.
    // Returns the count as a string, or "?" if not parseable.
    export function parseTestSummary(combined) {
        const m = combined.match(/(\d+) pass/)
        return (m !== null && m !== undefined) ? m[1] : "?"
    }
