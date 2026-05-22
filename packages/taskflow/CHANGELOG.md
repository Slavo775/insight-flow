# Changelog

All notable changes to `insight-flow` are documented here.

## [Unreleased] — N15 + N16 + supporting

### Breaking changes

- **N16** — `taskflow.prompt.json` schema slimmed: `gitTool` and `prStrategy` fields removed. They no longer gate prompt-build's substitution (the agent stack is now technology-agnostic — see below). Consumers can either delete those keys or let `prompt-build` ignore them silently. This is the only schema breakage in the strip-and-extend pass.

### Features

- **N15** — `insight-flow show --id Nxx [--summary] [--spec]` for lean task lookups; `next --with-spec` / `next-review --with-spec` / `next-fix --with-spec` inline TASK.md + CHECKLIST.md content in the JSON response (saves agents two Read calls per task pick).
- **N15** — `REVIEW.md` is scaffolded by `review-start` from `packages/taskflow/templates/task/REVIEW.md.tpl`. Round-N reviews append `## Round N` blocks (h3 subsections mirror the template) instead of overwriting.
- **N15** — `insight-flow stats --tokens` reports `tokensUsed` trends per task type/priority (min/median/p90/max/last-5-avg/all-time-avg). Lets the next round of optimisation be defended from data, not estimates.
- **N16** — `insight-flow init --examples` writes commented `agents.extend.<agent>: []` stubs into `taskflow.config.json` so users have a starting template for wiring up their stack's commands. Default `init` writes no stubs.

### Improvements

- **N15** — Agent role docs compressed: shared procedural skeleton extracted into `AGENT_PROTOCOL.md`; every role file trimmed to ≤ 40 lines via `@AGENT_PROTOCOL.md` reference. Role-doc lines: ~700 → 275. Saves ~400–600 tokens per slash-command invocation.
- **N16** — Agent prompts are now **technology-agnostic**. No literal package-manager, language-toolchain, or git-host commands appear in any canonical role file. Project-specific commands (typecheck / lint / test / PR-create / etc.) belong in `taskflow.config.json.agents.extend.<agent>` arrays — the mechanism shipped in N12 is now the canonical extension point.
- **N16** — `GITHUB_PR_API.md` renamed to `PR_API.md`. Body is host-agnostic; an Examples appendix carries GitHub REST, GitLab REST, and no-CLI fallback snippets, each explicitly marked illustrative.
- **N16** — `PR_API.md` examples use `gh auth token` instead of `cat ~/.github-token` to keep the token out of the process table. Suggests `curl --netrc-file` for token-on-disk cases.

### Tests

- **N15** — `packages/taskflow/test/scaffold-and-bundle.test.mjs` covers `create` template scaffold, `review-start` first/Round-N scaffold, `next --with-spec`, `show --summary --spec`, `stats --tokens`.
- **N16** — `packages/taskflow/test/no-technology-tight.test.mjs` greps every canonical prompt file for forbidden literal-technology patterns and fails if any appear outside `<!-- example: ... -->` blocks. Total suite: **15+ tests pass** (init 7 + migrate-reviews 2 + scaffold-and-bundle 5 + no-technology-tight 1).

### Docs

- **N16** — `CLAUDE.md` "Extending agents with project-specific commands" section with worked examples (TS+pnpm+GitHub, Python+uv+GitLab, Go+GitHub) shown as user-supplied content, not shipped defaults.
- **N16** — `README.md` Configuration section gains a pointer to `agents.extend` + `init --examples`.

## [0.4.0] — 2026-05-21

### Breaking changes

- None.

### Features

- **N07** — Zod schema validation on all taskflow storage read/write paths. Invalid task data now throws `TaskflowValidationError` instead of silently corrupting the tracker.
- **N08** — Role definition files (`TASK_*_ROLE.md`) are now bundled inside the package and scaffolded to `.claude/roles/` by `insight-flow init`. No manual copying required.
- **N12** — `agents.extend` in `taskflow.config.json`: inject project-specific rules into built-in agent role files. Re-running `init` replaces (never duplicates) the `## Project Extensions` section.
- **N12** — `agents.custom` in `taskflow.config.json`: register new Claude Code skills from config. Generates `.claude/commands/<name>.md` with `@AGENT_ENFORCEMENT.md` reference and adds rows to CLAUDE.md's skills table.
- **N12** — JSON schema for `taskflow.config.json` shipped at `schema/taskflow.config.schema.json` with `additionalProperties: false` and enum validation on built-in agent names.

### Improvements

- **N05** — Role files migrated out of `scripts/` into the `insight-flow` binary. `scripts/task-tracker.mjs` deleted; the CLI is the single entry point.
- **N06** — `packages/taskflow` is now the single source of truth for all CLI logic. Duplicate code removed from the project root.
- **N09** — Vite UI build standardised; output consistently lands in `dist/ui/`.
- **N10** — Binary path resolution is now project-root relative. `insight-flow` commands work correctly when invoked from any subdirectory of the project.
- **N11** — Agent roles now enforce CLI-only mutations. `gh` and `git` permissions wired into `AGENT_ENFORCEMENT.md` so agents can perform git operations without manual permission prompts.

---

## [0.3.1] and earlier

See git history.
