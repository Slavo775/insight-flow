# N94 — Actions/events taxonomy — inline actions module + activity hooks via emitter

**Type:** rework
**Priority:** medium
**Created:** 2026-06-11

## Problem

- The registry conflates two different telemetry providers under one name: the `events` include module instructs the *model* to call `insight-flow log-event` (deliberate, fallible **actions**), while the real **events** are emitted automatically by the 7 `.claude/hooks/lifecycle-*.sh` scripts the harness runs. The hooks also have a bespoke installer (`activity-hook.ts`: `BUNDLED_HOOKS_VERSION`, script copying, hand-rolled settings patching) that predates and now competes with the N92 emitter's managed manifest.
- Human decision (2026-06-11): the model-side contract should be a **module only** — no `AGENT_EVENTS.md` file, no `AGENT_` naming question; and the hooks should install through the N92 emitter.

## Goal

1. **`actions` section module replaces the `events` include + `AGENT_EVENTS.md`**: the body is the current file content (with the `<!-- taskflow:phase-markers:start/end -->` markers inside it), inlined into all 9 generated role files; the file is gone from repo root, templates, and init.
2. `phaseMarkers: false` opt-out still works in consumer projects — by stripping the marked block from each role file (patcher pattern, like `agents.extend`) instead of blanking a file.
3. **`activity/…` integration module group**: the 7 lifecycle hooks as `hook`-kind registry modules ("events = harness-observed telemetry"), browsable in the dashboard like any module.
4. **Hook installation through the N92 emitter** (managed manifest), with `activity-hook.ts`'s bespoke install path retired or reduced to a delegate; `hookStatus` detection becomes manifest-based.
5. Drift suite green throughout; emitter idempotency + cross-agent regression intact.

## Scope

### In scope

- `packages/taskflow/src/agents/modules/actions.json` (new section module, body = current `AGENT_EVENTS.md` incl. markers) — delete `modules/events.json`.
- `packages/taskflow/src/agents/composed/*.json` — all 9 swap `events` → `actions` (sequence position unchanged: last).
- The 9 root `*_ROLE.md` — regenerated via `prompt-build --compose --apply` (diff: trailing `@AGENT_EVENTS.md` line → inlined ACTIONS block).
- `AGENT_EVENTS.md` — delete from repo root; `templates/` via `sync-role-templates.mjs`; `init` stops scaffolding it.
- `packages/taskflow/src/agents/init/index.ts` — `stripPhaseMarkers` rewrites to strip the marked block from every role file in `rolesDir`; consumer-upgrade note for stale `@AGENT_EVENTS.md` includes (legacy file may remain harmlessly; document).
- `packages/taskflow/src/agents/modules/integrations/activity.json` (new) — hook-kind modules for `lifecycle-session-start|pre-tool|post-tool|agent-active|agent-idle|permission` + `taskflow-notify`. **Schema decision** (implementer, documented in code): hook modules carry their script content (like `skill` carries SKILL.md) and the emitter writes `.claude/hooks/<name>.sh` + the settings entry; or a sibling `script` kind. Executable-bit handling included.
- `packages/taskflow/src/agents/emit.ts` — extend as the schema decision requires (script file writer, chmod, managed in the per-agent manifest).
- `packages/taskflow/src/agents/activity-hook.ts` — retire the bespoke installer or delegate to the emitter; `detectActivityHookStatus` reads the managed manifest; `BUNDLED_HOOKS_VERSION` semantics move to module data (bump = content change, emitter sees `updated`).
- `packages/taskflow/src/dashboard/server/index.ts` — `hookStatus` wiring follows the new detection.
- Tests: `compose.test.mjs` (drift + actions module), `emit.test.mjs` (script writing, idempotency, cross-agent regression incl. activity group), init integration tests.

### Out of scope

- Renaming the other partials (`AGENT_ENFORCEMENT/PROTOCOL/SECURITY/NOTIFY/CONFIG.md` stay as includes).
- New telemetry event types or activity-engine behavior changes.
- Dashboard UI changes beyond what registry data already renders (N93 pages pick the new modules up automatically).
- The N93 branch's UI work (separate in-flight PR #69).

## Implementation plan

1. **Part A: `actions` module** — author `modules/actions.json` (kind section, no heading, body = exact current `AGENT_EVENTS.md` content incl. marker comments); delete `modules/events.json`; swap the id in all 9 composed defs; `compose-apply`; review the role-file diff (one block replaces one line, content otherwise identical); `sync-role-templates`; delete root `AGENT_EVENTS.md`.
2. **Init opt-out rework** — `stripPhaseMarkers(rolesDir)`: iterate `*.md` role files, remove the `taskflow:phase-markers` marked block (keep markers? remove block inclusive — decide and test); stop copying `AGENT_EVENTS.md` in scaffolding; keep tolerance for legacy consumer files.
3. **Part B schema** — extend the hook-kind module (or add fields) so a hook can ship its script: e.g. `script: { name, content }` alongside `command`; emitter writes `.claude/hooks/<name>` (0755) and tracks it in the per-agent manifest with removal support.
4. **Author `activity` group** — 7 hook modules with descriptions, script contents lifted from the bundled `.sh` sources, settings entries matching today's events/matchers; plus a composed-def-less group (installed via `--def` or a built-in `activity` agent? decide: simplest is documenting a project-local def; implementer picks and documents).
5. **Installer migration** — `activity-hook.ts`: install path calls the emitter (or is removed where init owned it); `detectActivityHookStatus` consults `.claude/taskflow-managed.json`; version bump semantics documented.
6. **Tests + live checks** — drift suite (role files regenerated deliberately this time — update committed MD together with JSON); emitter: script write/chmod/remove/idempotent/cross-agent; init integration tests updated for the changed scaffolding; playground end-to-end (install activity group, hooks fire, `phaseMarkers:false` strip works).

## Verification

- `pnpm build` + full suite green; `prompt-build --compose --apply` reports all 9 `unchanged` after the regenerated files are committed.
- Role-file diff contains exactly: `@AGENT_EVENTS.md` line removed, ACTIONS block (with markers) inlined — nothing else.
- Playground: activity hooks installed via emitter (settings entries + script files present, manifest bucketed), reapply all `unchanged`, removal cleans scripts + entries; `phaseMarkers: false` init strips the block from consumer role files.
- Grep proves no `AGENT_EVENTS` references remain in src/templates (legacy-tolerance code excepted).

## Notes

- Taxonomy result: **actions** = model-initiated reporting (inline section module); **events** = harness-observed telemetry (`activity/…` hook modules via emitter).
- Builds on N92's emitter (per-agent manifest) and is independent of N93's UI branch; **stacked on the N93 branch only for tracker lineage** — merge PR #69 first, then this.
- Gotcha: the inlined ACTIONS block ends each role file where `@AGENT_EVENTS.md` used to — watch the renderer's trailing-newline handling in the byte-diff.
- See `ANALYSIS.md` for the opt-out design constraint that shaped Part A.
