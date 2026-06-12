# N96 — Project layer — agent flow map + global install

**Type:** feat
**Priority:** medium
**Created:** 2026-06-11

## Problem

- The top of the atomic-design stack is missing: there is no **project layer** describing how agents relate (the lifecycle flow) and what a project installs globally. The flow exists only implicitly — scattered across the status state machine, the `next`/`next-review`/`next-fix` pickers, and prose handoffs inside role prompts — nobody can *see* it. Project-level installs got a stopgap in N94: `ACTIVITY_AGENT` is a pseudo-agent that is honestly project setup.

## Goal

1. `ProjectSchema`: `{ id, title, description, agents: [composed-agent ids], flow: [{ from, to, on }], install: [module-or-bundle ids] }` — `on` triggers are statuses/verdicts **validated against the real status enum** (renames break tests loudly, not diagrams silently).
2. Shipped `project/default.json` encoding the current canonical lifecycle: analyze → taskmaster → implement → review → (approved → human-review; fix-needed → review-fix → re-review) → merge/done, plus change-request and incident side-flows.
3. `install` absorbs the activity hooks: **`ACTIVITY_AGENT` dissolves**; `init` + `migrate-hooks` apply `project.install` via the N92 emitter (manifest bucket keyed by project id, adoption logic carries over so existing installs migrate without duplicates).
4. Read-only `/project` dashboard page (N93 `SideLayout` family): interactive React Flow map — agent nodes navigate to `/agent/:id`, edges labeled with their triggers, install modules in a side panel; `GET /api/project`.
5. Contract pinned in code + docs: **descriptive this iteration** (visualization/audit); prescriptive later.

## Scope

### In scope

- `packages/taskflow/src/core/schema/index.ts` — `ProjectSchema`; trigger values constrained to the existing status/verdict unions.
- `packages/taskflow/src/agents/project/default.json` (new) + loader in `compose.ts` or a sibling `project.ts` (Zod-validated; every referenced agent id must exist in `COMPOSED_AGENTS`, every install id in `MODULE_REGISTRY` — resolution via N95's bundle-aware `resolveModules`).
- `packages/taskflow/src/agents/compose.ts` — remove `ACTIVITY_AGENT`; `composed/activity.json` deleted (its module ids move to `project/default.json.install`).
- `packages/taskflow/src/agents/activity-hook.ts` — `installLifecycleHooks` delegate reads the default project's install (manifest bucket id = project id; one-time bucket migration `activity` → project id or keep the bucket id stable — implementer decides, documented).
- `packages/taskflow/src/agents/init/index.ts` + `cli/commands/migrate-hooks.ts` — consume `project.install`.
- `packages/taskflow/src/dashboard/server/index.ts` — `GET /api/project`.
- `packages/taskflow/src/dashboard/client/` — `ProjectPage.tsx` (SideLayout: sidebar = agents + install list), flow map via `CompositionMap` or a sibling `FlowMap.tsx` (labeled edges); nav link "Project".
- Tests: schema validation (bad trigger fails), referential integrity (unknown agent/install ids fail), install equivalence with pre-N96 behavior, emitter idempotency.

### Out of scope

- Prescriptive behavior: pickers/state machine reading from the flow (explicitly deferred iteration).
- Customization/editing UI for any layer; multiple/named projects; per-harness (cursor) targets — schema may reserve a field, no implementation.
- New integrations content; changes to statuses or verdicts themselves.

## Implementation plan

1. **Schema + data** — `ProjectSchema` with trigger enum reuse; author `default.json` (flow edges per the Goal-2 lifecycle incl. `changes-requested → task-implement(change mode)` and `task-incident` side-flow); loader with referential validation.
2. **Install migration** — delete `ACTIVITY_AGENT` + `composed/activity.json`; `installLifecycleHooks` applies `collectArtifacts({modules: project.install})` under the project's manifest bucket; verify adoption keeps existing playground installs duplicate-free (bucket rename handled or avoided).
3. **API + page** — `/api/project` (project def + resolved agent titles + install module summaries); `ProjectPage` with flow map (agents as nodes laid out by flow order; edge labels = `on` triggers; click-through) and install side panel (module links).
4. **Tests + docs** — listed above; README/code comments pin the descriptive-now/prescriptive-later contract.

## Verification

- `pnpm build` + full suite green; drift suite untouched.
- Playground `migrate-hooks`: hook groups unchanged in count, manifest coherent, second run idempotent (same bar as N94).
- `/project` renders the full lifecycle map; clicking `task-implement` lands on its agent page; install panel lists the activity modules (and accepts the `testing` bundle id if added).
- Schema test: an edge with `on: "approvedd"` fails validation.

## Notes

- Atomic design (human, 2026-06-11): modules = atoms, bundles (N95) = molecules, agents = organisms, **project = product**. Future iterations: customization at every layer; flow becomes prescriptive; cursor/claude per-harness targets.
- Depends on N95 (`install` resolution is bundle-aware). Implement after it.
- The N94 manifest bucket is named `activity` — decide migration vs. keeping the bucket id; either way existing consumers must not get duplicate hooks (adoption logic is the safety net).
