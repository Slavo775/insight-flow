# N19 — Browser and CLI notifications on task transitions

**Type:** feat
**Priority:** high
**Created:** 2026-05-23

## Problem

After N17 the dashboard's live updates are reliable, but the user has to keep a browser tab visible to know when Claude has reached a milestone (task `implemented`, review `approved`, `fix-needed`, `merged`). With multiple `insight-flow ui` instances open across projects, watching tabs defeats the purpose. We need OS-level notifications, fired from both the browser (when a tab IS open) and the CLI (for instant push regardless of tab state). All notification behaviour must be opt-out via `taskflow.config.json` so token-conscious projects can disable the CLI path.

## Goal

1. Browser tab fires desktop notification within ~1 s of any watched task-status transition.
2. New `insight-flow notify "<message>"` subcommand fires an OS-level notification independent of any browser tab.
3. CLI notifications are fire-and-forget — exit <100 ms whether the OS picks up the notification or not. Agents never inspect exit code or output.
4. Both halves are opt-out via `notifications.browser` and `notifications.cli` in `taskflow.config.json` (default `true`).
5. Agent role files include a terse "WHEN TO NOTIFY" section limited to 1–3 calls per task; section is omitted entirely when `notifications.cli` is `false`.

## Scope

### In scope

- `packages/taskflow/src/server/dashboard.ts` — client-side diff of successive snapshots, Notification API permission flow, settings popover in top-bar (per-status toggles, sound, mute-while-focused), state persisted in `localStorage`.
- `packages/taskflow/src/commands/notify.ts` (new) — `cmdNotify(config, opts)` that fires platform-appropriate OS notifications via `osascript` (macOS), `notify-send` (Linux), or PowerShell (Windows). All failures swallowed.
- `packages/taskflow/src/cli.ts` — register the `notify` subcommand with `--title`, `--project`, message positional. Skip work and exit 0 when `notifications.cli !== true`.
- `packages/taskflow/src/types.ts` + `packages/taskflow/src/config.ts` — extend `TaskflowConfig` with `notifications: { browser, cli }` keyed defaults.
- `packages/taskflow/templates/roles/TASK_*_ROLE.md` + canonical root role files — append a "WHEN TO NOTIFY" section listing the four milestones (task implemented, review APPROVED, fix-needed, merged) and the exact `insight-flow notify` command form. Gate the section on `notifications.cli` when `init` writes the per-project copy.
- `packages/taskflow/src/init/index.ts` — render or omit the "WHEN TO NOTIFY" section in the local role-file copies based on config.
- `packages/taskflow/README.md` — document config keys + opt-out semantics.

### Out of scope

- Multi-project overview (N20).
- Phase markers / activity feed enrichment (N21).
- Custom notification themes / sounds beyond the built-in default OS sound.
- A notification history log (the activity engine already records milestones via N21's phase markers).
- Per-tool semantic narration.

## Implementation plan

1. **Config schema + defaults.**
   - Extend `TaskflowConfig` with `notifications?: { browser?: boolean; cli?: boolean }` in `types.ts`. Mark fields optional, default both to `true` in `config.ts`.
   - Add to `init/index.ts`'s `buildConfigWithExamples` so the example config shows the keys.
2. **CLI subcommand — `insight-flow notify`.**
   - New file `packages/taskflow/src/commands/notify.ts` exporting `cmdNotify(config, opts)`. When `notifications.cli === false` → exit 0 silently. Otherwise build title/message, branch on `process.platform`, spawn the OS notifier non-blocking (`child_process.execFile` without awaiting), swallow all errors in the spawned call.
   - Register in `cli.ts`. Help line: `notify "<message>" [--title <title>] [--project <name>]   Fire an OS notification (fire-and-forget; respects notifications.cli)`.
   - Wrap every OS call in try/catch with a 100 ms hard timeout to guarantee fire-and-forget exit time.
3. **Browser-side diff + Notification API.**
   - In `dashboard.ts`, store the previous shard snapshot in memory after `loadShard()`. On every `loadShard()` re-run (triggered by Socket.IO `file-change`), diff `tasks[].status` against the previous snapshot.
   - For each task whose status changed AND whose new status is in the user's watched-set, fire `new Notification(title, { body, silent: !soundEnabled })`. Title format: `<projectName>: <taskId> → <newStatus>`.
   - Permission flow: on first dashboard load, if `Notification.permission === "default"`, show a one-time prompt. Persist user's choice (`localStorage`).
   - Settings popover: top-bar gear icon opens a card with checkboxes for each status (implemented, approved, fix-needed, merged, changes-requested) + sound toggle + "mute when tab is focused" toggle. Persist to `localStorage`.
4. **Agent role files — "WHEN TO NOTIFY".**
   - In each role file (canonical roots + `templates/roles/`), add a tight section after OUTPUT CONTRACT:
     ```
     WHEN TO NOTIFY
     - After `implement-end`: `insight-flow notify "<task-id> implemented"`
     - After `review-end --verdict approved`: `insight-flow notify "<task-id> approved"`
     - After `review-end --verdict fix-needed`: `insight-flow notify "<task-id> needs fixes"`
     - After `merge`: `insight-flow notify "<task-id> merged"`
     - Limit: 1–3 calls per task. Skip if notifications.cli is false in config.
     ```
   - `init/index.ts` reads `notifications.cli`; when `false`, strips the WHEN TO NOTIFY block from per-project role-file copies. Canonical roots always include the section so the package is self-documenting.
5. **Smoke tests.**
   - `test/notify.test.mjs`: spawn the CLI with `notify "test"` on a fixture project; assert exit 0 and exit time <500 ms. With `notifications.cli: false`, assert exit 0 with no `child_process` invocation (use a stub binary on PATH).
   - Manual: in a fresh Claude Code session, run a full task lifecycle and confirm 1–3 native notifications fire.
6. **README.**
   - New "Notifications" section under "Configuration" documenting both halves, config keys, opt-out semantics, and the OS-by-OS commands the CLI uses.

## Verification

- `pnpm --dir packages/taskflow run typecheck && pnpm --dir packages/taskflow run build && pnpm --dir packages/taskflow test` all pass.
- Manual A: change a task status via CLI in another terminal with dashboard tab in background; OS notification appears within ~1 s on macOS / Linux / Windows.
- Manual B: from a terminal run `insight-flow notify "test"`; OS notification appears; command exits in <100 ms.
- Manual C: set `notifications.cli: false`; rerun `insight-flow notify "test"`; no notification fires, exit 0.
- Manual D: re-run `insight-flow init` with `notifications.cli: false`; per-project role-file copies omit WHEN TO NOTIFY section.

## Notes

- Related: N17 (Socket.IO live updates) provides the reliable file-change channel this task diffs against.
- Related: N20 (multi-project overview) needs notifications to label the project name correctly; this task ships the projectName-in-title plumbing N20 will reuse.
- Related: N21 (richer activity feed) shares the "agents call cheap CLI subcommands at milestones" pattern; consider co-locating `cmdNotify` and `cmdLogActivity` in the same module.
- Token cost: ~20 tokens per `insight-flow notify` call × 1–3 calls per task = 20–60 tokens. Role-file additions are ~120 tokens of instruction tax when `notifications.cli` is true.
