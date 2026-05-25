# N38 — Config flag to enable/disable dashboard sounds — Checklist

## Done criteria

- [ ] `NotificationsConfig` in `types.ts` has `sounds?: { enabled?: boolean }`.
- [ ] Zod schema in `schema/index.ts` validates `notifications.sounds.enabled`.
- [ ] Server injects `CONFIG_SOUNDS_ENABLED` JS variable into dashboard HTML.
- [ ] `playSound()` in `dashboard.ts` returns early when `CONFIG_SOUNDS_ENABLED === false`.
- [ ] `fireDesktopNotif` sound path also skips when `CONFIG_SOUNDS_ENABLED === false`.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` compiles without TypeScript errors.
- [ ] No regressions in existing per-browser sound checkbox behaviour.

## Verification

- [ ] Set `notifications.sounds.enabled: false` in `playground/taskflow.config.json`, run `pnpm play`, trigger a status change — no sound plays.
- [ ] Remove the flag or set to `true`, trigger a status change with checkbox enabled — sound plays as before.
