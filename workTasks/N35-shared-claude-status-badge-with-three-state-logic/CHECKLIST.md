# N35 — Shared Claude status badge with three-state logic — Checklist

## Done criteria

- [ ] `.activity-status.permission-needed` CSS rule added (amber background, yellow text)
- [ ] `claudeStatusFromEvent(ev)` function defined in base script; returns `'active' | 'idle' | 'permission-needed' | null`
- [ ] `start` event → `claudeStatusFromEvent` returns `'active'`
- [ ] `agent-idle` hook event → returns `'idle'`
- [ ] `done` event → returns `'idle'`
- [ ] `approval-required` hook event → returns `'permission-needed'`
- [ ] `updateActivityStatus()` handles all three states including `permission-needed` label and class
- [ ] Event handler in dashboard calls `claudeStatusFromEvent` and feeds result to `updateActivityStatus`
- [ ] `updateActivityStatus('idle')` called on init (badge visible from load)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` exits 0

## Verification

- [ ] `pnpm play` → badge shows "idle" on load
- [ ] `insight-flow log-event start` → badge shows "active"
- [ ] Simulate `approval-required` hook event via WS → badge shows "🚨 permission" in amber
- [ ] `insight-flow log-event done` → badge returns to "idle"
