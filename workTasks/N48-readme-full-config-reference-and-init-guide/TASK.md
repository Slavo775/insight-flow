# N48 — readme-full-config-reference-and-init-guide

**Type:** rework
**Priority:** high
**Created:** 2026-05-26

## Problem

`packages/taskflow/README.md` has two major gaps. The `## Configuration` section documents only 10 of ~25 available config keys — `master.*`, `events.*`, `activityEngine.phaseMarkers/hookEnrichment/verbosity`, and `notifications.sounds.enabled` are entirely absent. The init experience is three terse bash lines with no explanation of what files are created, what to do after, or how to wire Claude Code slash commands. A first-time user (human or AI agent) has no clear path from install to first working task.

## Goal

1. Expand `## Configuration` into a complete reference covering all keys in `TaskflowConfig`, `ActivityEngineConfig`, `NotificationsConfig`, `MasterConfig`, and `EventsConfig` from `src/types.ts`.
2. Replace `## Install` + `## Quickstart` with a step-by-step `## Getting started` guide: install → init → verify files → open dashboard → connect Claude Code → configure for stack → create first task.
3. Add a `### What init creates` subsection listing every file/directory `initProject()` scaffolds.
4. Document the `insight-flow init --examples` flag.
5. All config keys match `types.ts` exactly — no invented fields, no omissions.

## Scope

### In scope

- `packages/taskflow/README.md` — all changes go here only.
- Replace `## Install` + `## Quickstart` with `## Getting started` (6 numbered subsections).
- Rewrite `## Configuration`: `### Full example` JSON block + grouped tables for Core, Activity engine, Notifications, Agent behaviour, Multi-project master, Events.
- `### What init creates` subsection listing all scaffolded paths.

### Out of scope

- No source code changes (types.ts, config.ts, init/index.ts, etc.).
- Do not rewrite the multi-project/master-server sections — cross-reference them.
- Do not invent config keys not in `types.ts`.

## Implementation plan

1. **Read authoritative sources** — `src/types.ts` (all config interfaces), `src/config.ts` (DEFAULTS values), `src/init/index.ts` (every file `initProject()` creates).

2. **Rewrite `## Install` + `## Quickstart`** into `## Getting started` with subsections:
   - `### 1. Install` — `npm install -g insight-flow` or `npx insight-flow init`
   - `### 2. Initialize your project` — `insight-flow init [--examples]`; explain what `--examples` adds (commented `agents.extend` stubs in config)
   - `### 3. What init creates` — bulleted list: `taskflow.config.json`, `workTasks/master.json` + first shard, `.claude/commands/*.md` (9 slash commands), `CLAUDE.md` (or appended section), `.claude/hooks/` (activity + lifecycle hooks)
   - `### 4. Connect Claude Code` — open Claude Code in project root; slash commands appear automatically; verify with `/taskmaster`
   - `### 5. Configure for your stack` — one-liner pointer to `agents.extend` with a TypeScript+pnpm example; link to full `### Extending built-in agents` section
   - `### 6. Create your first task and launch the dashboard` — `insight-flow create ...` then `insight-flow`

3. **Rewrite `## Configuration`** — keep existing subsections, add new ones:
   - `### Full example` — fenced JSON block with ALL keys and inline comments; note it must be stripped to valid JSON at runtime
   - `### Core` — table: `workDir`, `shardSize`, `projectName`, `rolesDir`, `server.port`
   - `### Activity engine` — table: `activityEngine.enabled`, `logFile`, `maxEvents`, `phaseMarkers`, `hookEnrichment`, `verbosity` (document all 3 verbosity values)
   - `### Notifications` — add `notifications.sounds.enabled` row to existing table; keep tier explanation
   - `### Agent behaviour` — brief table pointing at `agents.extend`, `agents.custom`, `agents.git.permissions` with note "see [Git permission gates](#git-permission-gates) for full flag reference"
   - `### Multi-project master` — table: `master.url`, `master.port`, `master.standalone`, `master.startMasterLocally`; cross-ref to `## Multi-project overview`
   - `### Events` — table: `events.dedupWindowSeconds`, `events.hooks`; brief description + example of custom hook per event type

4. **Verify** — manually confirm every interface field in `TaskflowConfig` and its sub-interfaces appears in a table row; no source files changed.

## Verification

- Every field in `TaskflowConfig | ActivityEngineConfig | NotificationsConfig | MasterConfig | EventsConfig` from `src/types.ts` has a README table row.
- `## Getting started` has 6 numbered subsections.
- `### What init creates` lists at minimum: `taskflow.config.json`, `workTasks/`, `master.json`, `.claude/commands/`, `CLAUDE.md`, `.claude/hooks/`.
- `--examples` flag explained under init subsection.
- `git diff --name-only` shows only `packages/taskflow/README.md` changed.

## Notes

- `EventsConfig.hooks` is `Partial<Record<EventType, string[]>>` — document as "custom shell commands run on each event type"; list event types from `EVENT_TYPES` in `types.ts`.
- `activityEngine.verbosity`: `"milestones"` = phase-marker events only; `"detailed"` = every tool call; `"both"` = all events.
- `MasterConfig.startMasterLocally` + `standalone` belong to the multi-project model — just a table row + cross-ref, no re-explanation.
- Related: N47 added `remoteOps` to git permissions — `### Agent behaviour` should link to `### Git permission gates` rather than duplicate.
