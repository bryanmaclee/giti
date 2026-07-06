<!-- flobase:project:start (managed region — replaced by flobase assemble; do not edit by hand) -->

# giti — flobase-assembled PA config

*`/flobase`-assembled 2026-07-06 (mid-flight · medium · gate=`bun test`). Boot rehydrates from
`.pa-base/profile`; this region is the CORE + module-set reference. **Authority defers to `pa.md`**
(giti's authored PA contract) — flobase CORE + modules layer on top, they never replace it.*

**CORE** is the global `~/.claude/CLAUDE.md` (flobase CORE — auto-loaded every session): the 5 Rules,
the anti-drift GATE discipline, context-economy, the PA operating loop. Not re-embedded here.

## Assembled module set (lean — default-minimum)
- **loaded (init):** CORE · **stack-pack-scrml** · **role-pa** (→ `pa.md`) · **maps** (`.claude/maps/`) ·
  **continuity:light** (hand-off + `/wrap`; no delta-log).
- **on-demand (load when an event earns it):** role-dpa + deliberation (a design fork — giti-proper/auth,
  the 100%-scrml roadmap) · role-spa (a queued work-list) · role-cpa (multi-project) · role-vpa ·
  dock (0 coverage) · vcs-drive (covered by `pa.md`'s push discipline).
- **flagged:** the JS/Bun stack has no packaged stack-pack (go/scrml/ts are packaged) — giti's JS
  conventions live in `pa.md` + `.claude/maps/`, not a pack.

## GATE — "done" is unfakeable (re-ground here at every step)
- **merge gate:** `bun test` → **375/0** across 14 files (no commit hook installed — the manual run IS
  the gate). Never claim done on green-compile alone.
- **runtime gates:** the scrml compiler-gate in `giti land`; and for UI, `giti serve` +
  `tests/manual/browser-paint.mjs` (real DOM paint — server-200 ≠ renders; this is the reusable
  browser-render gate).
- **types:** none (plain JS ESM, no `tsc`). Shape-safety is the scrml compiler on the `.scrml` layer.
- **compiler is `../scrml`** (verify HEAD at each compile; it moves fast). A scrml compiler bug blocking
  a giti page is a P0 escalation (file to `../scrml/handOffs/incoming/`, keep idiomatic source — option A).

## Individualisation (reuse the shared scrmlMaster layer)
- cross-project register: `../scrml-support/pa-profile-bryan.md`. per-repo voice ledger: giti-root
  `user-voice.md` (append-only, verbatim, contentful directives only).

## Load-bearing conventions (full text in `pa.md`)
- Single writer to main's HEAD + durable state. Commit to main **only after explicit in-session auth**;
  **PA pushes origin directly** (master-push retired 2026-05-30). Pathspec commits. Never `--no-verify`
  without authz.
- **Standing auth:** file cross-repo bug reports to siblings (`../scrml`) without per-report permission
  (push still needs auth). Reports carry a minimal version-stamped repro.
- Dogfood mission: giti authored in scrml where possible (17 lib modules + 7 UI pages already). Goal =
  100% scrml (excl. jj — waits on AST con-res). Repros committed at `ui/repros/`.
- Boot = `/boot` (Profile A default). Wrap = `/wrap`. Hand-off rotates `hand-off.md` → `handOffs/hand-off-<N>.md`.

<!-- flobase:project:end -->
