// Generated library module — scrml compiler output
// ES module: import { name } from './this-file.js'

import { sep } from "./_scrml/path.js"

    // normalizeRelPath — repo-relative path to forward-slash form for
    // glob matching. Strips leading "./" and "/" segments.
    export function normalizeRelPath(p) {
        if (!p) return ""
        const sepRegex = sep == "\\" ? new RegExp("\\\\", "g") : new RegExp(sep, "g")
        let out = p.replace(sepRegex, "/")
        while (out.startsWith("./")) out = out.slice(2)
        while (out.startsWith("/")) out = out.slice(1)
        return out
    }

    // globToRegExp — compile a glob into a JS RegExp anchored at start+end.
    // Supports `*`, `**`, `?`, character classes `[abc]`. Other regex
    // metachars are escaped.
    function globToRegExp(glob) {
        let re = "^"
        let i = 0
        while (i < glob.length) {
            const c = glob[i]
            if (c == "*") {
                if (glob[i + 1] == "*") {
                    re = re + ".*"
                    i = i + 1
                    if (glob[i + 1] == "/") i = i + 1
                } else {
                    re = re + "[^/]*"
                }
            } else if (c == "?") {
                re = re + "[^/]"
            } else if (c == "[") {
                const close = glob.indexOf("]", i + 1)
                if (close == -1) {
                    re = re + "\\["
                } else {
                    re = re + glob.slice(i, close + 1)
                    i = close
                }
            } else if (/[.+^$(){}|\\]/.test(c)) {
                re = re + "\\" + c
            } else {
                re = re + c
            }
            i = i + 1
        }
        re = re + "$"
        return new RegExp(re)
    }

    // matchGlob — return true if `relPath` matches the given glob.
    export function matchGlob(relPath, glob) {
        const p = normalizeRelPath(relPath)
        const g = glob.trim()
        if (!g) return false

        const hasMeta = /[*?\[]/.test(g)
        if (g.endsWith("/")) {
            const prefix = g.slice(0, -1)
            return p == prefix || p.startsWith(prefix + "/")
        }
        if (!hasMeta) {
            if (p == g) return true
            return p.startsWith(g + "/")
        }

        const re = globToRegExp(g)
        return re.test(p)
    }

    // isPrivatePath — true iff any glob matches.
    export function isPrivatePath(relPath, globs) {
        if (!relPath) return false
        for (const g of globs) {
            if (matchGlob(relPath, g)) return true
        }
        return false
    }

    // partitionByScope — split a list of {path, kind?} entries into
    // public / private buckets.
    export function partitionByScope(files, globs) {
        const pub = []
        const priv = []
        for (const f of files) {
            if (isPrivatePath(f.path, globs)) {
                priv.push(f)
            } else {
                pub.push(f)
            }
        }
        return { public: pub, private: priv }
    }
