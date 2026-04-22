---
from: master
to: giti
date: 2026-04-22
subject: pa.md updates — (1) relax no-direct-main rule + (2) cross-repo bug reports must carry reproducer source
needs: action
status: unread
---

**Two pa.md edits combined into this message. Both user-authorized 2026-04-22.**

---

# Edit 1 — relax "no direct commits to main" rule

6nz raised that the blanket "do not commit to main directly" rule in every per-repo pa.md hasn't been honored in practice and is producing friction. The user authorized relaxing the rule across all repos.

## What to change in `giti/pa.md`

Two occurrences to update:

- **Line 61** (under top-level `## What NOT to do`): remove `Do not commit to main directly`
- **Line 140** (under `### What NOT to do`): remove `Do not commit to main directly`

Replace with a positive rule in a nearby "commit rules" section, e.g.:

> Commits to main are allowed only after explicit user authorization in the current session. Confirm with the user before the first commit of a session, and before any push. Authorization stands for the scope specified, not beyond.

## Scope — what stays unchanged

- **Pushing to origin** — still gated on the master-PA push coordination flow. This change is about *local commits to main*, not pushes.
- **Force-push / destructive ops** — explicitly-authorized-only.
- **Hook bypass (`--no-verify`)** — explicitly-authorized-only.

---

# Edit 2 — cross-repo bug reports MUST carry reproducer source

giti is one of the primary *senders* of cross-repo bug reports (GITI-001 through GITI-008 into scrmlTS). This rule codifies the reproducer-carrying practice that was mostly followed but not written down.

## New rule to add in `giti/pa.md` (suggested location: near the cross-repo-messaging or PA-scope sections)

> ### Cross-repo bug reports — reproducer source required
>
> When this PA files a bug report into another repo's `handOffs/incoming/` — or when this PA receives one — the report MUST include a minimal scrml reproducer:
> - **Inline** as a ` ```scrml ` fenced block in the message body (preferred for ≤ ~200 lines), OR
> - **Sidecar file** dropped next to the message: `YYYY-MM-DD-HHMM-<slug>.scrml` (same stem as the `.md`)
>
> Reproducer must be:
> - **Self-contained** — runnable against the receiving repo's current compiler without external setup
> - **Minimal** — smallest scrml that still exhibits the bug
> - **Version-stamped** — exact command used and compiler SHA (e.g., `scrmltsc repro.scrml` against `scrmlTS@ccae1f6`)
> - **Expected vs actual** — state both in the report body
>
> As SENDER (giti's typical role): attach the offending scrml from your repo (or a minimized version of it) every time. As RECEIVER (rare): do not begin diagnosis without the reproducer — reply-requesting source before acting.

---

## After applying both edits

Reply back via `master/handOffs/incoming/` when `pa.md` is updated.

— master PA
