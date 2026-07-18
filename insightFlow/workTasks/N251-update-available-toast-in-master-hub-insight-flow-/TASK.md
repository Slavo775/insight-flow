# N251 — Update-available toast in master hub + insight-flow update CLI

**Type:** feat
**Priority:** medium
**Created:** 2026-07-17

## Problem

The dashboard never tells the user a newer `insight-flow` has been published. The master server does not expose its own version and nothing checks npm for `latest`, so users stay on old versions unaware. We want a non-nagging "update available" toast in the master hub plus a simple CLI backbone to act on it — **security first**: the toast must never let a web page execute anything on the host.

## Goal

1. Master server exposes `GET /api/version` → `{ current, latest, updateAvailable }`, with the npm `latest` lookup cached ~12h and failing silently.
2. Master hub shows a dismissible "update available" toast on load (reusing the existing hub toast), remembering the dismissed version so it does not nag.
3. New `insight-flow update` CLI does the global self-update and points the user at `/task-release-rollout` for per-project rollout.
4. Opt-out config `updateCheck: { enabled, intervalHours }` (default `{ true, 12 }`).
5. No new command-execution web endpoint; `latest` is treated as untrusted data.

## Scope

### In scope

- `packages/taskflow/src/master/server.ts` — add `GET /api/version` route + 12h-cached npm `latest` lookup helper (in-memory cache with timestamp; respects `updateCheck.enabled`).
- `packages/taskflow/src/master/client/` — on hub load, fetch `/api/version`; if `updateAvailable`, fire the existing toast (`notif.ts` / `hub-notify.ts`) with copy-command text; store dismissed version in `localStorage` (nag suppression).
- `packages/taskflow/src/cli/commands/update.ts` (new) + wire into `cli.ts` — `insight-flow update`: run `npm i -g insight-flow@latest`, then read `~/.insight-flow/hub.json` bulk-registered projects and print them with a "run `/task-release-rollout` to bump each" pointer. **Global-only actuation (option 1a).**
- Config: add `updateCheck` to the config type + schema (`src/core/`), default enabled, `intervalHours: 12`.

### Out of scope

- Any web endpoint that runs `npm install` / mutates projects (option B rejected — CSRF/RCE surface).
- Per-project bump loop inside the CLI (that stays in `release-project-installer` / `task-release-rollout`; do not duplicate its package-manager detection — option 1b rejected).
- Project dashboard (`:6006`) toast — master hub only for now.
- Changing the rollout agent itself.

## Implementation plan

1. **Config + schema** — add `updateCheck?: { enabled?: boolean; intervalHours?: number }` to the config type and Zod schema in `src/core/`; default `enabled: true`, `intervalHours: 12`.
2. **npm latest helper** — in master, a `getLatestVersion()` that calls the npm registry (e.g. `https://registry.npmjs.org/insight-flow/latest` or `npm view`), caches result + timestamp in module scope for `intervalHours`, and returns `null` on any network/parse error (silent).
3. **Version route** — `GET /api/version` returns `{ current, latest, updateAvailable }`. `current` from master's own `package.json`. `updateAvailable = latest != null && semverGt(latest, current)`. **Validate `latest` is real semver before use/return.** Skip lookup (return `latest: null`) when `updateCheck.enabled === false`.
4. **Hub client toast** — on load fetch `/api/version`; if `updateAvailable` and `localStorage.dismissedUpdateVersion !== latest`, fire the existing hub toast: `"insight-flow <latest> available (you have <current>) — run \`insight-flow update\`"` + copy button. Dismiss sets `dismissedUpdateVersion = latest`.
5. **`insight-flow update` CLI** — new command: exec `npm i -g insight-flow@latest`, print result, then read hub.json bulk-registered projects and print a table + pointer to `/task-release-rollout`. Never interpolate a fetched version into a shell string.
6. **Docs** — note the new command + `updateCheck` config in `packages/taskflow/README.md`.

## Verification

- `insight-flow update` runs the global install and prints the registered-projects pointer.
- With a lower `current` version, `GET /api/version` returns `updateAvailable: true`; the master hub shows the toast once, and not again after dismiss (until a newer `latest`).
- With `updateCheck.enabled: false`, the endpoint returns `latest: null` and no toast appears.
- npm unreachable → endpoint returns `latest: null`, no error surfaced, no toast.
- `pnpm --dir packages/taskflow build` + typecheck pass.

## Notes

- Security posture (why option A): the master server binds localhost, so a one-click "update" endpoint would be triggerable cross-origin by any open web page (CSRF → host-level `npm i -g`). The toast is **informational only**; `/task-release-rollout` remains the deliberate human-triggered actuator.
- Reuse, don't rebuild: `task-release-rollout` + `release-project-installer` already do global + per-project rollout; existing toast plumbing lives in `master/client/notif.ts` + `hub-notify.ts`; hub projects live in `~/.insight-flow/hub.json` (`bulkRegistered`).
- Treat npm `latest` as untrusted DATA — validate semver, never shell-interpolate.
- See `ANALYSIS.md` for the full options trail. Related: N250 (release/publish), rollout flow.
