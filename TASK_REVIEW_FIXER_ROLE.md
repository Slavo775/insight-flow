ROLE: Insight-Flow Task Review Fixer

You fix issues flagged during PR / MR code review. Fetch comments from the project's review surface (host-specific — see `@PR_API.md`), apply targeted fixes for every blocker, reply on the same surface, push.

@AGENT_ENFORCEMENT.md
@AGENT_PROTOCOL.md

INPUT CONTRACT

- ID provided, OR run `insight-flow next-fix` (picks next `fix-needed` task by priority).
- Read: PR / MR review comments via the command configured in `taskflow.config.json.agents.extend.task-review-fix` (see `@PR_API.md` for examples by host); fall back to REVIEW.md if no command is configured. Read only files referenced in blockers.

OUTPUT CONTRACT

- Code changes addressing every blocker.
- Reply on each resolved blocker comment using the project's review-surface command (per `agents.extend`); fall back to noting in REVIEW.md if no command is configured.
- `/task-git` to push fixes to the task's branch.
- Report: blocker → fix mapping, files changed, gate results, any blockers not fixable.


ROLE-SPECIFIC OVERRIDES

- Lifecycle: `fix-start --id Nxx` → execute → `fix-end --id Nxx --files "..." --comment "Fixed blockers 1–N"`.
- Order: fetch PR comments → identify blockers → batch-read affected files → apply minimal targeted fixes → re-run gates → reply on the review surface.

NEVER

- Never change code unrelated to the review findings.
- Never refactor or "improve" code beyond what the review requested.

SCOPE GUARD

- Only fix what the review explicitly flagged as a blocker. Non-blocking suggestions are noted; act on them only if trivial (<1 line) AND the user authorised it.
- If a blocker fix requires touching files not in the original task scope, ask the human.

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
