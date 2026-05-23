// Generated library module — scrml compiler output
// ES module: import { name } from './this-file.js'

// extractSince — pull `--since <duration>` out of an args array.
    // Returns { since: string | not, rest: string[] }.
    export function extractSince(args) {
        const i = args.indexOf("--since")
        if (i == -1) return { since: null, rest: args }
        const value = args[i + 1]
        return {
            since: value,
            rest: args.slice(0, i).concat(args.slice(i + 2)),
        }
    }

    // parseSyncArgs — parse `giti sync [--remote NAME] [--push] [--pull]`.
    // If neither --push nor --pull is given, defaults to both (full sync).
    // Supports both `--remote NAME` (space form) and `--remote=NAME`.
    export function parseSyncArgs(args) {
        let remote = null
        let push = false
        let pull = false

        for (let i = 0; i < args.length; i = i + 1) {
            const a = args[i]
            if (a == "--remote") {
                // GITI-015 workaround: hoist computed access into a local
                // (ternary `args[i+1] is some ? ... : ...` fails to lower).
                const next = args[i + 1]
                remote = (next !== null && next !== undefined) ? next : null
                i = i + 1
            } else if (a.startsWith("--remote=")) {
                remote = a.slice("--remote=".length)
            } else if (a == "--push") {
                push = true
            } else if (a == "--pull") {
                pull = true
            }
        }

        if (!push && !pull) {
            push = true
            pull = true
        }
        return { remote, push, pull }
    }
