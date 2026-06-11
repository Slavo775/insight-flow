# N88 — Agent-module composer spike — Checklist

## Done criteria

- [ ] `moduleSchema` + `composedAgentSchema` defined in `core/schema/` and exported via the barrel + `src/index.ts`
- [ ] `minimal-diff` + `scope-guard` modules authored as data
- [ ] `task-implement` + `task-review-fix` composed-agent definitions authored, both referencing the two shared modules
- [ ] composer path emits role MD for both agents (text only)
- [ ] emitted MD semantically reproduces hand-written `TASK_IMPLEMENTER_ROLE.md` + `TASK_REVIEW_FIXER_ROLE.md` (deltas reviewed + acceptable)
- [ ] written go/no-go verdict recorded on the core+modules model

## Quality gates

- [ ] `pnpm build` passes (TypeScript strict)
- [ ] `pnpm --dir packages/taskflow test` passes (incl. new composer snapshot/structural test)
- [ ] No lint configured at root (N/A) — diffs minimal, two-space indent + double quotes per existing `src/`
- [ ] No regressions in `prompt-build` or the existing role files

## Verification

- [ ] Emitted `task-implement` + `task-review-fix` MD diffed against hand-written roles; deltas reviewed and acceptable (semantic match)
- [ ] Playground (`pnpm play`) run; both composed agents behave as before
