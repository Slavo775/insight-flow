# N77 — Cursor lifecycle hooks to dashboard via binary payload parsing

**Type:** feat
**Priority:** medium
**Created:** 2026-06-01

## Problem

Cursor projects (scaffolded in N75) fire no events into the dashboard and trigger no notifications — the live pipeline is Claude-only. The Claude coupling lives in fragile `.claude/hooks/lifecycle-*.sh` bash that greps Claude's stdin (`session_id`/`tool_name`) and in `statusFromEvent` matching Claude's PascalCase hook names. To support Cursor (and, additively, future editors) we move hook payload parsing **into the binary** and generate Cursor's `.cursor/hooks.json` + thin scripts. This is **Task B of two**; it depends on **N76** (the `provider` id).

## Goal

1. `insight-flow hook <event> --provider cursor` reads stdin and normalizes Cursor's payload shape + event names to insight-flow's derived event types — parsing lives in testable TS, not bash.
2. `statusFromEvent` understands Cursor event names (in that one place).
3. `insight-flow init` generates `.cursor/hooks.json` + thin hook scripts (wired into the N75 provider seam), tagging every event `--provider cursor`.
4. Cursor fires the same user notifications as Claude (OS + browser + sound), incl. the approval→sound→push flow.
5. Cursor activity appears in the dashboard's unified "Agent Activity" feed with the cursor badge (from N76).

## Scope

### In scope

- `packages/taskflow/src/cli.ts` (`hook` subcommand) / a new parsing module — read stdin JSON, detect/normalize Cursor fields (`conversation_id` → session id; tool/command fields) and map Cursor event names (`sessionStart`, `stop`, `subagentStop`, `preToolUse`, `postToolUse`, `beforeShellExecution`, `beforeSubmitPrompt`, `userPromptSubmit`…) → existing derived types (`session-start`/`agent-idle`/`tool-requested`/`tool-approved`/`approval-required`…). Extend `RAW_TO_DERIVED` or add a Cursor map.
- `packages/taskflow/src/server/event-stream.ts` — add Cursor raw names to `statusFromEvent` (e.g. `stop`/`subagentStop` → done; permission-bearing → awaiting-permission).
- Cursor hook generation: new generator (mirror of `activity-hook.ts`) + a `writeHooks` step on the `cursor` provider (`src/init/providers/cursor.ts` + seam) producing `.cursor/hooks.json` (version 1, camelCase events) + thin scripts that pipe stdin to `insight-flow hook <event> --provider cursor`.
- Cursor `stop` notify hook → reuse `insight-flow notify` + POST `/api/agent-done` (no server change).
- Approval→sound→push: `beforeShellExecution`/`preToolUse` hook on matched sensitive ops emits `approval-required` and returns `{"permission":"ask"}` (per N75 ANALYSIS). Conservative matcher; never auto-`allow`.
- Tests: Cursor payload normalization → derived type + status; `.cursor/hooks.json` generation; provider tag = cursor.
- Docs: README "Connecting Cursor" (hooks + notifications).

### Out of scope

- The `provider` id plumbing itself → **N76** (dependency).
- OpenAI/Codex provider (the seam should stay additive for it, no impl).
- Reworking Claude's existing bash hooks beyond what `statusFromEvent`/shared parsing requires (keep Claude byte-behavior intact).

### Parity caveats (document, don't try to solve)

- Cursor **cloud agents** don't fire session/prompt-lifecycle hooks (command hooks do) → the live feed is partial in cloud.
- Cursor has **no `PermissionRequest` event**; "approval required" is synthesized via the gate hook returning `ask` on a matcher we define.

## Implementation plan

1. **Binary parsing** — add a stdin-reading path to `insight-flow hook` (or a `parseHookPayload(raw, provider)` helper): for `--provider cursor`, read `conversation_id`/tool fields; map the Cursor event name → derived type; then reuse the existing `cmdLogEvent` hook path (with `--provider cursor`, `--session-id <conversation_id>`).
2. **statusFromEvent** — add Cursor names so a Cursor `stop` derives `done`, etc. Keep Claude mappings unchanged.
3. **Cursor hook generator** — emit `.cursor/hooks.json` (`{version:1, hooks:{ sessionStart|stop|preToolUse|postToolUse|beforeShellExecution|… : [{command, matcher?}] }}`) + thin scripts `cat | insight-flow hook <event> --provider cursor`. Use `CURSOR_PROJECT_DIR` (aliases `CLAUDE_PROJECT_DIR`).
4. **Provider seam** — add `writeHooks(ctx)` to `EditorProvider`; cursor implements it; init calls it for cursor (Claude keeps its existing `.claude` hook installers).
5. **Notifications** — Cursor `stop` script → `insight-flow notify` + `/api/agent-done`; the approval gate script emits `approval-required` + notify and returns `ask`.
6. **Tests + docs** — normalization/status unit tests; generation test; README section.

## Verification

- `pnpm --dir packages/taskflow run build` + `npx tsc --noEmit` clean.
- Unit: feeding a sample Cursor `stop` payload to `insight-flow hook --provider cursor` derives `agent-idle`/status `done` and tags `provider: cursor`.
- `insight-flow init --editor cursor` produces `.cursor/hooks.json` + scripts; `--editor claude` still produces the `.claude` hooks unchanged.
- Manual: with the dashboard running, a Cursor-shaped event POSTs to `/log/events`, shows in the unified feed with the cursor badge, and a `stop` fires the OS/browser notification.
- `pnpm --dir packages/taskflow test` passes; Claude hook tests unregressed.

## Notes

- **Depends on N76** (provider id). Do not start until N76 is merged (or rebase on it).
- Design of record: N75 `ANALYSIS.md` ("Phase-2 design — approval → sound + push on Cursor") + this folder's `ANALYSIS.md`. Cursor event/stdin/env facts came from cursor.com/docs/hooks (fetched as data during N75).
- Engine stays untouched (CLAUDE.md "Two pieces only"); this only adds editor adapters + a parsing path.
