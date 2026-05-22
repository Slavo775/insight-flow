# N16 — Generalise agent stack across package managers, git hosts, and languages

**Type:** feat
**Priority:** high
**Created:** 2026-05-22

## Problem

The current agent role docs + protocol assume a single environment: **TypeScript + pnpm + GitHub + `gh` CLI**. When `insight-flow` is installed into a project using a different stack, the agent prompts issue commands the project can't execute:

- Quality gates say `npx tsc --noEmit` / `npm run lint` / `npm run test` — fails on yarn / pnpm / bun projects (wrong runner) and on Python / Go / Java / Rust projects (no `tsc`).
- PR creation says `gh pr create` — fails when the user uses GitLab (`glab`) / Bitbucket, or has no host CLI installed.
- `AGENT_PROTOCOL.md` (introduced in N15) consolidated these assumptions in one place, making the gaps visible but not fixing them.

Surfaced by human review of N15 (`workTasks/N15-*/REVIEW.md`). N15 is parked at `fix-needed` waiting on this work.

## Goal

1. Detect the project's stack at `insight-flow init` time: package manager (from lockfile), language (from manifest), git host (from `git remote`).
2. Persist detected values + their command triples in `taskflow.config.json` so agents and `prompt-build` can substitute them.
3. Replace every hardcoded `npx` / `npm` / `gh` / `tsc` reference across role docs, `AGENT_PROTOCOL.md`, templates, and `.claude/commands/task-git.md` with `{{PM}}` / `{{GIT_TOOL}}` / `{{TYPECHECK_CMD}}` / etc. placeholders that `prompt-build` substitutes.
4. Re-review N15 with the generalised stack in place.

## Scope

### In scope

- `packages/taskflow/src/types.ts`: extend `TaskflowConfig` with `stack: { packageManager, language, gitHost, gitTool, commands }`.
- `packages/taskflow/src/init/index.ts`: add `detectStack(cwd)` — returns inferred config based on filesystem markers (lockfiles, manifests, `git remote`). Wire into `initProject`.
- `packages/taskflow/src/commands/prompt-build.ts`: extend with stack substitution. Today it only handles `gitTool`; expand to substitute `{{PM}}`, `{{TYPECHECK_CMD}}`, `{{LINT_CMD}}`, `{{TEST_CMD}}`, `{{PR_CREATE_CMD}}`, `{{GIT_HOST}}` into role docs + `AGENT_PROTOCOL.md`.
- `packages/taskflow/templates/taskflow.prompt.json`: replace `gitTool: gh` with the full stack schema (defaults: auto-detect).
- Role docs at repo root (8 role files + `AGENT_PROTOCOL.md`): replace literal `npx tsc --noEmit`, `npm run lint`, `npm run test`, `gh pr create`, etc. with `{{PM}}` / command-triple placeholders. The repo's *own* role files become the "TS + pnpm + GitHub" instantiation produced by running `prompt-build --apply` against the local config; the source-of-truth template versions in `packages/taskflow/templates/roles/` carry the placeholders.
- `.claude/commands/task-git.md`: same placeholder treatment for `gh pr create`.
- `GITHUB_PR_API.md` → renamed to `PR_API.md` and templatised; init writes the host-specific variant to the project (`gh` snippet for GitHub, `glab` snippet for GitLab, `curl`-only snippet for no-CLI).
- `packages/taskflow/templates/task/TASK.md.tpl` + `CHECKLIST.md.tpl`: parameterise the Verification section so scaffolded tasks pick up the project's command triple.
- New tests in `packages/taskflow/test/`:
  - `detect-stack.test.mjs` — verifies `detectStack` returns the right triple for fixtures (pnpm-lock.yaml + tsconfig + github remote → pnpm/typescript/github; pyproject.toml + gitlab remote → python/gitlab; etc.).
  - `prompt-build-substitution.test.mjs` — verifies `prompt-build --apply` substitutes every placeholder from config.
- Re-flow on N15: after this lands, re-run sync-role-templates, re-apply prompt-build, re-review N15.

### Out of scope

- Per-language tool selection beyond a default triple per language (e.g. choosing between `mypy` vs `pyright` for Python). v1 picks a sensible default per language; advanced overrides come later.
- Bitbucket support beyond schema reservation (`gitHost: bitbucket` is accepted but no PR command template — emits a compare URL).
- Migrating existing consumer projects' configs — they re-run `insight-flow init` (or hand-edit) to opt in.
- Bringing back the React dashboard removed in N14 (irrelevant to this work).
- The "manual quality-equivalence dry run" from N15's checklist — moved into this task's verification so it's done against the *generalised* roles, not the TS-pnpm-GitHub-tight ones.

## Implementation plan

1. **Schema** (`packages/taskflow/src/types.ts` + `packages/taskflow/src/schema/index.ts`)
   - Add a `Stack` type with: `packageManager` (npm/pnpm/yarn/bun/none), `language` (typescript/python/java/go/rust/mixed/none), `gitHost` (github/gitlab/bitbucket/none), `gitTool` (gh/glab/git), `commands: { typecheck, lint, test, prCreate }` (each string | null).
   - Add Zod schemas. `stack` is optional on `TaskflowConfigSchema` so legacy configs still parse; init writes one going forward.

2. **Stack detection** (`packages/taskflow/src/init/detect-stack.ts`, new)
   - `detectStack(cwd): Stack` with helpers:
     - `detectPackageManager`: pnpm-lock.yaml → pnpm; yarn.lock → yarn; bun.lockb → bun; package-lock.json → npm; package.json without lockfile → npm; otherwise none.
     - `detectLanguage`: tsconfig.json → typescript; pyproject.toml | requirements.txt → python; pom.xml | build.gradle → java; go.mod → go; Cargo.toml → rust; multiple matches → mixed; nothing → none.
     - `detectGitHost`: parse `git config --get remote.origin.url` (gracefully fail if not a repo). Match `github.com` / `gitlab.com` / `bitbucket.org`. Default `none`.
     - `detectGitTool`: prefer `gh` if `gitHost: github` and `gh --version` succeeds; `glab` for gitlab; otherwise `git`.
     - `commandTriple(pm, lang)`: returns a sensible default triple. Examples below.
   - Triples (v1 defaults):
     - pnpm + typescript: `pnpm typecheck` / `pnpm lint` / `pnpm test`
     - npm + typescript: `npx tsc --noEmit` / `npm run lint` / `npm test`
     - uv + python: `uv run mypy .` / `uv run ruff check .` / `uv run pytest`
     - go: `go vet ./...` / `golangci-lint run` / `go test ./...`
     - java + maven: `mvn -q compile` / `mvn -q checkstyle:check` / `mvn -q test`
     - rust + cargo: `cargo check` / `cargo clippy --all-targets -- -D warnings` / `cargo test`
     - language `none` or `mixed`: each command may be `null`; role docs handle nulls gracefully.

3. **Init wiring** (`packages/taskflow/src/init/index.ts`)
   - Run `detectStack(cwd)` and merge into the written `taskflow.config.json` unless the user passes `--no-detect`. If `taskflow.config.json` already exists, only fill missing `stack.*` fields; never overwrite user-edited ones.
   - Print the detected triple in `init`'s console output (e.g. "Detected: pnpm + typescript + github · commands: pnpm typecheck / pnpm lint / pnpm test").

4. **`prompt-build` extension** (`packages/taskflow/src/commands/prompt-build.ts`)
   - Replace today's `gitTool: gh|git` logic with full stack substitution.
   - Placeholders supported in role docs + `AGENT_PROTOCOL.md`: `{{PM}}`, `{{LANG}}`, `{{GIT_HOST}}`, `{{GIT_TOOL}}`, `{{TYPECHECK_CMD}}`, `{{LINT_CMD}}`, `{{TEST_CMD}}`, `{{PR_CREATE_CMD}}`.
   - Null commands render as a `# (no <lang> typecheck — skip)` comment so the role doc still reads cleanly.
   - `--apply` writes the substituted versions into the project's role files (today the `.claude/roles/` dir or the legacy root layout depending on `rolesDir` config).

5. **Templatise canonical role docs** (templates live in `packages/taskflow/templates/roles/` going forward; root role files are derived for this repo)
   - Replace every literal `npx tsc --noEmit` / `npm run lint` / `npm run test` / `gh pr create` in `templates/roles/*.md` and `templates/agent-protocol/AGENT_PROTOCOL.md` (move it under `templates/`) with the matching `{{...}}` placeholder.
   - Update `scripts/sync-role-templates.mjs`: source-of-truth flips — templates dir is canonical, root files are the result of `prompt-build --apply` for this repo.
   - Update `.claude/commands/task-git.md` to use `{{PR_CREATE_CMD}}` instead of `gh pr create`.
   - Update `packages/taskflow/templates/task/TASK.md.tpl` + `CHECKLIST.md.tpl` Verification sections to use the command-triple placeholders.

6. **`GITHUB_PR_API.md` → `PR_API.md`**
   - Rename + restructure as three include-able snippets (`templates/api/pr-api.gh.md`, `pr-api.glab.md`, `pr-api.git.md`).
   - `insight-flow init` (or `prompt-build --apply`) writes the host-specific snippet to the project as `PR_API.md`. Roles `@PR_API.md` (not host-specific). For consumers running `gitTool: git`, the snippet documents the compare-URL fallback.

7. **Tests** (new files in `packages/taskflow/test/`)
   - `detect-stack.test.mjs`: ≥ 6 fixture directories (pnpm-ts-github, npm-ts-github, yarn-ts-github, pyproject-python-gitlab, go-mod-github, empty); assert detected stack.
   - `prompt-build-substitution.test.mjs`: feed a stub role doc with all placeholders + a stub stack; assert every placeholder substituted, null commands rendered as comments.
   - Update existing `init.test.mjs` to check the `stack` field is populated after `initProject`.

8. **Apply to this repo + re-flow N15**
   - Run `insight-flow init --force` against this repo so the new stack detection writes a config with `pnpm + typescript + github + gh`.
   - Run `insight-flow prompt-build --apply` to produce the substituted root role files.
   - Verify the substituted versions are byte-identical (modulo intentional command-triple values) to the current N15 versions for this stack — proves we didn't regress on TS+pnpm+GitHub while generalising.
   - Mark N15 ready for re-review (its blocker is now resolved).

## Verification

- `cd packages/taskflow && pnpm typecheck && pnpm build && pnpm test` — green (init + migrate-reviews + scaffold-and-bundle + new detect-stack + new prompt-build-substitution).
- `node packages/taskflow/dist/cli.js init --force` in a tmpdir with `pyproject.toml` + a GitLab remote → `taskflow.config.json` shows `stack.language: python`, `stack.gitHost: gitlab`.
- `node packages/taskflow/dist/cli.js init --force` in this repo → `stack.packageManager: pnpm`, `stack.language: typescript`, `stack.gitHost: github`, `stack.gitTool: gh`.
- After running `prompt-build --apply` on this repo: `grep "npx tsc --noEmit" TASK_*_ROLE.md AGENT_PROTOCOL.md .claude/commands/task-git.md` returns the expected pnpm-typescript triple (`pnpm typecheck`, `pnpm lint`, `pnpm test`) and zero raw `{{...}}` placeholders.
- After running `prompt-build --apply` in a fixture Python project: the same files show `uv run mypy .` / `uv run ruff check .` / `uv run pytest`.
- N15 re-review: open `workTasks/N15-*/REVIEW.md`; the three human-flagged blockers should be marked resolved with file references to this PR.

## Notes

- This is a generalisation task, not a behavior change for the insight-flow repo itself. The repo's own role docs end up substantively identical (TS+pnpm+GitHub commands) after the rewrite — the value is that other consumers' projects now produce *their own* substituted versions instead of the TS/pnpm/GitHub-tight ones.
- Source-of-truth shift: templates become canonical, root role files become generated. `sync-role-templates.mjs` flips direction. This is a meaningful workflow change for maintainers and should be called out in the CHANGELOG when 0.5.0 (or 0.6.0) cuts.
- Related: N14 (token savings round 1), N15 (compression — currently parked at `fix-needed` on this work).
- Estimated CLI surface impact: small. New `init` step (~80 LOC), new `prompt-build` substitution table (~40 LOC), new tests (~120 LOC). Most of the work is mechanical replacement across 9 role + protocol files.
