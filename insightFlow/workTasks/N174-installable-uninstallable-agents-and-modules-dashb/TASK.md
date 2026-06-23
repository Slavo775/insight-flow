# N174 — Installable & uninstallable agents and modules (dashboard)

**Type:** feat
**Priority:** high
**Created:** 2026-06-23

## Problem

Today only whole **flows** can be installed, and only from the dashboard (`GET /api/flow-install-plan` + `POST /api/flow-install`). There is no way to install a single **agent** (compose its prompt + pull in only what it needs) or a single artifact-bearing **module**. There is also no real **uninstall** for any target — flows only have N172 undo-snapshots for overwritten config, not removal of installed artifacts. v2 needs finer-grained, reversible install actions.

## Goal

1. Per-agent install from the dashboard: compose the agent's prompt MD (command or skill per its `command` config) **and** install all artifacts its modules require, prompting for `${VAR}` inputs.
2. Per-module install from the dashboard for artifact-bearing kinds only (`mcp-server`, `skill`, `hook`; `bundle` expands); non-installable kinds hidden/disabled.
3. First-class **uninstall** for all three targets (flow, agent, module), reference-safe via per-target ownership.
4. Reuse the existing engine (collectArtifacts / composeAgent / applyArtifacts) and N165/N172 machinery — generalized from "flow" to "install target."

## Scope

### In scope

- **Generalize install engine** in `packages/taskflow/src/agents/flow-install.ts` from flow-only to a target abstraction `{ kind: "flow" | "agent" | "module", id }`:
  - Plan derivation (`flowInstallPlan` → `installPlan(target)`) and artifact collection (`flowArtifacts` → `targetArtifacts(target)`).
  - Agent target: `collectArtifacts(agentDef)` + `composeAgent(agentDef)` → command/skill artifact (honor `command.install` / `command.as`).
  - Module target: emit the single module's artifact; `bundle` expands; reject `section`/`include`/`status-transition`/`handover`.
- **Ownership model** in `packages/taskflow/src/agents/emit.ts` + `.claude/taskflow-managed.json`:
  - Per-target buckets keyed `flow:<id>` / `agent:<id>` / `module:<id>` (replaces today's per-agent/per-flow bucketing).
  - Reference-safe: each artifact records its owning targets; on uninstall, drop the claim and physically remove the artifact (and restore any N172 snapshot it overwrote) **only when the last owner is gone**.
- **Uninstall** path in `emit.ts`: `uninstallTarget(target, projectRoot)` + plan helper that reports what would be removed vs retained (still owned).
- **HTTP API** in `packages/taskflow/src/dashboard/server/index.ts` (mirror flow endpoints ~lines 779–927):
  - `GET /api/install-plan?kind=&id=` and `POST /api/install` (with `values`, `force`).
  - `GET /api/uninstall-plan?kind=&id=` and `POST /api/uninstall`.
  - Reuse `flowRequiredInputs` → `requiredInputs(target)`, `InstallConflictError` (409), and SSE `install-progress` / new `uninstall-progress`.
- **Dashboard UI** in `packages/taskflow/src/dashboard/server/dashboard.ts`: Install + Uninstall buttons on agent and module views (and an Uninstall button on the flow view); reuse the existing install-plan/inputs modal; hide install on non-installable module kinds.

### Out of scope

- Any CLI subcommands — dashboard only.
- New module kinds or schema changes beyond bucket-format migration.
- Changing the existing flow **install** behavior/UX (only adding flow **uninstall**).

## Implementation plan

1. **Introduce the install-target abstraction** in `flow-install.ts`: a `Target = { kind, id }` plus `targetArtifacts(target, registry)` and `installPlan(target)` that dispatch on kind. Keep `flowArtifacts`/`flowInstallPlan` as thin wrappers for back-compat.
2. **Agent target**: resolve the composed agent, run `composeAgent` + `withFlowIdentity`/identity stamping, and add the resulting command/skill to the collected artifacts (respect `command.install` / `command.as`); gather MCP/skill/hook artifacts from its modules.
3. **Module target**: look up the module; if `bundle`, expand; if `mcp-server`/`skill`/`hook`, emit its single artifact; otherwise throw a clear "not installable" error.
4. **Ownership refactor** in `emit.ts`: change `.claude/taskflow-managed.json` to per-target buckets with reference counting; update `applyArtifacts` to record owners; write a small migration for existing manifests (map old flow/agent buckets to new keys).
5. **Uninstall**: implement `uninstallTarget` + `uninstallPlan` — decrement owners, remove only orphaned artifacts, restore N172 snapshots for removed MCP entries; leave still-owned artifacts in place.
6. **API endpoints**: add install/uninstall plan + apply routes generalized over `kind`, reusing input-required scanning, conflict handling, and SSE progress.
7. **Dashboard UI**: add Install/Uninstall buttons + wire to new endpoints on agent/module/flow views; disable/hide install for non-installable module kinds; surface conflict + required-input modals.
8. **Tests**: extend `packages/taskflow` node:test coverage for target dispatch, reference-safe uninstall (shared artifact retained until last owner), and manifest migration.

## Verification

- `pnpm --dir packages/taskflow run build` and `npx tsc --noEmit` pass.
- `pnpm --dir packages/taskflow test` passes, including new ownership/uninstall cases.
- Manual (dashboard via `pnpm play`):
  - Install an agent → prompt MD + its MCP/skill/hook artifacts appear; re-install is idempotent.
  - Install a single `mcp-server` module → `.mcp.json` updated; `section` module shows no install action.
  - Install a flow, then a standalone agent sharing an artifact → uninstalling the agent **retains** the shared artifact (still owned by the flow); uninstalling the flow too removes it and restores any overwritten config.

## Notes

- Built from `/task-analyze`; see `ANALYSIS.md` in this folder for options/decisions.
- Reuses N165 (`${VAR}` inputs + `InstallConflictError`) and N172 (overwrite/undo snapshots).
- Key files: `packages/taskflow/src/agents/flow-install.ts`, `emit.ts`, `compose.ts`, `user-registry.ts`; `packages/taskflow/src/dashboard/server/index.ts` (~779–927) and `dashboard.ts`.
- Module installable kinds: `mcp-server`, `skill`, `hook` (+ `bundle` expands). Non-installable: `section`, `include`, `status-transition`, `handover`.
