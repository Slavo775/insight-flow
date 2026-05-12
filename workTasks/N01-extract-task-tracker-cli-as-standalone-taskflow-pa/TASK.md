# N01 — Extract task-tracker CLI as standalone taskflow package

**Type:** feat
**Priority:** high
**Created:** 2026-05-12

## Problem
- The task lifecycle system (CLI, agent roles, JSON schema, dashboard) is tightly coupled to the insight-flow repo. It has standalone value as a reusable framework — "Storybook for tasking" — but cannot be adopted by other projects without copy-pasting.
- Goal: extract the core into a portable npm package (`taskflow`) so any Claude Code user can `npx taskflow init` and get structured, auditable, visualizable AI task execution.

## Goal
1. Standalone npm package with `taskflow` CLI binary.
2. `taskflow init` scaffolds `workTasks/`, config, and agent role files into any project.
3. All existing `task-tracker.mjs` commands work via `taskflow <command>`.
4. Project-agnostic config (`taskflow.config.json`) replaces hardcoded paths.
5. JSON Schema files formalize the task/shard/master data model.

## Scope
### In scope
- Extract `scripts/task-tracker.mjs` logic into `packages/taskflow/` (monorepo structure).
- Add `bin` entry so it's callable as `taskflow` or `npx taskflow`.
- `taskflow.config.json` support: custom `workDir`, shard size, project name.
- `taskflow init` command: creates workTasks dir, master.json, config file, copies agent role `.md` templates.
- JSON Schema files for task, shard, master (derived from `src/lib/task-types.ts`).
- Template the agent role `.md` files so project name/paths are parameterizable.
- Keep backward compat: `node scripts/task-tracker.mjs` still works in insight-flow (thin wrapper that delegates to the package).

### Out of scope
- Dashboard extraction (separate task — N02+).
- Publishing to npm (just make it publishable; actual publish is a follow-up).
- CI/CD integration, webhooks, plugin system.
- Jira/Linear/GitHub Issues sync.

## Implementation plan
1. **Monorepo structure** — Add `packages/taskflow/` with `package.json` (bin: `taskflow`), `tsconfig.json`. Keep insight-flow app at root.
2. **Move core logic** — Extract storage layer, command handlers, and state machine from `task-tracker.mjs` into `packages/taskflow/src/` as proper modules:
   - `src/storage.ts` — shard read/write, master management
   - `src/commands/` — one file per command group (create, status, review, incident, etc.)
   - `src/state-machine.ts` — status transitions and validation
   - `src/config.ts` — resolve `taskflow.config.json` from project root
   - `src/cli.ts` — CLI entry point (arg parsing, command dispatch)
3. **Config resolution** — `taskflow.config.json` schema: `{ workDir, shardSize, projectName, roles }`. Falls back to sensible defaults (`workTasks/`, 10, repo name).
4. **`taskflow init` command** — Interactive scaffolding:
   - Creates `workTasks/` + `master.json`
   - Writes `taskflow.config.json`
   - Copies role `.md` templates to `.claude/roles/` (or configurable path)
   - Optionally registers Claude Code skills in `.claude/settings.json`
5. **JSON Schema** — Create `packages/taskflow/schema/task.schema.json`, `shard.schema.json`, `master.schema.json` from existing TypeScript types.
6. **Role templates** — Convert existing `TASKMASTER_ROLE.md`, `TASK_IMPLEMENTER_ROLE.md`, etc. into Handlebars-style templates with `{{projectName}}`, `{{workDir}}`, `{{scriptCmd}}` placeholders.
7. **Backward-compat wrapper** — Replace `scripts/task-tracker.mjs` with a thin shim that imports from `packages/taskflow` and runs the CLI.
8. **Build & test** — Use `tsup` or `unbuild` for the package build. Add basic tests for config resolution, init scaffolding, and core commands.

## Verification
- `cd /tmp/test-project && npx taskflow init` creates expected structure.
- `taskflow create --title "Test" --type feat --priority low` creates a task.
- `taskflow current` / `taskflow list` / `taskflow stats` work.
- Existing `node scripts/task-tracker.mjs` commands still work in insight-flow.
- `taskflow.config.json` overrides are respected.
- JSON schema validates existing N00 task data.

## Notes
- This is the foundational task — dashboard extraction, npm publish, plugin system are follow-ups.
- The dashboard (insight-flow app) already reads the same JSON format, so once the schema is formalized, the dashboard becomes a natural companion package.
- Related: The role `.md` files are the "addon" equivalent — each role is a specialized agent behavior that plugs into the lifecycle.
- Consider naming: `taskflow`, `@taskflow/cli`, `ai-taskflow`, `claude-taskflow` — check npm availability before publish.
