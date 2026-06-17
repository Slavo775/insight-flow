# N138 — Agent-installable command or skill on flow install — Checklist

## Done criteria

- [ ] Composed-agent schema supports opt-in command install with `as: "command" | "skill"`.
- [ ] Installed name is forced to `task-<slug>`; no double-prefix; reserved built-in names rejected on save with a clear error.
- [ ] `AgentArtifacts` carries `commands`; `collectArtifacts` builds the body from the composed prompt.
- [ ] `flowInstallPlan` adds a `command` step for each flagged agent in the flow, with the correct target path.
- [ ] Apply writes `.claude/commands/task-<name>.md` (or `.claude/skills/task-<name>/SKILL.md`) and records it in `.claude/taskflow-managed.json`.
- [ ] Re-apply is idempotent; clearing the flag (or removing the agent) removes the artifact.
- [ ] Cursor projects emit the skill target (no `.claude/commands` for Cursor).
- [ ] `AgentForm` exposes the checkbox, command/skill toggle, and name preview.
- [ ] `docs/architecture-diagrams.md` Diagram 1 updated for the new slash-command list.

## Quality gates

- [ ] `pnpm typecheck` (server + client) passes
- [ ] `pnpm --dir packages/taskflow lint` passes
- [ ] `pnpm --dir packages/taskflow format:check` passes
- [ ] `pnpm --dir packages/taskflow test` passes (new tests for name guard, artifact, install step, managed re-apply/removal)

## Verification

- [ ] End-to-end: flag agent → include in flow → install → `/task-<name>` runs after restart (command target); skill target writes `SKILL.md`; reserved-name rejected; flag-clear removes the artifact.
