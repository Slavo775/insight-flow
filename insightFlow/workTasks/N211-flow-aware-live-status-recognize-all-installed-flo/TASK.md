# N211 — Flow-aware live-status — recognize all installed flows/agents; composer opt-in for activity module

**Type:** fix
**Priority:** high
**Created:** 2026-07-10

## Problem

The dashboard live agent-status badge (active / idle / permission-required) is stuck on **idle** for the composer flow, and will be for every custom flow. Root cause: the `activity` integration's `lifecycle-agent-active.sh` (embedded in `packages/taskflow/src/agents/modules/integrations/activity.json`) matches the incoming slash command against a **hardcoded whitelist of default-flow commands** (`task-implement|task-review|task-review-fix|task-human-review|taskmaster|taskmaster-change|task-git|task-incident|task-request-changes|complete-task`). Composer commands (`task-authoring-*`) and even `task-analyze` are absent, so `UserPromptSubmit` never emits `agent-active`. Because the permission / idle / tool hooks all run `insight-flow log-event … --if-active` and the session is never active, they emit nothing → the badge never leaves idle and `permission-required` never shows. Diagnosed live in `iThinkToday/admin` running the composer flow.

## Goal

1. Any installed insight-flow slash command — default, composer, or a future **custom** flow/agent — sets the session `active`, with no hardcoded per-flow list and no hook regeneration.
2. `task-analyze` and `task-authoring-*` set `active` (and therefore permission-required / idle work) after the fix.
3. When authoring a custom flow, the composer **asks** the user (opt-in) whether to include the `activity` integration so they see live activity in the dashboard, stating it is **tokenless**.
4. On "yes", the composer attaches the `activity` integration to the flow so its lifecycle hooks are installed; the composer's install/review step **validates** recognition.

## Scope

### In scope

- `packages/taskflow/src/agents/modules/integrations/activity.json` — rewrite the `lifecycle-agent-active.sh` body: replace the `case "$SKILL" in …` whitelist with a slash-command-file existence check: set active when `[ -f "$CLAUDE_PROJECT_DIR/.claude/commands/$SKILL.md" ]`. Keep session-id extraction and the `2>/dev/null &` fire-and-forget pattern.
- `packages/taskflow/src/agents/composer-conventions.ts` — add a convention: authored custom flows should offer live-status via the `activity` integration; it is opt-in (ask the user) and tokenless (shell hooks, no model tokens); on yes, include `activity` in the flow's `install`.
- `packages/taskflow/src/agents/modules/roles/authoring.json` — the authoring role(s) that gather requirements / write the spec must prompt the user with the opt-in activity question (tokenless wording); the install/review authoring agent must validate the hooks are installed and the flow's commands resolve to `.claude/commands/*.md`, and report it.
- Docs: reflect the composer convention (whichever website/docs page documents composer authoring / conventions).

### Out of scope

- **Cursor live-status** — the lifecycle hooks are Claude-only (`.claude/hooks/*.sh`, `$CLAUDE_PROJECT_DIR`). Cursor's parallel path is a separate follow-up; note it, don't build it.
- The `--if-active` gating and the status vocabulary (`active|idle|permission-required|awaiting-permission|done`) — unchanged; they already work once `active` fires.
- The agent-emitted phase markers (`start`, `research-*`, `done`) — separate path (role prompts calling `log-event`), not this integration.

## Implementation plan

1. **Rewrite the active hook.** In `activity.json`, change the `lifecycle-agent-active.sh` `content` string so that after extracting `SKILL` from the prompt it does:
   `if [ -n "$SKILL" ] && [ -f "$CLAUDE_PROJECT_DIR/.claude/commands/$SKILL.md" ]; then __INSIGHT_FLOW_BIN__ log-event agent-active --source hook --hook-name UserPromptSubmit --session-id "$SESSION_ID" 2>/dev/null & fi`. Fall back to `$CLAUDE_PROJECT_DIR` unset by using the current dir if needed, consistent with the other lifecycle scripts. Remove the `case`/`esac` block.
2. **Compose + rebuild** so the change lands in `dist` and in the composed/emitted artifacts; confirm the emitted `lifecycle-agent-active.sh` contains the existence check.
3. **Composer convention.** In `composer-conventions.ts`, add the rule (opt-in + tokenless + attach `activity` on yes). Keep wording short and non-native-friendly.
4. **Authoring roles.** In `modules/roles/authoring.json`, add the opt-in activity question to the requirements/spec authoring step, and the recognition validation to the install/review step. Re-run the role-template sync if required (`scripts/sync-role-templates.mjs`).
5. **Docs.** Update the composer conventions doc with the opt-in tokenless activity note.
6. **Manual E2E.** In a scratch project: install a custom/composer flow, answer the activity question "yes", run one of its commands, confirm the badge goes `active` and a `PermissionRequest` shows `permission-required`.

## Verification

- `pnpm --dir packages/taskflow run build` ✅ and `pnpm --dir packages/taskflow test` green.
- Inspect the emitted `lifecycle-agent-active.sh`: it uses `-f …/.claude/commands/$SKILL.md`, no hardcoded command list.
- Simulated hook run with `SKILL=task-authoring-create` and `SKILL=task-analyze` against a project that has those command files → emits `agent-active`; an unknown `SKILL` with no command file → no event.
- Composer authoring transcript shows the opt-in tokenless activity question; choosing yes adds `activity` to the flow's `install`; the install/review step reports recognition.

## Notes

- From `/task-analyze` (this session). Trade-off accepted by the user: with the existence check, **any** installed slash command sets active (fine for the non-coder use case).
- Both built-in flows (`project/default.json`, `project/authoring.json`) already reference `activity` in their `install`; a standalone custom flow **without** it installs no lifecycle hooks at all → no live-status — hence Part 2.
- Related: N207 (activity engine on by default), N200–N206 (composer authoring flow), N210 (home base). Standing composer rule: custom modules only — do not modify readonly/default modules; this task edits the shared `activity` integration content (allowed — it is insight-flow's own module) and composer conventions, not user data.
