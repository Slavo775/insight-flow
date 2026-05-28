# N69 — stateful status transitions: only agent-active leaves idle/done; any event leaves awaiting-permission — Checklist

## Done criteria

- [ ] `nextStatus(from, event)` exported from `packages/taskflow/src/server/event-stream.ts` and used by `EventStore.insert`
- [ ] **The only path from `idle` or `done` to `active` is an `agent-active` event** — verified by unit tests covering every other event type (SessionStart, PreToolUse, PostToolUse, tool-approved, tool-requested, generic Notification, session-start, etc.) leaving `from` unchanged when `from ∈ {idle, done}`
- [ ] `awaiting-permission` flips to `active` on the first non-terminal event after the prompt
- [ ] Terminal mappings unchanged: `Stop` / `SubagentStop` / `agent-idle` / `session-end` → `done`; `Notification`(permission) / `approval-required` → `awaiting-permission`; `Notification`(idle wording) → `idle`
- [ ] Master-forwarder path in `server/index.ts` uses the same transition logic (no divergence)
- [ ] Cold-start `EventStore` fold (replay over a buffer) lands on the correct status

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes (typecheck)
- [ ] `pnpm --dir packages/taskflow test` passes including new event-stream cases
- [ ] No regressions in `/log/events`, `/log/status`, or master overview status pill

## Verification

- [ ] Unit tests cover the 10 cases listed in Implementation plan step 6
- [ ] Manual smoke: after `Stop` → `done`, running `/clear` (SessionStart) keeps pill at `done`
- [ ] Manual smoke: submitting a prompt (UserPromptSubmit → agent-active) flips pill from `done` to `active`
- [ ] Manual smoke: permission prompt → `awaiting-permission`; approving → next hook event flips back to `active`
- [ ] `curl http://localhost:6006/log/status` reflects the same status as the dashboard pill at each step
