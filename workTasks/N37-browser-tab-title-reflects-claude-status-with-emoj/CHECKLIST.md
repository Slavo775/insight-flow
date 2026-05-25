# N37 — Browser tab title reflects Claude status with emoji — Checklist

## Done criteria

- [ ] `updatePageTitle(state)` function added to `getScript()` in `dashboard.ts`
- [ ] `active` → title prefix `⚡`
- [ ] `idle` → title prefix `💤`
- [ ] `permission-needed` → title prefix `🚨`
- [ ] `null` / unknown state → plain `Taskflow Dashboard` (no prefix)
- [ ] `updatePageTitle(null)` called on init to reset any stale state
- [ ] `updatePageTitle(newStatus)` called from event handler alongside `updateActivityStatus`

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` exits 0

## Verification

- [ ] `pnpm play` → tab title is "Taskflow Dashboard" on load
- [ ] `insight-flow log-event start` → tab title becomes "⚡ Taskflow Dashboard"
- [ ] `insight-flow log-event done` → tab title becomes "💤 Taskflow Dashboard"
- [ ] Simulate `approval-required` → tab title becomes "🚨 Taskflow Dashboard"
- [ ] Page reload → title resets to plain "Taskflow Dashboard"
