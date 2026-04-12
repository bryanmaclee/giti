# giti — Session 4 Hand-Off

**Date:** 2026-04-12
**Next hand-off filename:** `handOffs/hand-off-4.md`

## Caught-up state (from sessions 1-3)
- Split from scrml8 complete
- CLI: 10 commands, 1,079 LOC, jj-lib 0.40 wrapper
- Spec: `giti-spec-v1.md` ratified, 1,531 lines
- S2 cold project-mapper run: 0 non-compliant docs
- S3: Bun HTTP API (read + local-dev writes), `land` compiler gate, compile-on-serve pipeline, static `ui/status.scrml` shell
- 118 tests pass (81 CLI + 7 jj-integration + 33 server + 6 land — minus 9 skipped)
- **GITI-BLOCK-001:** `<request>` state machine not wired to route fetch — all client-side data fetching broken. Repro at `ui/repros/repro-01-request-minimal.scrml`. Secondary issues observed but not minimized.
- **Pending:** dropbox escalation to scrmlTS for GITI-BLOCK-001 (drafted S3, not yet sent)

## Inbox
- No incoming messages

## Session 4 work

(in progress)
