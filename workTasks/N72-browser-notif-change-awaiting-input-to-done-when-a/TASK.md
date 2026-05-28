# N72 — browser notif: change 'Awaiting input' to 'Done' when agent finishes

**Type:** fix
**Priority:** medium
**Created:** 2026-05-28

## Problem

When the agent finishes a turn, the dashboard browser push notification title reads `Awaiting input` (e.g. `<project>: Awaiting input`). The user reports this wording is unclear — it sounds like a permission prompt or idle prod, not "the agent stopped talking and the ball is in your court." Wording should plainly say the agent is done.

## Goal

1. Browser notification on agent turn-end shows "Done" (not "Awaiting input").
2. Keep distinction with permission-required notification, which remains "Permission required".
3. Project-name prefix and silent/sound behavior remain unchanged.
4. Both notification code paths (`fireDesktopNotif` legacy `agent-done` socket event, and `fireStatusDesktopNotif` derived-status `status` socket event) are updated consistently.

## Scope

### In scope

- `packages/taskflow/src/server/dashboard.ts` — the two `title` lines that build `Awaiting input`:
  - `fireDesktopNotif()` around line 906.
  - `fireStatusDesktopNotif(toStatus)` around line 922 (the `toStatus === 'done'` branch only).
- The inline `// N68 round-3 fix` and `// Wording mirrors fireDesktopNotif` comments — update them so they reflect the new "Done" wording and the rationale (user feedback that "Awaiting input" was misleading).

### Out of scope

- The `awaiting-permission` branch (label stays `Permission required`).
- CLI desktop notifications (the `notif.cli` path).
- Sound logic (`playStatusSound`, `CONFIG_SOUNDS_ENABLED`, `notifSettings.sound`).
- Page-title glyph mapping in `updatePageTitle`.
- Notification permission flow / settings UI.
- Server-side hook event pipeline.

## Implementation plan

1. **Update `fireDesktopNotif` title** — `packages/taskflow/src/server/dashboard.ts:906`. Change `var title = (PROJECT_NAME ? PROJECT_NAME + ': ' : '') + 'Awaiting input';` to use `'Done'`. Replace the N68 round-3 comment block (lines 902–905) with a one-liner noting the wording is "Done" per user feedback that "Awaiting input" was unclear.
2. **Update `fireStatusDesktopNotif` label** — `packages/taskflow/src/server/dashboard.ts:922`. Change `var label = toStatus === 'done' ? 'Awaiting input' : 'Permission required';` so the `'done'` branch yields `'Done'`. Leave the `'awaiting-permission'` branch unchanged.
3. **Sync the comment** — line 920–921's `// Wording mirrors fireDesktopNotif` comment is still accurate after step 2; update it only if the new wording rationale needs a one-line note.
4. **Rebuild & smoke-test** — `pnpm --dir packages/taskflow run build`, restart `pnpm play`, trigger a Stop hook (finish a Claude turn in the playground), confirm the browser notification title is `<project>: Done`. Trigger a permission-required event and confirm it still reads `Permission required`.
5. **No schema / no storage changes** — this is a string-literal change inside the dashboard HTML script.

## Verification

- Manual: run `pnpm play`, open dashboard at `http://localhost:6006` in a browser with notification permission granted, run a Claude turn through completion in the playground sandbox, observe the browser notification — title MUST be `<project>: Done`.
- Manual: trigger a permission-required state and confirm the notification still says `<project>: Permission required` (no regression).
- Quality gates: `pnpm --dir packages/taskflow run build` succeeds; `pnpm --dir packages/taskflow test` passes.
- Grep check: `grep -n "Awaiting input" packages/taskflow/src/server/dashboard.ts` should return zero matches after the change.

## Notes

- Related: N68 introduced the "Awaiting input" wording in round-3 fix on the grounds that Stop hook = turn-end, not task-done. User feedback now: "Done" is clearer and not misleading in practice — most users read the notification as "the agent stopped, look at the screen", which "Done" conveys directly.
- Related: N62 (sound notification work) — touched the same notification subsystem.
- Two code paths must stay in sync because they fire from different socket events (legacy `agent-done` vs N68 derived `status`); a future task could collapse them, but that's out of scope here.
