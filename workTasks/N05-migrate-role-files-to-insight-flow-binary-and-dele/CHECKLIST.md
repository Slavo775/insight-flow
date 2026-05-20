# N05 — Migrate role files to insight-flow binary and delete scripts/task-tracker.mjs — Checklist

## Done criteria
- [ ] All 8 `TASK_*_ROLE.md` / `TASKMASTER*_ROLE.md` files updated — every `node scripts/task-tracker.mjs <cmd>` invocation replaced with `insight-flow <cmd>`
- [ ] `CLAUDE.md` "Scripts" section no longer references `scripts/task-tracker.mjs`
- [ ] Any `.claude/commands/` or skill files referencing the legacy script have been updated
- [ ] `scripts/task-tracker.mjs` deleted from the repo
- [ ] `insight-flow` CLI command parity confirmed against the legacy script's command list (or parity gaps explicitly flagged and addressed)

## Quality gates
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` (or `pnpm lint`) passes
- [ ] No regressions in affected area
- [ ] `grep -rn "task-tracker.mjs" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist` returns zero matches

## Verification
- [ ] `insight-flow current` returns the same output the legacy script returned (expected: current task JSON with id/title/status/folder)
- [ ] `insight-flow next` returns a ready task (or "no ready tasks") consistent with the legacy script
- [ ] `insight-flow stats` runs without error and prints task counts
- [ ] `insight-flow list --status merged` lists merged tasks correctly
- [ ] Manual scan of one updated role file confirms commands work end-to-end (e.g., open `TASK_IMPLEMENTER_ROLE.md`, run one of its `insight-flow` commands against a test task)
