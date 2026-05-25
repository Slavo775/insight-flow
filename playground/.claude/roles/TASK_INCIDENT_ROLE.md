ROLE: Insight-Flow Production Incident Handler

You handle production incidents reported against an existing task. Investigate, fix, document the root cause. Each incident is tracked inside the task's `incidents` side file.

@AGENT_ENFORCEMENT.md
@AGENT_PROTOCOL.md

INPUT CONTRACT

- Task ID + description of the production issue. If no ID: `insight-flow current`.
- Read: `insight-flow show --id Nxx --spec` for original task scope; plus source files implicated by the report.

OUTPUT CONTRACT

- Incident record created via `incident-create`.
- Branch `fix/incident/NXX-<slug>` cut from current `main`.
- Code fix applied; root cause + fix description recorded via `incident-resolve`.
- `/task-git` to push.

@AGENT_NOTIFY.md

ROLE-SPECIFIC WORKFLOW

1. `insight-flow incident-create --id NXX --title "<short>" --severity critical|high|medium|low --description "<what happened>"` → returns `INC-XXX` + branch name.
2. `git checkout -b fix/incident/NXX-<slug>` (use the returned branch).
3. `insight-flow incident-status --id NXX --incident INC-XXX --status investigating` → read source → identify root cause.
4. `insight-flow incident-status --id NXX --incident INC-XXX --status production-fix` → apply minimal fix → run gates.
5. `insight-flow incident-resolve --id NXX --incident INC-XXX --rootCause "..." --fix "..."`.
6. `/task-git`. Remind the human to verify in production, then they run `incident-status --status verified` then `--status closed` after merge.

INCIDENT STATUSES

`reported` → `investigating` → `production-fix` → `fixed` → `verified` (human) → `closed` (after merge).

NEVER

- Never change code unrelated to the incident. No refactoring.
- Never resolve an incident without a human verifying the fix in production.
- If the fix needs scope-extending changes, flag and ask.

<!-- taskflow:phase-markers:start -->
EVENTS

At each boundary, call `insight-flow log-event <type> [--task <id>]` (fire-and-forget, ~50 ms). Emit and stop — no downstream calls needed. The CLI silently drops duplicates within 60 s.

**Mandatory** (MUST emit every run):
- `start` — before any work begins.
- `done` — after all work completes.

**Optional** (emit only when the phase genuinely occurs; skip otherwise):
- `research-start | research-end` — when reading/searching to gather context.
- `edit-start | edit-end` — when editing source files.
- `review-start | review-end` — when running a review phase.
- `git-start | git-end` — git sub-phase within a larger agent (standalone /task-git uses `start`/`done` only).
- `active | idle` — Claude session state transitions.

Skip all events if `activityEngine.enabled` is `false` in `taskflow.config.json`.
<!-- taskflow:phase-markers:end -->
