# N72 — browser notif: change 'Awaiting input' to 'Done' when agent finishes — Checklist

## Done criteria

- [ ] `fireDesktopNotif()` in `packages/taskflow/src/server/dashboard.ts` uses `'Done'` (not `'Awaiting input'`) for the notification title.
- [ ] `fireStatusDesktopNotif(toStatus)` `'done'` branch uses `'Done'` (not `'Awaiting input'`); `'awaiting-permission'` branch unchanged.
- [ ] Inline N68 round-3 comment block updated to reflect the new wording and rationale.
- [ ] `grep "Awaiting input" packages/taskflow/src/server/dashboard.ts` returns zero matches.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes.
- [ ] `pnpm --dir packages/taskflow test` passes.
- [ ] No unrelated diffs in `packages/taskflow/src/server/dashboard.ts`.

## Verification

- [ ] Manual: finish a Claude turn in the playground → browser notification title reads `<project>: Done`.
- [ ] Manual: trigger a permission-required state → notification title still reads `<project>: Permission required`.
- [ ] Project-name prefix and silent/sound behavior unchanged.
