# N27 — command hooks and auto lifecycle events — Checklist

## Done criteria

- [ ] `ClaudeHookEventType` (20 values) and `ClaudeHookEvent` interface added to `types.ts`; `source: "agent" | "hook"` added to `TaskEvent`
- [ ] `ClaudeHookEventSchema` + `SessionEventsFileSchema` added to `schema/index.ts`
- [ ] `log-event` accepts `--source hook`, `--hook-name <name>`, `--session-id <id>`, `--if-active`; hook events write to `~/.insight-flow/events-<sessionId>.jsonl` in addition to task `events.json`
- [ ] `log-event --if-active` exits 0 silently when no `~/.insight-flow/session-<id>.active` file exists (plain prompt guard)
- [ ] `insight-flow` activation flag written to `~/.insight-flow/session-<id>.active`; cleared on `agent-idle` or session end
- [ ] `/api/session-events` endpoint returns most-recent session events file
- [ ] Activity feed renders all hook event types with correct icon/badge (amber for `approval-required`, red for denied/blocked, green for approved, etc.)
- [ ] "Recent Events" panel added to overview page, auto-refreshes
- [ ] `pnpm build` passes (TypeScript strict)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `pnpm --dir packages/taskflow test` passes (no regressions)
- [ ] No regressions: N26 agent event types (`start`, `done`, `edit-start`, etc.) still render correctly
- [ ] No regressions: dashboard loads at `http://localhost:6006`

## Verification

- [ ] `insight-flow log-event approval-required --source hook --hook-name PermissionRequest --task N27 --data '{"tool_name":"Bash"}'` → amber badge in activity feed
- [ ] `insight-flow log-event session-start --source hook --hook-name SessionStart` → appears in `/api/session-events`
- [ ] Invalid hook type exits 1 with type list
- [ ] `/api/session-events` returns `{ events: [], sessionId: "..." }` even when no session log exists
