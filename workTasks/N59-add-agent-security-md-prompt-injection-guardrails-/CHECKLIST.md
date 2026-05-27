# N59 — add AGENT_SECURITY.md prompt-injection guardrails, import in all agents — Checklist

## Done criteria

- [ ] `AGENT_SECURITY.md` exists at repo root with ≤ 30 lines of guardrail rules
- [ ] `AGENT_ENFORCEMENT.md` contains `@AGENT_SECURITY.md` import
- [ ] All 8 `TASK_*_ROLE.md` / `TASKMASTER*_ROLE.md` files still import `@AGENT_ENFORCEMENT.md` (no regressions)
- [ ] `packages/taskflow/templates/roles/AGENT_SECURITY.md` synced copy exists

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `node packages/taskflow/scripts/sync-role-templates.mjs` exits 0

## Verification

- [ ] `grep '@AGENT_SECURITY' AGENT_ENFORCEMENT.md` returns a match
- [ ] `wc -l AGENT_SECURITY.md` ≤ 30 lines
- [ ] `grep '@AGENT_ENFORCEMENT' TASKMASTER_ROLE.md TASK_IMPLEMENTER_ROLE.md TASK_REVIEWER_ROLE.md` all return matches
