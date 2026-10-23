# N280 — Hook scripts correct, quiet, fast — node-built JSON, quoted paths, local bin, silent stdout, active-flag fast path

**Type:** fix
**Priority:** medium
**Created:** 2026-10-19

## Problem

The bash hook scripts that `init` installs into user projects have several defects:

- The activity hook builds JSON with `echo` and no escaping: 13.9 % of measured log lines are malformed, and full commands, secrets included, are logged.
- Hook commands use an unquoted `${CLAUDE_PROJECT_DIR}`, so a project path with a space breaks every hook.
- Lifecycle scripts call a bare `insight-flow`, which silently fails for local or yalc installs.
- Background calls leave stdout attached, so JSON can leak into the model's context and the pipe stays open.
- Two OS notifications fire on every Stop, one of them in every session.
- Every tool call starts the full 543 KB CLI twice, even in sessions that never ran a slash command.
- The Cursor approval gate answers "allow" to anything it fails to parse, and session activation is wrong for Cursor prompts and `as: "skill"` commands.
- `migrate-hooks` never refreshes the activity / enrichment / notify scripts, so the v4 fix never reaches existing projects.

Source: `N271/AUDIT.md` **A26, A40, A41, A42, A46**.

## Goal

1. Every hook log line is valid JSON with bounded field length.
2. Hooks work in project paths with spaces and with local, yalc or global installs.
3. Hooks print nothing that reaches the model, and notify once per real event.
4. In a session with no active insight-flow skill, a tool call spawns no node process.
5. The Cursor gate never auto-allows; `migrate-hooks` brings every bundled script up to date.

## Scope

### In scope

- `packages/taskflow/src/agents/activity-hook.ts` (activity, enrichment and classify scripts; installers; `BUNDLED_HOOKS_VERSION`; header comment :7-9).
- `packages/taskflow/src/agents/modules/integrations/activity.json` (lifecycle scripts :10-89).
- `packages/taskflow/src/agents/notify-hook.ts`.
- `packages/taskflow/src/agents/cursor-hooks.ts`, `packages/taskflow/src/agents/hook-parse.ts`.
- `packages/taskflow/src/agents/flow-install.ts` (`INSIGHT_FLOW_BIN` :335).
- `packages/taskflow/src/cli/commands/migrate-hooks.ts`.
- `packages/taskflow/src/cli/cli.ts` (lazy imports only).
- `packages/taskflow/src/cli/commands/log-event.ts` (hook-path stdout only).
- Tests that **execute** the generated scripts.

### Out of scope

- Merging `settings.local.json` / `.cursor/hooks.json`, init opt-outs, install conflicts → N281.
- Events storage format → N279.
- Argument parsing → N278.

## Implementation plan

1. **Valid JSON (A26).** Replace the echo-built PostToolUse activity script with a call to the node hook path (`insight-flow hook PostToolUse`, using `JSON.stringify`). If a bash-only path must remain, escape the same way as `CLASSIFY_HOOK_SCRIPT` (`activity-hook.ts` ~:229). Truncate the logged command to 120 chars.
2. **Quoting (A40a).** Emit `"$CLAUDE_PROJECT_DIR"/.claude/hooks/<x>.sh` in every settings entry (`activity-hook.ts:154, 273`, `notify-hook.ts:115`, `activity.json:10-85`). Store `IF_CMD` as a bash array (`IF_CMD=(node "$LOCAL_CLI")` → `"${IF_CMD[@]}"`).
3. **Binary resolution (A40b).** Reuse the existing `RESOLVE_BIN` snippet (local `node_modules/.bin` → repo dist → global) in every lifecycle script and in `flow-install.ts` installs, instead of a bare `insight-flow`.
4. **Silent background calls (A40c).** All six lifecycle scripts use `</dev/null >/dev/null 2>&1 &`. The `log-event` hook path stops printing to stdout (keep the agent path's stdout if roles rely on it).
5. **One notification (A40d).** Gate `lifecycle-agent-idle.sh`'s `notify "Agent idle"` behind the session-active flag, or drop it and keep `notify-hook` as the single notifier.
6. **Fast path (A41).**
   - In bash, before invoking node for `--if-active` events: extract `session_id` from stdin (a simple id field) and `[ -f "$HOME/.insight-flow/session-$SID.active" ] || exit 0`.
   - In `cli.ts`, turn the static imports of the dashboard server, master, init and MCP into `await import()` inside their commands.
   - Measure user CPU for an inactive-session hook before and after, and put both numbers in the PR.
7. **Cursor gate + activation (A42).**
   - For non-sensitive or unparsable calls, output nothing (defer to Cursor's own setting) instead of `{"permission":"allow"}`.
   - Parse the payload in node (`hook-parse`), not grep.
   - Cursor `beforeSubmitPrompt` activates a session only for a known slash command; Claude's activation check also accepts `.claude/skills/<n>/SKILL.md`.
8. **Refresh everything (A46).**
   - `migrate-hooks` rewrites the activity, enrichment, notify and lifecycle scripts when their content differs, and fixes stale registrations (relative paths, old names) by matching full command strings.
   - Bump `BUNDLED_HOOKS_VERSION`.
   - The CLI warns once when the installed `hooksVersion` is older.
   - Correct the header comment (`activity-hook.ts:7-9`).
9. **Tests that execute the scripts.** Run each generated script with fixture stdin in a temp project named `my project`:
   - a command containing `\"` → valid JSONL line;
   - a path with a space works;
   - stdout is empty and exit code is 0;
   - an inactive session → a stubbed `insight-flow` on `PATH` is never invoked;
   - the Cursor bypass payload (`echo \"hi\" && git push --force`) → not "allow";
   - `migrate-hooks` updates an old enrichment script.

## Verification

- `pnpm --dir packages/taskflow test` is green, including the new script-execution tests.
- Manual: in a project under a path with a space, run `insight-flow init --yes` then a Claude session → activity appears, and `.taskflow-activity.jsonl` lines all parse (`node -e` over the file → 0 errors).
- Manual: a plain chat (no slash command) produces no `node` processes per tool call (`ps` during a tool call, or the CPU numbers in the PR).
- Manual: one Stop → at most one OS notification.

## Notes

- Detail and evidence: `N271/AUDIT.md` A26, A40–A42, A46 (13.9 % malformed measured over 10,007 lines; Cursor bypass demonstrated).
- The Claude Code side of the stdout behaviour (A40c) is inferred from documentation. Verify against the current Claude Code hooks docs during analysis.
- **Depends on N279** (shares `log-event.ts` and the activity file format) and N278 (`cli.ts`).
- Recommended run: `/task-analyze N280` → `/task-implement N280`.
