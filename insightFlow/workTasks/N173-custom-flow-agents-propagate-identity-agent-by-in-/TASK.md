# N173 — Custom-flow agents propagate identity (--agent/--by) in lifecycle commands

**Type:** fix
**Priority:** high
**Created:** 2026-06-22

## Problem

A custom flow's installed agent commands (e.g. `/taskmaster-news-react`) instruct the agent to run generic `insight-flow create` / status calls with **no `--agent` or `--by`**. So a new task binds to the **default** flow (the entry-agent never identifies itself, so `resolveFlowId`'s by-agent branch can't fire) and the status history shows role defaults (`taskmaster`, `git-agent`) instead of the flow's own agents. Found in is-test: N03 (a react-news task) bound to `default` with generic attribution.

## Goal

1. A command-installed agent's prompt carries its own id and tells it to pass `--agent <id>` on `create` (binds the task to its flow via the entry agent) and `--by <id>` on status transitions.
2. New tasks created by a custom flow's main agent bind to that flow without needing a `defaultFlow`/`byType` config.
3. Status history attributes to the flow's actual agents, not role defaults.

## Scope

### In scope

- `agents/compose.ts` — a `flowIdentityNote(agentId)` helper, appended to a command-installed agent's composed prompt in `collectArtifacts` (N138 path).
- `agents/flow-install.ts` — same note on the force-emitted command body for flow handover sources (N149).

### Out of scope

- The canonical role files / `composeAgent` output (the note is added only to the COMMAND body, so the drift guard is unaffected).
- Changing the CLI flag plumbing — `--agent` (create) and `--by` (push/status/implement/review/change/fix) are already honored.

## Implementation plan

1. **Identity note** — `flowIdentityNote(id)` returns a "## Flow identity" block instructing `--agent <id>` on create + `--by <id>` on transitions; ends with a newline for file hygiene.
2. **Inject in collectArtifacts** — append the note to the composed prompt before building the command/skill body (only for `command.install` agents).
3. **Inject in flow-install force-emit** — append to the handover-source command body.
4. **Tests** — the command body carries `--agent <id>`; N164 idempotency reframed to the real case (the SAME agent id installed by two flows → identical body → idempotent; the prior "twin with a different id" artifice no longer holds, which is correct now that the body is identity-keyed).

## Verification

- `pnpm --dir packages/taskflow test` passes (298).
- Manual in is-test: install react-news, run `/taskmaster-news-react` → the new task binds to `custom:react-news` and the history `by` shows the react-news agents.

## Notes

- Found during is-test review of `/task/N03`. The binding mechanism (`create --agent` → entry-agent → flow) already existed (N122/N123); the gap was that the installed command never told the agent to pass it. Related: N124 (composer-as-command), N167 (default-flow override is a config-level alternative).
