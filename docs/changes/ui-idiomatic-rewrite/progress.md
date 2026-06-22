# UI Idiomatic Rewrite — Progress

Change-id: `ui-idiomatic-rewrite`
Driver: giti S15 (2026-06-22)
Brief: `../scrml-support/docs/deep-dives/giti-idiomatic-audit-2026-06-20.md` + inbox `2026-06-20-2109-scrml-to-giti-idiomatic-audit-rewrite-plan.md`
Compiler: `../scrml` @ `ca712295` (s212, self-id scrml-0.7.0)

## Validated template (current-compiler syntax — corrects audit examples)
- Enum block form: `type Phase:enum = { Loading; Loaded(data: T[]); Failed(err: string) }` (no `transitions{}` for Tier-1 match).
- State cell: `<phase> = Phase.Loading`
- Trigger: `on mount { @phase = loadX() }`
- Server fn returns the variant directly: `if (!res.ok) return Phase.Failed(res.error)` / `return Phase.Loaded(res.data)` — leverages giti Result-tuple contract; NO `!{}` operator needed for the dashboard loads.
- Block-match: `<match for=Phase on=@phase>` with element state-children `<Loading>…</Loading>`, `<Failed(err)>…</Failed>`, `<Loaded(d)>…</Loaded>` (NOT `.Variant :>`).
- Iteration: `<each in=coll key=@.id> … <empty>…</empty> </each>`; `@.field` = current item.
- `scrml promote` is NOT implemented ("impl pending") — Tier-0 sweep is manual.
- Doing full rewrite per-page in ONE pass (each-promotion + Phase-enum together), not two passes.

## Log (append-only)

- 2026-06-22 — Probe `/tmp/giti-idiom-probe/history-shape.scrml` compiled clean, node --check OK, match/each wired. Template validated.
- 2026-06-22 — CG-5 verified resolved: `@import url('theme.css')` emitted intact. history.scrml stale comment removed + scrmlTS→scrml (L14).
