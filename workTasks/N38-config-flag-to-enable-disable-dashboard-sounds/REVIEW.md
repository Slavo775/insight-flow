# N38 — Config flag to enable/disable dashboard sounds — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-25
**PR:** https://github.com/Slavo775/insight-flow/pull/24
**Verdict:** approved

## Summary

Low-risk, minimal diff. Adds `notifications.sounds.enabled` to `NotificationsConfig`, threads a `soundsEnabled` boolean through `getDashboardHtml` → `getScript`, injects it as `CONFIG_SOUNDS_ENABLED` in the dashboard JS, and gates both `playStatusSound()` and the `fireDesktopNotif` sound argument behind it. The default (`!== false`) correctly treats absent/undefined as enabled. No regressions to the per-browser checkbox path.

## Checklist verification

- [x] `NotificationsConfig` in `types.ts` has `sounds?: { enabled?: boolean }` — **pass** (`types.ts:260`)
- [ ] Zod schema in `schema/index.ts` validates `notifications.sounds.enabled` — **skipped** (pre-existing gap: `schema/index.ts` has no `TaskflowConfigSchema`; config is not Zod-validated at all. Item was a spec inaccuracy. Acceptable skip.)
- [x] Server injects `CONFIG_SOUNDS_ENABLED` JS variable into dashboard HTML — **pass** (`dashboard.ts:254`)
- [x] `playStatusSound()` returns early when `CONFIG_SOUNDS_ENABLED === false` — **pass** (`dashboard.ts:337`, `if (!CONFIG_SOUNDS_ENABLED) return;`)
- [x] `fireDesktopNotif` sound path skips when `CONFIG_SOUNDS_ENABLED === false` — **pass** (`dashboard.ts:705`, `CONFIG_SOUNDS_ENABLED && notifSettings.sound !== false`)
- [x] `pnpm --dir packages/taskflow run build` compiles without TypeScript errors — **pass** (build output confirmed)

## Non-blocking

- The injected JS uses ternary string interpolation (`${soundsEnabled ? "true" : "false"}`). Using `JSON.stringify(soundsEnabled)` would be marginally cleaner and consistent with how `PROJECT_NAME` is serialised nearby, but no functional difference for a boolean.

## Security & edge cases

None. The flag is read server-side from a trusted local config file and serialised as a literal `true`/`false` — no injection surface.

## Notes

- `server/index.ts` was listed in scope but correctly required no changes — `getDashboardHtml(config)` already receives the full config, so all logic stays in `dashboard.ts`.
- The Zod schema gap (checklist item 2) predates this task and is tracked as a known limitation. If config validation is ever added, `notifications.sounds.enabled` will be covered by the new type definition.
