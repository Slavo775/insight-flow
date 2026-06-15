# N116 — Flow binding — Task.flowId + type→flow map (taskmaster binds at create)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-15

## Problem

- Custom project flows (N108) and the default flow are pure pictures: nothing connects a TASK to a flow, so neither the dashboard nor the CLI can say which flow governs a given task. The task map (N104) + suggestions (N105) are hardwired to the default flow. Step 1 of making flows prescriptive-lite is binding each task to a flow at creation.

## Goal

1. `Task` schema gains `flowId: string` (default `"default"`) in `packages/taskflow/src/core/schema/index.ts` — existing tasks read back as `"default"`, zero behavior change.
2. `taskflow.config.json` gains a `flows` block: `{ defaultFlow: "default", byType: { "fix": "custom:hotfix", ... } }`, with sensible shipped defaults in `core/config.ts`.
3. `insight-flow create` resolves the flow at creation: explicit `--flow <id>` wins, else `flows.byType[<type>]`, else `flows.defaultFlow` — an unknown/missing flow falls back to `"default"` non-fatally with a printed note.
4. `flowId` is exposed in CLI task payloads and the dashboard `/api` task shapes (so N117/N118 can read it).

## Scope

### In scope

- `packages/taskflow/src/core/schema/index.ts` — `Task.flowId` (default `"default"`).
- `packages/taskflow/src/core/config.ts` — `flows` config defaults + types.
- `packages/taskflow/src/cli/commands/create.ts` — resolve `flowId` (--flow → byType → defaultFlow → "default"); accept `--flow`.
- Wherever tasks are serialized to the CLI/API so `flowId` rides along (storage already round-trips unknown→default via schema default).
- Tests: create with `--type fix` → mapped flow; `--flow custom:x`; unknown mapped flow → fallback + note; existing task without flowId → `"default"`.

### Out of scope

- `set-flow` / reassignment (N117). Surfacing the flow or next step (N118). Any picker / state-machine change (deferred Drive round).
- Validating that the mapped flow actually exists at create time beyond the non-fatal fallback (N117 validates on explicit reassignment).

## Implementation plan

1. **Schema** — add `flowId: z.string().default("default")` to `TaskSchema`; confirm storage round-trips (default fills legacy tasks).
2. **Config** — add `flows: { defaultFlow, byType }` to `TaskflowConfig` + defaults (`defaultFlow: "default"`, an example `byType`); merge like other config blocks.
3. **create** — resolve order `--flow` → `byType[type]` → `defaultFlow`; if the resolved id is neither `"default"` nor a known `custom:*` project flow, fall back to `"default"` and print a note; write `flowId` onto the new Task.
4. **Expose** — include `flowId` in `show`/`list` payloads + the dashboard task API (it serializes the Task, so mostly free once on the schema).
5. **Tests** — the create-resolution matrix + legacy-default.

## Verification

- `pnpm build` + suite green; existing tasks load with `flowId: "default"`.
- `insight-flow create --type fix` (with a `byType.fix` configured) sets the mapped flow; `--flow custom:x` overrides; an unknown mapping falls back to `"default"` with a note.
- Dashboard task payload includes `flowId`.

## Notes

- Decisions (/task-analyze 2026-06-15): shared taskmaster picks the flow by type at creation; deterministic config map; unknown → default. Round 1 of phased Guide→Drive — see N116/ANALYSIS.md.
- flowId values are project ids: `"default"` or `"custom:<slug>"` (N108).
