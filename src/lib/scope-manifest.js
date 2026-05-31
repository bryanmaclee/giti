// Generated library module — scrml compiler output
// ES module: import { name } from './this-file.js'

import { dirname, join } from "./_scrml/path.js"
    import { readFileSync, writeFileSync, existsSync, mkdirSync } from "./_scrml/fs.js"

    export const MANIFEST_PATH = ".giti/private"
    export const MANIFEST_FILE_NAME = "private"

    export function loadPrivateManifest(repoRoot) {
        const abs = join(repoRoot, MANIFEST_PATH)
        const globs = [MANIFEST_PATH]

        if (!existsSync(abs)) {
            return globs
        }

        const raw = readFileSync(abs, "utf8")
        for (const rawLine of raw.split("\n")) {
            const line = rawLine.trim()
            if (!line || line.startsWith("#")) continue
            if (line == MANIFEST_PATH) continue
            globs.push(line)
        }
        return globs
    }

    export function savePrivateManifest(repoRoot, globs) {
        const abs = join(repoRoot, MANIFEST_PATH)
        const dir = dirname(abs)

        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true })
        }

        const filtered = globs
            .map(g => g.trim())
            .filter(g => g && !g.startsWith("#") && g != MANIFEST_PATH)

        const unique = Array.from(new Set(filtered))
        const body = unique.length == 0 ? "" : unique.join("\n") + "\n"

        const header =
            "# giti private paths (spec §12)\n" +
            "# One glob per line. Matching files stay on the _private bookmark\n" +
            "# and are never pushed to remotes scoped 'public'.\n" +
            "\n"

        writeFileSync(abs, header + body, "utf8")
    }

    export function addPrivatePattern(repoRoot, pattern) {
        const trimmed = (pattern || "").trim()
        if (!trimmed) {
            return { added: false, reason: "empty pattern", globs: loadPrivateManifest(repoRoot) }
        }

        const globs = loadPrivateManifest(repoRoot)
        if (globs.includes(trimmed)) {
            return { added: false, reason: "already present", globs }
        }
        const updated = [...globs, trimmed]
        savePrivateManifest(repoRoot, updated)
        return { added: true, globs: loadPrivateManifest(repoRoot) }
    }

    export function removePrivatePattern(repoRoot, pattern) {
        const trimmed = (pattern || "").trim()
        if (!trimmed) {
            return { removed: false, reason: "empty pattern", globs: loadPrivateManifest(repoRoot) }
        }
        if (trimmed == MANIFEST_PATH) {
            return { removed: false, reason: "cannot unmark the manifest itself", globs: loadPrivateManifest(repoRoot) }
        }

        const globs = loadPrivateManifest(repoRoot)
        if (!globs.includes(trimmed)) {
            return { removed: false, reason: "not in manifest", globs }
        }
        const updated = globs.filter(g => g != trimmed)
        savePrivateManifest(repoRoot, updated)
        return { removed: true, globs: loadPrivateManifest(repoRoot) }
    }
