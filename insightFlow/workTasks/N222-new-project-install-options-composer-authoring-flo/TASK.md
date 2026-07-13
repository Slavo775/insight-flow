# N222 — New Project install options + composer-authoring flow install

**Type:** feat
**Priority:** medium
**Created:** 2026-07-11

## Problem

Creating a project from the hub runs `initProject(dir, false, { yes: true })`, which installs the defaults only: activity + lifecycle on, claude editor, no hub-register, and just the default task-lifecycle roles. The user can't choose what to install, and there is no way to also install the **composer-authoring** flow (the agents that let you build custom modules/agents/flows). Today `init` has no flow-selection at all — it scaffolds the default roles via `buildSkillList`, never through the flow-install machinery.

## Goal

1. The New Project modal exposes the install choices `init` offers: agent activity tracking, lifecycle events, editor (claude / cursor / all), register-with-hub.
2. The modal offers installing the **composer-authoring** flow in addition to the default flow.
3. `POST /api/projects/create` forwards these options to `initProject`.
4. `init` learns to install a chosen built-in flow (composer-authoring) via the existing `installPlan({ kind: "flow", id: "composer-authoring" })` path, writing its commands/roles into the new project.
5. Build, typecheck, and tests are green.

## Scope

### In scope

- `packages/taskflow/src/agents/init/index.ts` — accept structured options: reuse `editor`, `registerHub`; add explicit `activity?`, `lifecycle?`, and `installFlows?: string[]` (e.g. `["composer-authoring"]`). When `installFlows` includes a built-in flow, run its install plan into `cwd` after the base scaffold.
- Flow-install wiring — reuse `flowInstallPlan` / `installPlan` (`packages/taskflow/src/agents/flow-install.ts`) + the emit/compose path (`packages/taskflow/src/agents/emit.ts`, `compose.ts`) that writes a flow's skills/roles to `.claude/`. Investigate exactly how the dashboard/MCP flow-install writes to disk and reuse that, rather than re-implementing.
- `packages/taskflow/src/master/server.ts` — `POST /api/projects/create` parses `{ name, dir, activity, lifecycle, editor, registerHub, installFlows }` and passes them into `initProject`.
- `packages/taskflow/src/master/overview.ts` — add the option controls to the N221 modal (checkboxes/radio): activity, lifecycle, editor select, register-to-hub, and "Install composer-authoring flow".
- Tests in `packages/taskflow/test/` (init flow-install + create-with-options).

### Out of scope

- A full "pick from all flows" registry picker — only default (always) + composer-authoring (opt-in) here. A general flow picker is a future task.
- The modal shell + folder browser themselves (N221 — this task adds fields to that modal).
- Changing the default-flow scaffold path for existing `insight-flow init` CLI users beyond the new optional args.

## Implementation plan

1. **Investigate the flow→disk path.** Confirm how a flow's `installPlan` output becomes `.claude/commands/*.md` + roles (via `emit.ts` / the composer install used by the dashboard). Identify the single function to call with `{ kind: "flow", id: "composer-authoring" }` targeting a project dir. Record findings in a code comment / this task's notes.
2. **`initProject` options (init/index.ts).** Extend the options object with `activity?`, `lifecycle?`, `installFlows?: string[]`. Thread `activity`/`lifecycle` into the existing enable flags (so non-interactive create can set them explicitly instead of defaults). After the base scaffold, for each id in `installFlows` that is a known built-in flow, run its install plan into `cwd`.
3. **Composer-authoring install.** Wire `installPlan({ kind: "flow", id: "composer-authoring" })` (or the emit equivalent) so the new project gets the authoring commands + roles alongside the default set.
4. **Create endpoint (server.ts).** Parse the new fields from the POST body (defaults preserve current behavior); build the `initProject` options and call it. Keep loopback-only + root confinement from N221.
5. **Modal fields (overview.ts).** Add the option controls to the create modal; include a short tokenless note for activity (consistent with composer conventions). POST the selections.
6. **Tests.** `initProject(dir, false, { yes: true, installFlows: ["composer-authoring"] })` writes the authoring command files; create-with-options respects `activity:false` / `editor:"cursor"` etc.

## Verification

- Create a project with "Install composer-authoring flow" checked → the new project has the authoring slash commands (`.claude/commands/*authoring*.md`) plus the default set.
- Create with activity off / editor cursor → config + scaffolding reflect the choices.
- `cd packages/taskflow && npx tsc --noEmit && npm test` green.

## Notes

- Built-in flows: `default` (`agents/project/default.json`), `composer-authoring` (`agents/project/authoring.json`). Install machinery: `flowInstallPlan` / `installPlan` in `agents/flow-install.ts`; disk emit via `agents/emit.ts` / `compose.ts`.
- Largest task in the epic; the flow→disk investigation (step 1) is the main unknown — timebox it and surface findings before wiring the modal.
- Depends on N221 (adds fields to that modal) and should land last.
