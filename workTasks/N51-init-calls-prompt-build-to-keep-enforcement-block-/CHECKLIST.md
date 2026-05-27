# N51 — init calls prompt-build to keep enforcement block in sync with config — Checklist

## Done criteria

- [ ] `insight-flow init` generates `AGENT_ENFORCEMENT.md` without requiring a separate `prompt-build --apply` call
- [ ] Re-running `init` regenerates the enforcement block from current config (idempotent)
- [ ] Console output distinguishes "Created" vs "Updated" for `AGENT_ENFORCEMENT.md`
- [ ] `applyEnforcement` is an exported function in `prompt-build.ts` reused by both `init` and `cmdPromptBuild`
- [ ] Enforcement step runs after role file copy and agent extension application

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes with no TypeScript errors
- [ ] N50 is merged before this task is implemented

## Verification

- [ ] Fresh `init` in empty dir produces `AGENT_ENFORCEMENT.md`
- [ ] `init` re-run on existing project updates `AGENT_ENFORCEMENT.md` to match current config
- [ ] `insight-flow prompt-build` dry-run output matches content of `AGENT_ENFORCEMENT.md` after `init`
