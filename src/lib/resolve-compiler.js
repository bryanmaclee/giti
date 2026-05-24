// Generated library module — scrml compiler output
// ES module: import { name } from './this-file.js'

import { resolve, join } from "./_scrml/path.js"
    import { existsSync as fsExistsSync } from "./_scrml/fs.js"
    import { cwd as processCwd, env as processEnv } from "./_scrml/process.js"

    // resolveCompilerPath — find scrmlTS's CLI.
    // Returns { ok: true, path, root } or { ok: false, error }.
    //
    // opts (all optional):
    //   - cwd: override the cwd for the sibling search
    //   - env: an object with a SCRMLTS_PATH property (for tests)
    //   - fs: an object with an existsSync method (for tests)
    export function resolveCompilerPath(opts) {
        const o = (opts !== null && opts !== undefined) ? opts : {}
        const myCwd = (o.cwd !== null && o.cwd !== undefined) ? o.cwd : processCwd()
        // Either pull SCRMLTS_PATH from an injected env object, or read
        // the real process env via scrml:process.
        const scrmlTsPath = (o.env !== null && o.env !== undefined)
            ? o.env.SCRMLTS_PATH
            : processEnv("SCRMLTS_PATH")
        const myExistsSync = (o.fs !== null && o.fs !== undefined) ? o.fs.existsSync : fsExistsSync

        const candidates = []
        if (scrmlTsPath) candidates.push(resolve(scrmlTsPath))
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
                "Could not find the scrmlTS compiler.\n" +
                "Set $SCRMLTS_PATH to your scrmlTS checkout, or place scrmlTS next to giti:\n" +
                "  scrmlMaster/\n" +
                "    giti/\n" +
                "    scrmlTS/",
        }
    }
