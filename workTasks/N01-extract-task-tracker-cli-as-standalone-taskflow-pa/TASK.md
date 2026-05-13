# N01 — Extract task-tracker CLI as standalone taskflow package

**Type:** feat
**Priority:** high
**Created:** 2026-05-12
**Modified:** 2026-05-13

## Problem
- The task lifecycle system (CLI, agent roles, JSON schema, dashboard) is tightly coupled to the insight-flow repo. It has standalone value as a reusable framework — "Storybook for tasking" — but cannot be adopted by other projects without copy-pasting.
- Goal: extract the core into a portable npm package (`taskflow`) so any Claude Code user can `npx taskflow init` and get structured, auditable, visualizable AI task execution.

## Goal
1. Standalone npm package with `taskflow` CLI binary.
2. `taskflow init` scaffolds `workTasks/`, config, and agent role files into any project.
3. All existing `task-tracker.mjs` commands work via `taskflow <command>`.
4. Project-agnostic config (`taskflow.config.json`) replaces hardcoded paths.
5. JSON Schema files formalize the task/shard/master data model.
6. `taskflow` (or `taskflow ui`) launches a built-in dev server + dashboard — like `storybook dev` but for tasks.
7. Published to npm so `npx taskflow init` works globally.
8. CI/CD integration, webhook support, and plugin system for custom lifecycle hooks.
9. External tracker sync (Jira, Linear, GitHub Issues) via importers/exporters.

## Scope
### In scope
- Extract `scripts/task-tracker.mjs` logic into `packages/taskflow/` (monorepo structure).
- Add `bin` entry so it's callable as `taskflow` or `npx taskflow`.
- `taskflow.config.json` support: custom `workDir`, shard size, project name.
- `taskflow init` command: creates workTasks dir, master.json, config file, copies agent role `.md` templates.
- JSON Schema files for task, shard, master (derived from `src/lib/task-types.ts`).
- Template the agent role `.md` files so project name/paths are parameterizable.
- Keep backward compat: `node scripts/task-tracker.mjs` still works in insight-flow (thin wrapper that delegates to the package).
- Built-in dev server: `taskflow` (or `taskflow ui`) serves `workTasks/` JSON as API + bundled dashboard SPA. File watcher pushes live updates via WebSocket/SSE. Like running `storybook dev` — one command, browser opens, done.
- Extract dashboard as `@taskflow/dashboard` package (pre-built SPA served by dev server + embeddable React component).
- Publish to npm with proper package naming, README, and `npx taskflow` support.
- CI/CD integration: GitHub Actions workflow templates, webhook triggers on status transitions, plugin system for custom lifecycle hooks.
- External tracker sync: importers/exporters for Jira, Linear, and GitHub Issues (bidirectional where feasible).

### Out of scope
- None — this task covers the full framework extraction.

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
9. **Built-in dev server** — Like Storybook's `storybook dev`, `taskflow` (or `taskflow ui`) spins up a lightweight HTTP server:
   - Serves `workTasks/*.json` files as a REST API (`/api/work-tasks`, `/api/work-tasks/:file`).
   - Serves the bundled dashboard SPA on the root route.
   - Auto-opens the browser. Default port `6006` (configurable via `--port`).
   - File watcher: watches `workTasks/` for changes and pushes updates via WebSocket/SSE so the dashboard live-reloads when tasks change (e.g., after running `taskflow create`).
   - Zero config: reads `taskflow.config.json` for `workDir`, otherwise defaults to `workTasks/`.
   - Implementation: lightweight Node server (e.g., `node:http` or `hono`) bundled into the CLI — no separate install needed.
10. **Dashboard package** — Extract insight-flow viz components into `packages/dashboard/`:
   - Pre-built SPA bundle shipped with the CLI (served by the dev server).
   - Static report generation mode for CI (`taskflow report` → HTML output).
   - Embeddable React component export for integration into existing admin panels.
10. **npm publish** — Set up package naming (`taskflow` or scoped `@taskflow/cli` + `@taskflow/dashboard`), write README, configure `prepublishOnly` build script, publish to npm.
11. **CI/CD & webhooks** — GitHub Actions workflow templates (`.github/workflows/taskflow.yml`) for task status checks. Webhook system: configurable HTTP callbacks on status transitions (e.g., notify Slack on `approved`). Plugin interface: `taskflow.config.json` `plugins` array for custom lifecycle hooks.
12. **External sync** — Importer/exporter modules in `packages/taskflow/src/sync/`:
    - `jira.ts` — map Jira issues to/from taskflow JSON format.
    - `linear.ts` — Linear API integration for bidirectional sync.
    - `github-issues.ts` — sync with GitHub Issues (labels map to task types/statuses).

## Verification
- `cd /tmp/test-project && npx taskflow init` creates expected structure.
- `taskflow create --title "Test" --type feat --priority low` creates a task.
- `taskflow current` / `taskflow list` / `taskflow stats` work.
- Existing `node scripts/task-tracker.mjs` commands still work in insight-flow.
- `taskflow.config.json` overrides are respected.
- JSON schema validates existing N00 task data.

## Notes
- The dashboard already reads the same JSON format, so extraction is mostly packaging work.
- The role `.md` files are the "addon" equivalent — each role is a specialized agent behavior that plugs into the lifecycle.
- Consider naming: `taskflow`, `@taskflow/cli`, `ai-taskflow`, `claude-taskflow` — check npm availability before publish.
- Phased delivery recommended: CLI core first (steps 1-8), then dashboard (9-10), then integrations (11-12).
