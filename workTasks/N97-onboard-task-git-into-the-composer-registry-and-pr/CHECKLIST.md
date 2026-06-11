# N97 — Onboard task-git into the composer, registry, and project flow — Checklist

## Done criteria

- [ ] `task-git/*` modules decomposed byte-faithfully from the inline command prompt; only deltas: includes become `notify`/`config` modules, `actions` block appended
- [ ] `notify` + `config` shared include modules registered with descriptions
- [ ] task-git ∈ `COMPOSED_AGENTS`; `/api/agents` lists 10; agents page renders it
- [ ] `TASK_GIT_ROLE.md` generated at root, in the drift suite (×10), synced to templates, scaffolded by init
- [ ] `.claude/commands/task-git.md` reduced to the 3-line `@TASK_GIT_ROLE.md` pointer
- [ ] `project/default.json`: task-git node + edges `task-implement → task-git (implemented)`, `task-git → task-review (pushed)`, `task-human-review → task-git (approved)`; flow validation green
- [ ] No content rewording; no enforcement/protocol includes added

## Quality gates

- [ ] `pnpm build` passes
- [ ] Lint passes (baseline)
- [ ] `pnpm --filter insight-flow test` passes — drift suite covers 10 roles

## Verification

- [ ] `prompt-build --compose --apply` after final commit: all 10 `unchanged`
- [ ] Fresh-init smoke: TASK_GIT_ROLE.md scaffolded; `agents.extend.task-git` lands in the file
- [ ] `/project` map shows the git node in the backbone
