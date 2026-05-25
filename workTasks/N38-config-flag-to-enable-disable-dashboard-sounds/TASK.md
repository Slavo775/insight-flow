# N38 — Config flag to enable/disable dashboard sounds

**Type:** feat
**Priority:** medium
**Created:** 2026-05-25

## Problem

The dashboard already has a client-side sound toggle (stored in localStorage, see `notifSettings.sound` in `dashboard.ts:606`), but there is no project-level config flag to disable sounds entirely. Teams in quiet environments (or CI) have no way to permanently suppress sounds without each browser individually toggling the checkbox.

## Goal

1. Add `notifications.sounds.enabled` boolean to `taskflow.config.json` schema (default `true`).
2. Expose the flag to the dashboard so the browser can read it at page load.
3. Dashboard skips all `Audio` playback when the flag is `false`, regardless of the localStorage checkbox.
4. Existing per-browser checkbox continues to work when the config flag is `true`.

## Scope

### In scope

- `packages/taskflow/src/types.ts` — extend `NotificationsConfig` with `sounds?: { enabled?: boolean }`.
- `packages/taskflow/src/schema/index.ts` — add Zod shape for `notifications.sounds`.
- `packages/taskflow/src/server/index.ts` — pass `sounds.enabled` flag into the dashboard (either embed as an inline JS variable or add to the `/api/config` response).
- `packages/taskflow/src/server/dashboard.ts` — read the server-supplied flag; gate `playSound()` / `fireDesktopNotif()` sound path behind `configSoundsEnabled !== false`.

### Out of scope

- Changing the existing localStorage checkbox UI or its behaviour when `sounds.enabled` is `true`.
- CLI notification sounds (out of scope of this flag — only the browser dashboard).
- Any changes to `packages/taskflow/templates/` or scaffold files.

## Implementation plan

1. **Extend `NotificationsConfig` type** (`packages/taskflow/src/types.ts:257`)
   - Add `sounds?: { enabled?: boolean }` to the `NotificationsConfig` interface.

2. **Update Zod schema** (`packages/taskflow/src/schema/index.ts`)
   - Find the `notificationsConfigSchema` (or equivalent) and add `.sounds = z.object({ enabled: z.boolean().optional() }).optional()`.

3. **Expose flag from server** (`packages/taskflow/src/server/index.ts`)
   - When building the dashboard HTML, read `config.notifications?.sounds?.enabled ?? true` and inject it as an inline JS variable at the top of the `<script>` block: `var CONFIG_SOUNDS_ENABLED = <true|false>;`
   - Alternatively, if a `/api/config` route already exists, include the flag there and fetch it on page load — but inline injection is simpler and zero-latency.

4. **Gate sound playback in dashboard** (`packages/taskflow/src/server/dashboard.ts`)
   - Locate `playSound()` (line ~335) and the `fireDesktopNotif` sound path (line ~702).
   - At the top of `playSound`, add `if (CONFIG_SOUNDS_ENABLED === false) return;`.
   - The `notifSettings.sound` localStorage check remains unchanged for per-browser control when config allows sounds.

## Verification

- Set `notifications.sounds.enabled: false` in `playground/taskflow.config.json`, run `pnpm play`, open dashboard — no sound plays on status change.
- Remove the flag (default), toggle the browser checkbox off — still no sound.
- `pnpm --dir packages/taskflow run build` compiles without TypeScript errors.

## Notes

- Related: N36 (sounds feature), N37 (tab title/status badge). This is the config-driven opt-out counterpart to N36.
- `notifSettings.sound` (localStorage) acts as the per-browser override; `CONFIG_SOUNDS_ENABLED` (config) acts as the project-level kill-switch. Both must be `true` for a sound to play.
