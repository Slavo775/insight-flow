# N179 — Analysis (pre-taskmaster strategist)

## Problem framing

Follow-on to N178 (Docusaurus docs site). The site documents commands and agents but has **no reference for the project config file**. The user wanted "all configuration possibilities ... and what happens when some values change." They were unsure of the filename ("insightFlow.config.json or something").

## Goal

A single reference page documenting every `taskflow.config.json` key — type, default, what it controls, and the effect of changing it — plus adjacent config (global files, env vars, ports).

## Options considered

- **Scope breadth.** (a) config file only · (b) **file + adjacent (global/env/ports)** · (c) everything incl. CLI flags. → Chose (b). CLI flags are per-invocation overrides already covered under `cli/`; folding them in doubles the page and maintenance.
- **Placement.** (a) **new standalone `website/docs/configuration.md`** · (b) extend `cli/config-and-migration.md`. → Chose (a). The `reference/` folder is auto-synced by `sync-docs.mjs` (DO NOT EDIT); a top-level hand-authored page avoids clobbering and reads as a first-class reference.
- **Drift strategy.** Auto-generate from Zod vs hand-write. → Hand-write for now + source-of-truth pointer; generation is over-engineering at this size.

## Decision

Standalone `website/docs/configuration.md`. Scope = full `taskflow.config.json` key reference + adjacent config (global `~/.insight-flow/`, env vars, ports). CLI flags out (link to `cli/`). Risky keys (`workDir`, `shardSize`, `git.permissions.remoteOps`) get ⚠️ callouts. Include complete sample config + source-of-truth note.

## Key facts established

- Config filename is authoritatively **`taskflow.config.json`** (`src/core/config.ts:6`) — no `insightFlow.config.json` support exists.
- Existing config coverage is narrow: `cli/config-and-migration.md` (migration commands) and `reference/AGENT_CONFIG.md` (auto-generated, git-permissions runtime only). Net-new page, not a rewrite.
- Config surface inventory (areas): top-level (`workDir`/`shardSize`/`projectName`/`rolesDir`/`editor`/`hooksVersion`), `server.port`, `activityEngine.*`, `notifications.*`, `master.*`, `observability.langfuse.*`, `events.*`, `flows.*`, `agents.*` (extend/custom/git.permissions). Defaults in `config.ts`; optionals/types in `types.ts`.
- Adjacent: env vars `LANGFUSE_*`, `INSIGHT_FLOW_NO_OPEN`, `CLAUDE_SESSION_ID`; ports 6006 (dashboard) / 6100 (master); global `~/.insight-flow/` lock + config + registry files.

## Open questions

- Include a fully-populated sample `taskflow.config.json`? → Decided yes (copy-paste starting point). User invited to override during review.

## Sources

- `packages/taskflow/src/core/config.ts`, `src/core/types.ts` (schema + defaults).
- `website/docs/cli/config-and-migration.md`, `website/docs/reference/AGENT_CONFIG.md`, `website/sidebars.ts`, `packages/taskflow/scripts/sync-docs.mjs`.

## Handoff brief

feat / medium / tags docs,config. Create `website/docs/configuration.md` documenting `taskflow.config.json` by area (type/default/control/effect-of-change), ⚠️ callouts on risky keys, adjacent-config section, sample config, source-of-truth note, cross-links — CLI flags excluded.
