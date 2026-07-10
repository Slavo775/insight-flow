# N208 — Composer-first init — install composer flow on init, install-flow command, default flow opt-in — Checklist

## Done criteria — implementer subtasks

- [ ] New `insight-flow install-flow <id>` command (`cli/commands/install-flow.ts` + wired in `cli.ts` + help): validates the id against the merged flow registry (errors with known ids), calls `executeInstall(kind=flow)`, reports emitted artifacts, idempotent.
- [ ] `init` installs `composer-authoring` by default (task-authoring-* commands + subagents + mcp-composer + activity) and no longer scaffolds the default flow's `task-*` commands on a fresh init; baseline assets + editor providers + N207 activity default preserved.
- [ ] Re-init is non-destructive (doesn't delete a user's existing flow commands).
- [ ] `create.ts` prints a **non-fatal** hint when a task falls back to `default` with no default-flow commands installed; fallback resolution unchanged.
- [ ] Docs (getting-started + README) describe the composer-first first-run and `install-flow default`.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes (0 errors)
- [ ] `pnpm --dir packages/taskflow test` passes

## Verification

- [ ] `insight-flow install-flow composer-authoring` / `install-flow default` in a throwaway project emit the expected `.claude/commands/*`, `.claude/agents/*`, `.mcp.json`; re-run idempotent; unknown id errors with the known list.
- [ ] Fresh `insight-flow init` → `task-authoring-*` commands + `mcp-composer` present; no default `task-*` commands.
- [ ] `insight-flow create` still succeeds (falls back to `default`) and prints the install-flow hint.
- [ ] Docs show the composer-first first-run.
