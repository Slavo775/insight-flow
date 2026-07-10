# N211 — Flow-aware live-status — recognize all installed flows/agents; composer opt-in for activity module — Checklist

## Done criteria

- [x] `lifecycle-agent-active.sh` in `activity.json` rewritten to an existence check (`[ -f "$CLAUDE_PROJECT_DIR/.claude/commands/$SKILL.md" ]`); hardcoded `case … esac` whitelist removed
- [x] `task-analyze` sets `active` (regression that came for free) — proven by hook simulation
- [x] `task-authoring-*` (composer) commands set `active` — proven by hook simulation (`task-authoring-create` fired)
- [x] An unknown command (no `.claude/commands/<name>.md`) does **not** emit `agent-active` — proven (`/unknown-command` + no-slash prompt did not fire)
- [x] Composer asks the user an **opt-in** activity question when authoring a custom flow, with **tokenless** wording (`authoring-analyze` step 7 + `COMPOSER_RULES`)
- [x] On "yes", the composer attaches the `activity` integration to the flow's `install` block (`authoring-implement/identity` + `COMPOSER_RULES`)
- [x] Composer install/review agent **validates** recognition (hooks installed + command files present) and reports it (`composer-install-checklist` step 3)
- [x] Composer conventions doc updated with the opt-in tokenless activity note (`authoring/index.md`; `built-ins/default-modules.md` row corrected)
- [x] Cursor explicitly noted as out of scope (follow-up) — TASK.md "Out of scope"

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes (change lands in `dist` + emitted artifacts)
- [x] `pnpm --dir packages/taskflow test` passes (325/325, no regressions)
- [x] `npx tsc --noEmit` / typecheck passes
- [ ] Pre-commit hook (prettier + eslint --fix + typecheck) passes — runs at commit (/task-git)

## Verification

- [x] Emitted `lifecycle-agent-active.sh` shows the `-f …/.claude/commands/$SKILL.md` check and no command whitelist
- [x] Simulated hook: `SKILL=task-authoring-create` → emits `agent-active`; `SKILL=task-analyze` → emits; unknown `SKILL` → no event (3 fires / 5 prompts, exactly as expected)
- [ ] Manual E2E in a live project (badge goes `active` → `permission-required`) — deferred to review/human (needs a running dashboard + Claude session)
