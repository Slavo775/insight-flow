# N216 — Unified notifications + sounds via a service worker on the master origin — Checklist

## Done criteria

- [ ] Service worker registered on the master origin, shows notifications via `registration.showNotification`
- [ ] One permission prompt on the master origin, reused for all projects
- [ ] Shell subscribes to master `/events` and maps per-project transitions (`done` / `awaiting-permission` / status) → notifications with the project label
- [ ] Sounds play from the master origin and persist across project switches
- [ ] Per-project mute/sound settings respected, stored under the master origin
- [ ] No Web Push / external service used (SW + Notifications API only)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] typecheck passes

## Verification

- [ ] Grant permission once → notifications fire for any project's `done`/`awaiting-permission` while hub open or backgrounded
- [ ] Switch project → a sound from project A still plays; no second permission prompt
