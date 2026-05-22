# N15 — Compress agent role docs + bundle CLI reads + template REVIEW.md — Review

**PR:** https://github.com/Slavo775/insight-flow/pull/9

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-22
**Verdict:** FIX NEEDED

The human's feedback verbatim:

> I see there a couple things the specs says use npm … but if project do not use npm but yarn or pnpm? We should have in config or init what package manager will be use also use gh but if user do not have gh? Or use gitlab? This things we need to check in every file and change it on generic also this is tight on typescript if I install it into python code? Java code? Or some other code?

The compression pass was scoped to "tighten what's already here" but didn't address that the *existing* stack assumes a single environment (TypeScript + pnpm + GitHub). When `insight-flow` is installed into a project that uses a different package manager, a different git host, or a different language, the agent prompts will issue commands that don't apply. Three discrete blockers below.

### Blockers

- **Hardcoded package manager (`npm` / `npx`)** — many roles and the protocol still emit `npx tsc --noEmit`, `npm run lint`, `npm run test`. Affects: `AGENT_PROTOCOL.md` (workflow step 6 + quality bar), `TASK_IMPLEMENTER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`, `TASK_INCIDENT_ROLE.md`, plus every existing TASK.md "Verification" section. **Fix:** add a `packageManager: npm | pnpm | yarn | bun | none` field to `taskflow.config.json` (set by `insight-flow init` after detecting `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` / `bun.lockb` / none), then use it in `prompt-build` to substitute the command prefix in role docs and `AGENT_PROTOCOL.md`. Roles should reference `{{PM}} run typecheck` / `{{PM}} run lint` / `{{PM}} test` rather than literal `npx` / `npm`.

- **Hardcoded git host (`gh pr create`)** — `AGENT_PROTOCOL.md`, `TASK_REVIEWER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`, `.claude/commands/task-git.md`, and `taskflow.prompt.json` (`gitTool: gh`) all assume GitHub + the `gh` CLI is installed. **Fix:** extend `taskflow.prompt.json` schema to support `gitHost: github | gitlab | bitbucket | none` and `gitTool: gh | glab | git`. When `glab` is selected, generate `glab mr create` instead. When `gitTool: git`, generate a compare URL (the path we removed in N14 needs to come back as the explicit "no CLI" branch, not as a fallback). `@GITHUB_PR_API.md` is also misnamed — should be the host-specific snippet selected at init time.

- **Hardcoded language (TypeScript)** — quality gates everywhere assume `npx tsc --noEmit`. Python / Go / Java / Rust projects would never typecheck this way. Affects: `AGENT_PROTOCOL.md` step 6, every role file's quality-bar reference, every TASK.md `## Verification` section. **Fix:** add a `language: typescript | python | java | go | rust | mixed | none` field to `taskflow.config.json` (set by `insight-flow init` after detecting `tsconfig.json` / `pyproject.toml` / `pom.xml` / `go.mod` / `Cargo.toml`); store the corresponding `typecheck` / `lint` / `test` command triple in config; `prompt-build` substitutes those into role docs. Examples:
  - TS + pnpm: `pnpm typecheck`, `pnpm lint`, `pnpm test`
  - Python + uv: `uv run mypy .`, `uv run ruff check`, `uv run pytest`
  - Go: `go vet ./...`, `golangci-lint run`, `go test ./...`
  - Java + Maven: `mvn compile`, `mvn checkstyle:check`, `mvn test`

### Suggestions (non-blocking)

- Implementer's note in N15's report mentioned "manual quality-equivalence dry run deferred to review time" — that dry run is unchanged by these blockers, but it should happen on the generalised roles, not the current TS-pnpm-GitHub-tight ones, otherwise we'd just re-do it.
- Consider whether `AGENT_PROTOCOL.md` should also become a template (with `{{PM}}` / `{{GIT_TOOL}}` / `{{LANG}}` placeholders) shipped by `insight-flow init` rather than a hand-edited file at repo root. That way every consumer project ends up with a protocol tuned to their stack, not the insight-flow repo's.

### Notes

- These gaps existed before N15 too (N14 also assumed npm/gh/TypeScript). N15 made them more visible by consolidating procedural text — that's the value of the compression, even if the underlying generalisation work is now more urgent.
- All three blockers share the same shape: detect the project environment at `insight-flow init`, store it in `taskflow.config.json`, and substitute it through `prompt-build`. A single PR could address all three.
- Suggested follow-up task title: **N16 — Generalise agent stack across package managers, git hosts, and languages**.

---

(The AI review of N15 hasn't happened yet — when one is added later, append below this section as `## Round 2` per the new template flow.)
