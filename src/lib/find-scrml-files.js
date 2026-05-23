// Generated library module — scrml compiler output
// ES module: import { name } from './this-file.js'

import { join } from "./_scrml/path.js"
    import { readdirSync, statSync } from "./_scrml/fs.js"

    const SKIP_DIRS = ["docs", "node_modules", "dist"]

    function shouldSkipDir(relPath) {
        for (const skip of SKIP_DIRS) {
            if (relPath == skip) return true
        }
        return false
    }

    function walk(dir, relPath, files) {
        const entries = readdirSync(dir)
        for (const entry of entries) {
            const full = join(dir, entry)
            const rel = relPath == "" ? entry : relPath + "/" + entry
            const stats = statSync(full)
            // DF-11: scrml:fs.statSync returns booleans `isFile`/`isDirectory`
            // as already-resolved properties, NOT methods like Node's fs.Stats.
            // Also returns `not` on ENOENT — skip if no stat.
            if ((stats === null || stats === undefined)) continue
            if (stats.isDirectory) {
                // Skip excluded directories at any depth.
                if (shouldSkipDir(rel)) continue
                walk(full, rel, files)
            } else if (entry.endsWith(".scrml")) {
                files.push(rel)
            }
        }
    }

    export function findScrmlFiles(opts) {
        const o = (opts !== null && opts !== undefined) ? opts : {}
        const myCwd = (o.cwd !== null && o.cwd !== undefined) ? o.cwd : "."
        const files = []
        walk(myCwd, "", files)
        files.sort()
        return files
    }
