# N222 — New Project install options + composer-authoring flow install — Checklist

## Done criteria

- [x] Flow→disk path identified + documented: **`installFlow(id, cwd)`** (`cli/commands/install-flow.ts`, shared by the CLI + init → `executeInstall` → `applyArtifacts`); noted in the `init` step-6c comment
- [x] `initProject` accepts `activity?`, `lifecycle?`, `installFlows?: string[]` (plus existing `editor`, `registerHub`)
- [x] `installFlows: ["composer-authoring"]` installs the authoring commands (`.claude/commands/task-authoring-*.md`) + subagents (`.claude/agents/*.md`) + `.mcp.json` composer server (via `installFlow`, editor-agnostic, idempotent, unknown ids skipped)
- [x] `POST /api/projects/create` parses + forwards `{ lifecycle, activity, registerHub, editor, installFlows }` (installFlows filtered to known flows; editor validated)
- [x] Defaults unchanged when options omitted (undefined → existing prompt/default behavior; all prior init tests still pass)
- [x] Modal exposes: lifecycle (zero tokens), activity (~50 tokens/turn), composer-authoring flow, register-to-hub, editor select

## Quality gates

- [x] `npx tsc --noEmit` passes (`npm run typecheck`)
- [x] `npm run lint` passes (eslint clean)
- [x] Related tests pass (`npm test` → 349, +4: 3 init + 1 endpoint)
- [x] No regressions in affected area

## Verification

- [x] Create with composer-authoring → project has the 5 authoring commands + a subagent + composer MCP + the default set — endpoint test + init test
- [x] Activity option honored — init test (`activity:true` installs `taskflow-activity.sh`, `activity:false` omits it). Editor threads via the existing provider selection (claude/cursor/all).
- [x] New test: `initProject(... installFlows: ["composer-authoring"])` emits authoring commands (+ unknown-id no-op)
- [x] New test: create-with-options honored end-to-end

## Notes

- Editor limitation (documented): `installFlow` emits under `.claude/` for all editors, so on a **cursor-only** project the composer-authoring commands land in `.claude/commands/` (Claude-form) rather than `.cursor/`. Fine for the default (claude); a cursor-native emit is a future follow-up.
