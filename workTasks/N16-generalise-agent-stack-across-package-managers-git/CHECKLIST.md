# N16 — Generalise agent stack across package managers, git hosts, and languages — Checklist

## Done criteria

- [ ] `AGENT_PROTOCOL.md` contains zero literal technology / tool names (no `npx`, `npm `, `pnpm `, `yarn `, `bun `, `tsc`, `tsconfig`, `gh pr`, `gh --`, `github.com`, `gitlab.com`, etc.) outside explicitly-marked example blocks. Workflow step 6 (Quality gates) and the Git/gh rule both delegate to `agents.extend.<agent>`.
- [ ] `.claude/commands/task-git.md` has no literal `gh pr create` / `gh pr view` in the canonical workflow. An "Examples appendix" at the bottom contains illustrations for `gh`, `glab`, and compare-URL fallback, each flagged as example.
- [ ] `TASK_REVIEWER_ROLE.md` and `TASK_REVIEW_FIXER_ROLE.md` no longer mention "GitHub" / "gh" in canonical text. References to `@GITHUB_PR_API.md` are replaced with `@PR_API.md`.
- [ ] `TASK_IMPLEMENTER_ROLE.md`, `TASK_INCIDENT_ROLE.md` workflow steps refer to "the project's quality-gate commands (per `agents.extend`)" instead of literal `tsc`/`npm` commands.
- [ ] `PR_API.md` exists at repo root with a technology-agnostic body + a clearly-marked "Examples appendix". `GITHUB_PR_API.md` is deleted.
- [ ] Every `@GITHUB_PR_API.md` reference across the repo is updated to `@PR_API.md` (verifiable via `grep -r "@GITHUB_PR_API"` returning empty).
- [ ] `packages/taskflow/templates/taskflow.prompt.json` no longer carries `gitTool` (or any technology-specific key). `cmdPromptBuild` no longer reads or substitutes a `gitTool` field — its only remaining job is enforcement-block patching.
- [ ] `insight-flow init` does NOT detect the project's stack and does NOT write a `stack` or `gitTool` field to `taskflow.config.json`. Console output points the user at the extension contract.
- [ ] `--examples` optional flag on `init` writes commented-out `agents.extend.<agent>: []` stubs into `taskflow.config.json` so users have a starting template. Default behaviour is no stubs.
- [ ] `CLAUDE.md` has a new "Extending agents with project-specific commands" section explaining `agents.extend.<agent>` with worked examples for TS, Python, and Go (as user-supplied content, not shipped defaults).
- [ ] `README.md` Configuration section points readers at the same extension contract.
- [ ] All 8 root role files + `AGENT_PROTOCOL.md` + `.claude/commands/task-git.md` + `PR_API.md` are byte-identical to the corresponding `packages/taskflow/templates/...` versions after `pnpm sync-roles`.

## Quality gates

- [ ] `cd packages/taskflow && pnpm typecheck` passes.
- [ ] `pnpm build` clean.
- [ ] `pnpm test` green: existing init + migrate-reviews + scaffold-and-bundle + new `no-technology-tight.test.mjs`.
- [ ] `no-technology-tight.test.mjs` greps every canonical agent prompt file for the forbidden technology strings and fails if any appear outside explicitly-marked example blocks. Covers `AGENT_PROTOCOL.md`, all 8 role files, `.claude/commands/task-git.md`, `PR_API.md`.
- [ ] Updated `init.test.mjs` asserts `init` does not write `stack` or `gitTool` fields, and that the existing `agents.extend` append logic still works.

## Verification

- [ ] `grep -rE "(\\bnpx |\\bnpm run|\\bpnpm |\\byarn |\\bbun |\\btsc\\b|tsconfig|\\bgh pr|\\bgh --|gitlab\\.com|github\\.com|pyproject|requirements\\.txt|pom\\.xml|\\bgo\\.mod\\b|Cargo\\.toml)" AGENT_PROTOCOL.md TASK_*_ROLE.md TASKMASTER_*_ROLE.md .claude/commands/task-git.md PR_API.md` returns hits ONLY inside fenced blocks immediately preceded by `Example:` / `<!-- example -->`.
- [ ] `grep -r "@GITHUB_PR_API"` returns empty.
- [ ] `grep -r "@PR_API.md"` returns hits in reviewer + review-fixer roles.
- [ ] `ls GITHUB_PR_API.md` errors (file deleted); `ls PR_API.md` succeeds.
- [ ] `node packages/taskflow/dist/cli.js init --force` in a tmpdir → produced `taskflow.config.json` has no `stack` field and no `gitTool` field. Stdout includes the extension-contract pointer.
- [ ] Fixture project with `agents.extend.task-implement: ["Run pnpm typecheck before marking implemented."]` still appends that string to the rendered role file (regression check on N12's extension mechanism).
- [ ] `node packages/taskflow/dist/cli.js init --force --examples` writes commented `agents.extend.<agent>: []` stubs for every agent.
- [ ] After this lands and merges, `grep -rE "(npx tsc|npm run lint|gh pr create)"` on main from the repo root returns no matches in canonical role/protocol files — the three N15 blockers (B1/B2/B3) are resolved by deletion.
