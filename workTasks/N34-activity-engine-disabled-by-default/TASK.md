# N34 — Activity engine disabled by default

**Type:** rework
**Priority:** medium
**Created:** 2026-05-25

## Problem

- `activityEngine.enabled` currently defaults to `true` when absent from `taskflow.config.json`. Every tool call made in a Claude Code session fires a hook that writes to the JSONL log and sends a WebSocket event to the dashboard, consuming tokens whether the user wants it or not.
- New projects should start with activity tracking off and opt in explicitly, preserving token budget by default.

## Goal

1. `activityEngine.enabled` defaults to `false` when the key is absent from config.
2. Existing projects with `"enabled": true` explicitly set are unaffected.
3. The dashboard and CLI degrade cleanly when the engine is off: no hook events, tabs hidden, no WebSocket activity feed.
4. `insight-flow init` scaffolds `taskflow.config.json` with `activityEngine.enabled: false` (commented note explaining opt-in).

## Scope

### In scope

- `packages/taskflow/src/server/dashboard.ts` — `activityEnabled` default expression: `config.activityEngine?.enabled !== false` → `config.activityEngine?.enabled === true`.
- `packages/taskflow/src/server/index.ts` — same guard if `activityEnabled` is derived there.
- `packages/taskflow/src/commands/init.ts` — scaffold `taskflow.config.json` with `"activityEngine": { "enabled": false }`.
- `packages/taskflow/templates/` — update any `taskflow.config.json.tpl` template.
- `packages/taskflow/README.md` — update default/opt-in note in the activity engine section.

### Out of scope

- Hook script behaviour when the engine is disabled — that is already gated by `activityEngine.enabled` in the hook scripts themselves.
- Changing how events are written when the engine IS enabled.

## Implementation plan

1. **Flip default in `dashboard.ts`** — line `const activityEnabled = config.activityEngine?.enabled !== false`:
   ```ts
   const activityEnabled = config.activityEngine?.enabled === true;
   ```

2. **Flip default in `server/index.ts`** — find the same `!== false` pattern and apply the same change.

3. **Update `init` command** — `packages/taskflow/src/commands/init.ts`: in the scaffolded `taskflow.config.json` output, set:
   ```json
   "activityEngine": {
     "enabled": false
   }
   ```
   Add a comment (or README note) that the user should set `enabled: true` to turn on activity tracking.

4. **Update config template** — `packages/taskflow/templates/taskflow.config.json.tpl` (or equivalent): set `enabled: false` as the scaffold default.

5. **Build and verify** — `pnpm --dir packages/taskflow run build` exits 0; run `pnpm play` with no `activityEngine` key in `taskflow.config.json` and confirm the activity tabs section is absent from the dashboard.

## Verification

- `pnpm --dir packages/taskflow run build` exits 0.
- Remove `activityEngine` key from `playground/taskflow.config.json`; `pnpm play` → dashboard shows no activity tabs section and no sidebar.
- Add `"activityEngine": { "enabled": true }` back → activity tabs reappear.
- `insight-flow init` in a fresh directory produces `taskflow.config.json` with `"enabled": false`.

## Notes

- This is a breaking change in default behaviour for projects that rely on the implicit `enabled: true` default and haven't set the key explicitly. Document in changelog.
- Playground (`playground/taskflow.config.json`) should have `"enabled": true` so local dev/testing still shows activity.
- Part of the **claude-status-module** group (N33–N37).
