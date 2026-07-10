# N208 — Composer-first init — install composer flow on init, install-flow command, default flow opt-in — Checklist

## Done criteria — implementer subtasks (scope: the install-flow command)

- [x] New `insight-flow install-flow <id>` command (`cli/commands/install-flow.ts` + wired in `cli.ts` + help): validates the id against the merged flow registry (errors with known ids), calls `executeInstall(kind=flow)`, reports emitted artifacts, idempotent.
- [~] **Deferred:** `init` installs `composer-authoring` by default / stops scaffolding default `task-*` — needs a per-provider skills refactor (Cursor regression + byte-identical baseline). Follow-up task.
- [~] **Deferred:** `create.ts` install-flow hint — tied to composer-first init. Follow-up task.
- [~] **Deferred:** getting-started / README composer-first docs. Follow-up task.

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes (0 errors)
- [x] `pnpm --dir packages/taskflow test` passes (325/325)

## Verification

- [x] `insight-flow install-flow composer-authoring` / `install-flow default` in a throwaway project emit the expected `.claude/commands/*`, `.claude/agents/*`, `.mcp.json`; re-run idempotent; unknown id errors with the known list.
- [x] init / create are **untouched vs baseline** (composer-first fully reverted; no regression).
