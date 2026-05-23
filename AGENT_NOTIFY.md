WHEN TO NOTIFY — applies to every insight-flow role.

Fire `insight-flow notify` at key task milestones so the human gets an OS-level desktop
notification regardless of whether a browser tab is open. Commands are fire-and-forget
(<100 ms, errors swallowed). Skip if `notifications.cli` is `false` in `taskflow.config.json`.

MILESTONES

- After `implement-end`:              `insight-flow notify "<task-id> implemented"`
- After `review-end --verdict approved`:  `insight-flow notify "<task-id> approved"`
- After `review-end --verdict fix-needed`: `insight-flow notify "<task-id> needs fixes"`
- After `insight-flow merge`:         `insight-flow notify "<task-id> merged"`

RULES

- Limit: 1–3 notify calls per task total across all agents.
- Only fire for milestones your role actually reaches.
- Never inspect the exit code or stdout of `insight-flow notify`.
