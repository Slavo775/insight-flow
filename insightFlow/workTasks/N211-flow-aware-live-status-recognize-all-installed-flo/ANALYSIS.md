# N211 — Analysis (pre-taskmaster)

## Problem framing

User initialized insight-flow in `iThinkToday/admin` and runs the **composer** flow. The dashboard (`localhost:6009`) shows the event feed working, but the **Agent Activity** badge is stuck on `idle` and never shows `active` / `permission-required`. Two systems were conflated:

- **Event feed** — filled by role prompts calling `insight-flow log-event` (`source: agent`). Working.
- **Live status badge** — driven by **Claude Code shell hooks** (`.claude/hooks/lifecycle-*.sh`, `source: hook`). Not firing.

## Root cause (verified in code)

`packages/taskflow/src/agents/modules/integrations/activity.json` embeds `lifecycle-agent-active.sh` with a **hardcoded command whitelist**:
`task-implement|task-review|task-review-fix|task-human-review|taskmaster|taskmaster-change|task-git|task-incident|task-request-changes|complete-task`.
The client badge logic (`dashboard/client/activity.ts` → `claudeStatusFromEvent`) only flips on hook events `agent-active|agent-idle|approval-required|tool-approved`. All of those, except `agent-active`, run with `--if-active`, so nothing fires until `agent-active` sets active first. Composer commands (`task-authoring-*`) and `task-analyze` are not in the whitelist → never active → badge frozen at idle. Confirmed against the live project: `.taskflow-activity.jsonl` had `session-start` (hook) + agent-source phase events only; zero `agent-active`.

## Goal

Recognize all installed flows/agents (default, composer, custom) for live status, with no hardcoded list; teach the composer to offer the `activity` integration (opt-in, tokenless) when authoring custom flows and to validate recognition.

## Options considered

**Recognition mechanism (the fork):**
1. **Command-file existence** — hook checks `.claude/commands/$SKILL.md`. Generic, no regeneration, no per-flow wiring; trade-off: any installed slash command sets active. **← chosen.**
2. Manifest list (`taskflow-managed.json`) — precise but needs install to record commands + bash JSON parsing.
3. Name prefix (`/task-*`) — simplest hook but forces a naming rule on every custom flow.

**Composer awareness (Part 2):**
- A) Always-on activity for custom flows. — rejected.
- B) **Ask the user (opt-in), stress it is tokenless.** — **chosen by user.**
- Attach the `activity` integration on yes (a standalone custom flow without it installs no lifecycle hooks at all).

## Decision

Part 1: existence-check hook (Option 1) — also fixes `task-analyze` for free.
Part 2: composer asks an opt-in, tokenless activity question; attaches `activity` on yes; install/review validates recognition. Cursor out of scope.

## Open questions

- Exact authoring role/step that should own the opt-in prompt (requirements vs spec vs create) — implementer to place it where the composer asks the user.
- Whether docs live in `website/docs` composer page or `composer-conventions.ts` only — update both if a doc page exists.

## Sources

- Live project: `/Users/ssedlak/Documents/personal_projects/iThinkToday/admin/.claude/{settings.json,hooks/*.sh}`, `.taskflow-activity.jsonl`, `.claude/taskflow-managed.json`.
- Code: `modules/integrations/activity.json`, `dashboard/server/event-stream.ts`, `dashboard/client/activity.ts`, `project/default.json`, `project/authoring.json`.

## Handoff brief

fix / high / tags: agents, composer, activity, hooks. Part 1: existence-check active hook. Part 2: composer opt-in tokenless activity question + attach on yes + validate. Non-goals: Cursor, `--if-active`, status vocabulary.
