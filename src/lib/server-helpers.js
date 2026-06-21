// Generated library module — scrml compiler output
// ES module: import { name } from './this-file.js'

export const MIME = {
        ".html": "text/html; charset=utf-8",
        ".js":   "application/javascript; charset=utf-8",
        ".css":  "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg":  "image/svg+xml",
        ".png":  "image/png",
        ".ico":  "image/x-icon",
    }

    // mimeFor — map a path's extension to a MIME string, with octet-stream
    // fallback.
    export function mimeFor(path) {
        const dot = path.lastIndexOf(".")
        if (dot < 0) return "application/octet-stream"
        const ext = path.slice(dot)
        return (MIME[ext] !== null && MIME[ext] !== undefined) ? MIME[ext] : "application/octet-stream"
    }

    // composeScrmlFetch — chain a list of scrml-generated fetch handlers
    // into a single dispatcher. First non-null Response wins. Spec:
    // design-insight 22.
    export function composeScrmlFetch(handlers) {
        return async function scrmlDispatch(req) {
            for (const h of handlers) {
                const r = await h(req)
                if ((r !== null && r !== undefined)) return r
            }
            return null
        }
    }
