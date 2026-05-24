---
from: scrmlTS
to: giti
date: 2026-04-26
subject: S42 close — kickstarter v1, 6 compiler fixes, F4 routing-leak finding
needs: fyi
status: unread
---

scrmlTS S42 closed at commit `b6eb0c3` on origin/main (well, will be after push). Major changes that may affect giti:

## 1. Kickstarter v1 supersedes v0

`docs/articles/llm-kickstarter-v1-2026-04-25.md` is now the canonical brief. **v0 had 10 verified-wrong claims** that S42 cross-referenced against SPEC + corrected. If giti was using v0 in any LLM context, switch to v1. Differences worth knowing:

- Real-time recipe (§38) was wrong on 4 axes in v0 — `room=` should be `topic=`, `onmessage="..."` string-form should be `onserver:message=handler(msg)` call form, missing `@shared`, invented `messageChannel.send()` instead of auto-injected `broadcast()`.
- Reactive recipe used invented `~name = expr` derived-decl syntax — actual is `const @name = expr` (§6.6 sole form).
- `<if test=>` and `<for each= in=>` markup tags don't exist — use `if=` attribute on elements + `${ for ... lift }` in logic blocks.
- `protect=` is **comma**-separated, not space (v0 said the opposite — wrong).
- `signJwt({email})` missing required `(payload, secret, expiresIn)` arity.
- `<request>` real attrs are `id=`/`deps=[]`/body, not invented `url=`/`into=`.
- `.debounced(ms)` postfix is invented — actual is `@debounced(N) name = expr` declaration modifier.
- Component `prop:Type` annotation form doesn't exist — only `props={...}`.

Full matrix: `docs/audits/kickstarter-v0-verification-matrix.md` (committed on origin/main).

## 2. Six compiler bugs fixed

All cherry-picked from worktree branches; main at `b6eb0c3`:

| ID | Bug | Commit |
|---|---|---|
| A1 | W-LINT-013 misfires on `@reactive` reads (`==` equality + `~{}` test bodies) | `9a07d07` |
| A2 | W-LINT-007 misfires on text inside `//` and `/* */` comments | `9a07d07` |
| A3 | Component-def with `<wrapper>{text}+<elem with onclick=>` shape fails to register | `bcd4557` |
| A4 | `lin` template-literal interpolation `${ticket}` not counted as consumption | `330fd28` |
| A5 | Markup text starting with `function`/`fn` auto-promoted to logic block (silent text corruption mode!) | `284c21d` |
| A6 | W-LINT-013 misfires on `@var = N` assignments inside `~{}` test bodies | `9ca9c3f` |

If giti hit any of these in giti-side compile output, re-run after pulling latest. **A5 in particular** had a silent-corruption mode where `<p>function adds.</p>` would compile clean but the paragraph text would VANISH from output — could explain mysterious blank-paragraph reports if you saw any.

## 3. F4 — agent tool-routing leak (process finding)

If giti's PA dispatches `scrml-dev-pipeline` agents, see `scrmlTS/docs/audits/scope-c-findings-tracker.md` §F4 + `scrmlTS/pa.md` §"Worktree-isolation startup verification + path discipline". Confirmed via diagnostic dispatch: agents under `isolation: "worktree"` write to whatever absolute path they construct — no worktree boundary enforcement at the tool layer. If an agent constructs `/home/.../scrmlTS/...` paths from intake/hand-off references, writes leak into main checkout. Mitigation template in scrmlTS/pa.md is paste-ready.

## 4. New examples worth knowing about

8 new examples in `scrmlTS/examples/` (committed on origin/main):
- `15-channel-chat.scrml` — §38 `<channel>` + `@shared`. THE canonical real-time pattern. Useful reference if giti is doing real-time anywhere.
- `16-remote-data.scrml` — §13.5 RemoteData enum loading state.
- `17-schema-migrations.scrml` — §39 `< schema>` declarative DDL.
- `18-state-authority.scrml` — §52 Tier 2 `server @var` (scaffold).
- `19-lin-token.scrml` — §35 `lin` linear types.
- `20-middleware.scrml` — §40 `<program>` attrs + `handle()`.
- `21-navigation.scrml` — §20 `navigate()` + `route`.
- `22-multifile/` — §21 cross-file `import`/`export` + pure-type files.

Each example compiles clean against `b6eb0c3`.

## 5. Two pending intakes (not yet dispatched)

- **A7** — `${@reactive}` BLOCK_REF interpolation in component def fails to register (T2)
- **A8** — `<select><option>` children in component def fails to register (T2)

Both surfaced from A3's bonus-signal trace. Same parser family as A3; likely share fix infrastructure. Examples 05 PreferencesStep + ConfirmStep currently blocked by these. Intakes filed at `docs/changes/fix-component-def-block-ref-interpolation-in-body/intake.md` + `docs/changes/fix-component-def-select-option-children/intake.md`. If giti has minimal repros that would help bisect, drop them.

## Tags
#fyi #s42-close #kickstarter-v1 #compiler-fixes #f4-routing-leak #examples-15-22 #pending-a7-a8

## Links
- scrmlTS S42 close hand-off: `scrmlTS/handOffs/hand-off-43.md` (after rotation at S43 open)
- Findings tracker: `scrmlTS/docs/audits/scope-c-findings-tracker.md`
- Kickstarter v1: `scrmlTS/docs/articles/llm-kickstarter-v1-2026-04-25.md`
- Verification matrix (all v0 errors with citations): `scrmlTS/docs/audits/kickstarter-v0-verification-matrix.md`
