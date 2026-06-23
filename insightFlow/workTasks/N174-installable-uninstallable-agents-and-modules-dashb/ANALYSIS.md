# N174 — Analysis

## Problem framing

Before shipping v2 the human wants install to be finer-grained. Today "install" means **whole flow only**, dashboard-only (`/api/flow-install-plan` + `/api/flow-install`). There is no way to install a single agent or a single module, and no real **uninstall** — flows only carry N172 undo-snapshots for overwritten config, not removal of installed artifacts.

## Goal

Add dashboard-only **install** and **uninstall** for three targets — flow, agent, module — reusing the existing engine (`collectArtifacts` / `composeAgent` / `applyArtifacts`) and N165/N172 machinery, generalized from "flow" to "install target."

## Options considered

- **A. New bespoke install paths per target.** Rejected — duplicates the flow-install engine and the N165/N172 conflict/input/undo logic.
- **B. Generalize the existing flow engine to a `{ kind, id }` target abstraction (CHOSEN).** Lowest risk: the engine already collects artifacts per-agent and composes single-agent prompts; this is mostly new entry points + ownership bookkeeping, not new install logic.
- **C. Add a CLI surface too.** Deferred — human chose dashboard-only to match the existing flow UX and limit test surface.

## Decision

- Generalize install to targets `flow | agent | module`; keep flow wrappers for back-compat.
- Installable module kinds: `mcp-server`, `skill`, `hook` (+ `bundle` expands). Not installable (hidden/disabled): `section`, `include`, `status-transition`, `handover`.
- Agent install = compose prompt MD (command/skill per `command` config) + install its modules' artifacts, with `${VAR}` input prompting.
- **Ownership model:** per-target buckets in `.claude/taskflow-managed.json` (`flow:<id>`, `agent:<id>`, `module:<id>`), reference-safe — an artifact is physically removed only when its last owning target is uninstalled, restoring any N172 snapshot it overwrote.
- Uninstall is first-class for all three targets, **including flow** (which today only has undo).
- Dashboard only — mirror the flow endpoints with install/uninstall plan+apply routes.

## Open questions (resolved with human)

- Granularity → both per-agent and per-module. ✓
- "commands" wording → agents install as commands AND hook modules are standalone-installable. ✓
- Surface → dashboard only, no CLI. ✓
- Uninstall → in scope, as a button, including for flows. ✓
- Ownership → per-target buckets + reference-safe shared artifacts. ✓

## Sources

- `packages/taskflow/src/agents/flow-install.ts`, `emit.ts`, `compose.ts`, `user-registry.ts`
- `packages/taskflow/src/dashboard/server/index.ts` (flow-install API ~lines 779–927), `dashboard.ts`
- `packages/taskflow/src/core/schema/index.ts` (module/agent/project schemas)
- Prior work: N165 (`${VAR}` inputs + `InstallConflictError`), N172 (overwrite/undo snapshots), N138 (agent-as-command).

## Handoff brief

feat / high (v2 blocker) / tags: install, dashboard, agents, modules, v2. Add dashboard install+uninstall for flow/agent/module by generalizing the flow-install engine to a `{ kind, id }` target with reference-safe per-target ownership; reuse N165/N172. No CLI. See TASK.md for the step-by-step plan and CHECKLIST.md for done criteria.
