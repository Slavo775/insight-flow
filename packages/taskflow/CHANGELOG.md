# Changelog

All notable changes to `insight-flow` are documented here.

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
