# AGENT_NOTIFY — intentionally blank

Notifications are handled exclusively by Claude Code hook scripts.
Agents must not call `insight-flow notify` or any notification command directly.

To opt in to AI-triggered notifications, configure `agents.extend` in `taskflow.config.json`.
See `packages/taskflow/README.md` — "Notifications" for the full model.
