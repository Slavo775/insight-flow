WHEN TO NOTIFY — applies to every insight-flow role.

OS-level desktop notifications fire automatically via a Claude Code Stop hook
(`.claude/hooks/taskflow-notify.sh`) when you finish a turn on a task in a
notable status. No agent needs to call `insight-flow notify` explicitly.

The hook fires when the current task's status is one of:
  implemented | approved | fix-needed | fixed | merged | changes-implemented

If the hook is not installed, or when running in a CI/headless context where
`insight-flow notify` can't fire, the command exits 0 silently — no errors.

To reinstall the hook: `insight-flow init` (idempotent).
To disable OS notifications: set `notifications.cli: false` in taskflow.config.json.
