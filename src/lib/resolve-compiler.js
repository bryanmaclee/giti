// Generated library module — scrml compiler output
// ES module: import { name } from './this-file.js'

import { resolve, join } from "./_scrml/path.js"
    import { existsSync as fsExistsSync } from "./_scrml/fs.js"
    import { cwd as processCwd, env as processEnv } from "./_scrml/process.js"

    // resolveCompilerPath — find the scrml compiler's CLI.
    // Returns { ok: true, path, root } or { ok: false, error }.
    //
    // opts (all optional):
    //   - cwd: override the cwd for the sibling search
    //   - env: an object with SCRML_PATH / SCRMLTS_PATH (for tests)
    //   - fs: an object with an existsSync method (for tests)
    export function resolveCompilerPath(opts) {
        const o = (opts !== null && opts !== undefined) ? opts : {}
        const myCwd = (o.cwd !== null && o.cwd !== undefined) ? o.cwd : processCwd()
        // Resolve an explicit compiler path from env: prefer SCRML_PATH
        // (canonical), fall back to the legacy SCRMLTS_PATH. Pull from an
        // injected env object (tests) or the real process env.
        const envScrml = (o.env !== null && o.env !== undefined) ? o.env.SCRML_PATH : processEnv("SCRML_PATH")
        const envLegacy = (o.env !== null && o.env !== undefined) ? o.env.SCRMLTS_PATH : processEnv("SCRMLTS_PATH")
        const envPath = (envScrml !== null && envScrml !== undefined) ? envScrml : envLegacy
        const myExistsSync = (o.fs !== null && o.fs !== undefined) ? o.fs.existsSync : fsExistsSync

        const candidates = []
        if (envPath) candidates.push(resolve(envPath))
        // Sibling checkouts: ../scrml is the canonical name; ../scrmlTS is
        // the pre-rename name, kept so older layouts still resolve.
        candidates.push(resolve(myCwd, "..", "scrml"))
        candidates.push(resolve(myCwd, "..", "scrmlTS"))

        for (const root of candidates) {
            const cli = join(root, "compiler", "src", "cli.js")
            if (myExistsSync(cli)) {
                return { ok: true, path: cli, root }
            }
        }

        return {
            ok: false,
            error:
                "Could not find the scrml compiler.\n" +
                "Set $SCRML_PATH (or legacy $SCRMLTS_PATH) to your scrml checkout, " +
                "or place scrml next to giti:\n" +
                "  scrmlMaster/\n" +
                "    giti/\n" +
                "    scrml/",
        }
    }
