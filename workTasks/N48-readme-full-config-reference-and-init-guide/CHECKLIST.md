# N48 — readme-full-config-reference-and-init-guide — Checklist

## Done criteria

- [ ] `## Getting started` section replaces `## Install` + `## Quickstart` with 6 numbered subsections (Install → Initialize → What init creates → Connect Claude Code → Configure for stack → First task).
- [ ] `### What init creates` lists: `taskflow.config.json`, `workTasks/`, `master.json`, first shard, `.claude/commands/` (9 skill files), `CLAUDE.md`, `.claude/hooks/`.
- [ ] `--examples` flag documented under the Initialize subsection.
- [ ] `## Configuration` has a `### Full example` block with ALL config keys present.
- [ ] Tables added/updated for: Core, Activity engine (`phaseMarkers`, `hookEnrichment`, `verbosity` rows added), Notifications (`sounds.enabled` row added), Agent behaviour, Multi-project master (`master.*`), Events (`events.*`).
- [ ] Every field from `TaskflowConfig | ActivityEngineConfig | NotificationsConfig | MasterConfig | EventsConfig` in `src/types.ts` has a table row.

## Quality gates

- [ ] `git diff --name-only` shows only `packages/taskflow/README.md` changed.
- [ ] No source `.ts` files modified.

## Verification

- [ ] Check `src/types.ts` interfaces against README table rows — no field omitted.
- [ ] `## Getting started` reads coherently from install to first task without gaps.
- [ ] JSON example block in `### Full example` contains no keys absent from `types.ts`.
