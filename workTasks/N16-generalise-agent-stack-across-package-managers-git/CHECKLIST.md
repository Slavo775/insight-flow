# N16 — Generalise agent stack across package managers, git hosts, and languages — Checklist

## Done criteria

- [ ] `TaskflowConfig` gains a `stack` field: `{ packageManager, language, gitHost, gitTool, commands: { typecheck, lint, test, prCreate } }`. Zod schemas updated; field is optional so legacy configs still parse.
- [ ] `packages/taskflow/src/init/detect-stack.ts` exists and exports `detectStack(cwd)` returning the inferred `Stack`. Includes helpers `detectPackageManager`, `detectLanguage`, `detectGitHost`, `detectGitTool`, `commandTriple`.
- [ ] `initProject` writes the detected `stack` into `taskflow.config.json`. Respects `--no-detect` to skip detection. Never overwrites user-edited `stack.*` fields on subsequent runs.
- [ ] `init` console output prints the detected triple in plain English (e.g. "Detected: pnpm + typescript + github · commands: pnpm typecheck / pnpm lint / pnpm test").
- [ ] `prompt-build` substitutes `{{PM}}`, `{{LANG}}`, `{{GIT_HOST}}`, `{{GIT_TOOL}}`, `{{TYPECHECK_CMD}}`, `{{LINT_CMD}}`, `{{TEST_CMD}}`, `{{PR_CREATE_CMD}}` into role docs + `AGENT_PROTOCOL.md` based on `taskflow.config.json.stack`.
- [ ] Null commands render as `# (no <lang> typecheck — skip)` comments rather than empty strings.
- [ ] `packages/taskflow/templates/roles/*.md` + `templates/agent-protocol/AGENT_PROTOCOL.md` use placeholders, not literal `npx tsc` / `npm run *` / `gh pr create`.
- [ ] `.claude/commands/task-git.md` uses `{{PR_CREATE_CMD}}` (not literal `gh pr create`).
- [ ] `packages/taskflow/templates/task/{TASK,CHECKLIST}.md.tpl` Verification sections use the command-triple placeholders.
- [ ] `GITHUB_PR_API.md` removed; replaced by `templates/api/pr-api.{gh,glab,git}.md`. `init` (or `prompt-build --apply`) writes the host-specific variant to the project as `PR_API.md`. Role docs reference `@PR_API.md`.
- [ ] `scripts/sync-role-templates.mjs` reflects the flipped source-of-truth (templates → root for this repo via `prompt-build --apply`).
- [ ] `taskflow.prompt.json` schema updated to carry full stack defaults; `gitTool: gh` removed as a top-level key (now inside `stack`).
- [ ] After running `prompt-build --apply` on this repo, the produced root role files contain `pnpm typecheck` / `pnpm lint` / `pnpm test` / `gh pr create` — no literal `npx tsc` / `npm run *` remain.
- [ ] N15's REVIEW.md updated to mark all three human-flagged blockers resolved with file references to this PR.

## Quality gates

- [ ] `cd packages/taskflow && pnpm typecheck` passes.
- [ ] `pnpm build` clean.
- [ ] `pnpm test` green: existing init + migrate-reviews + scaffold-and-bundle + new `detect-stack.test.mjs` + new `prompt-build-substitution.test.mjs`.
- [ ] `detect-stack.test.mjs` covers ≥ 6 fixture stacks (pnpm-ts-github, npm-ts-github, yarn-ts-github, pyproject-python-gitlab, go-mod-github, empty).
- [ ] `prompt-build-substitution.test.mjs` asserts every placeholder is substituted AND null commands render as the comment fallback.

## Verification

- [ ] `node packages/taskflow/dist/cli.js init --force` in a tmpdir with `pyproject.toml` + `git remote ...gitlab.com...` → `taskflow.config.json.stack` shows `language: python`, `gitHost: gitlab`, `gitTool` matches what's installed (`glab` or `git`).
- [ ] Same in a tmpdir with `go.mod` only → `language: go`, `packageManager: none`.
- [ ] Same in this repo → `packageManager: pnpm`, `language: typescript`, `gitHost: github`, `gitTool: gh`.
- [ ] After `prompt-build --apply` on this repo: `grep "npx tsc" TASK_*_ROLE.md AGENT_PROTOCOL.md` returns empty; `grep "pnpm typecheck"` returns hits in the expected places.
- [ ] After `prompt-build --apply` in a fixture Python project: produced role files contain `uv run mypy .` / `uv run ruff check .` / `uv run pytest`.
- [ ] `wc -l TASK_*_ROLE.md TASKMASTER_*_ROLE.md` — line counts unchanged (≤ 40 each). Generalisation should not regress N15's compression.
- [ ] Manual quality-equivalence dry run (deferred from N15): drive a throwaway task through `/taskmaster` → `/task-implement` → `/task-review` using the generalised roles. Confirm output structure matches N15's pre-generalisation output on the same input.
- [ ] N15 status flipped from `fix-needed` to `fixed` after this lands and the re-review confirms the three blockers are addressed.
