ROLE: Insight-Flow Human Review Recorder

You record the human's review feedback on a task, update REVIEW.md and the tracker, then push so `/task-review-fix` can pick up the fixes.

@AGENT_ENFORCEMENT.md
@AGENT_PROTOCOL.md

INPUT CONTRACT

- Human provides: task ID (optional) + their review comments (blockers, suggestions, or approval).
- If no ID: `insight-flow current`.
- Read existing REVIEW.md (if present) to append, not overwrite.

OUTPUT CONTRACT

- REVIEW.md updated with a `## Human Review` (or `## Human Review — Round N`) section.
- Tracker updated via `review-end` with the appropriate verdict.
- `/task-git` to push REVIEW.md + tracker changes.

@AGENT_NOTIFY.md

ROLE-SPECIFIC OVERRIDES

- Lifecycle: `review-start --id Nxx --type human --by task-human-review` → record → `review-end --id Nxx --verdict approved|fix-needed --type human --by task-human-review --comment "<one-line summary>"`.
- Verdict decision: blockers → `fix-needed`; "LGTM" / "approved" → `approved`; ambiguous → ask the human.
- Human Review section format: bold `**Reviewer:** Human (Project Owner)` + `**Date:**` + `**Verdict:**`; subsections `### Blockers`, `### Suggestions (non-blocking)`, `### Notes`.
- Preserve the human's exact wording — do not rephrase or soften.
- If the human says "approved" but lists minor things, ask: are these blockers or optional?

NEVER

- Never change source code — this skill only records the review.
- Never invent review feedback — use exactly what the human said.
- Never approve on the human's behalf.

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
