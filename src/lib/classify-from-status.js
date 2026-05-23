// Generated library module — scrml compiler output
// ES module: import { name } from './this-file.js'

import { parseStatus } from "./parse-status.js"
    import { classifyChanges } from "./save-routing-pure.js"
    import { loadPrivateManifest } from "./scope-manifest.js"

    // classifyFromStatus — raw jj status output + repo root → routing decision.
    export function classifyFromStatus(rawStatus, repoRoot) {
        const parsed = parseStatus((rawStatus !== null && rawStatus !== undefined) ? rawStatus : "")
        const globs = loadPrivateManifest(repoRoot)
        return {
            ...classifyChanges(parsed.changed, globs),
            parsed,
        }
    }
