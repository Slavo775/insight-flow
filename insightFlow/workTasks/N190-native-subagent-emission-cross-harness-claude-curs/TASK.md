# N190 — Native subagent emission (cross-harness: Claude + Cursor)

**Type:** feat
**Priority:** high
**Created:** 2026-06-25

## Problem

insight-flow emits skills, commands, hooks, and MCP servers, but **cannot author native subagents** (`.claude/agents/*.md`, `.cursor/agents/*.md`). It already *observes* subagent activity (the `subagent-start`/`subagent-done` events) but can't *produce* subagents. This blocks the fan-out / rejoin / orchestrator patterns (N191) — the only way to get parallelism + an automatic join in insight-flow's single-task-token model.

## Goal

1. Make a **subagent** a first-class composer definition (new `subagent` module kind).
2. **Emit it cross-harness**: `.claude/agents/<name>.md` and `.cursor/agents/<name>.md`, dialect-translated.
3. Wire it through emit / install / uninstall (reference-safe), the composer registry + dashboard, and the composer MCP — so subagents install/uninstall and are authorable exactly like other artifacts.

## Scope

### In scope

- **Schema (`core/schema/index.ts`):** new `AgentModuleSchema` variant `kind: "subagent"` with: `name` (safe path segment), `description` (drives auto-delegation), `content` (system prompt), and optional restriction/model metadata — `tools?: string[]` (Claude allowlist), `readonly?: boolean` + `is_background?: boolean` (Cursor), `model?: string` (default `inherit`). Vendor-neutral fields the emitter translates per harness.
- **Artifacts (`agents/compose.ts`):** add `subagents` to `AgentArtifacts`; `collectArtifacts` emits a subagent's artifact (bundle-aware). Add `"subagent"` to `INSTALLABLE_MODULE_KINDS` (`agents/flow-install.ts`).
- **Emitter (`agents/emit.ts`):** `applySubagents` writes `.claude/agents/<name>.md` (frontmatter `name`/`description`/`tools`/`model`) and `.cursor/agents/<name>.md` (frontmatter `name`/`description`/`readonly`/`is_background`/`model`), per the project's editor target (like skills). Manifest-bucket ownership, idempotent, reference-safe uninstall; add a subagent branch to `uninstallPlan`/`uninstallTarget`.
- **Install plan (`flow-install.ts`):** `planFromArtifacts` includes subagent steps.
- **Composer surfacing:** subagent kind appears in `list`/`get` (dashboard `/api/modules`, composer MCP); create/update/install/uninstall ride the existing N188 machinery (custom-defs + executeInstall) with no new logic.
- **Editor targets:** honor `claude`/`cursor`/`both` like `init` does for skills/commands (Cursor also reads `.claude/agents` for compat, but emit per-editor for correct frontmatter dialect).

### Out of scope

- Orchestrator declaration + fan-out prompt (N191).
- Rewiring built-in agents (N192).
- Flow-level joins / dependency-gating / subtasks / any workflow-execution engine (explicitly rejected — the only join we need is the automatic subagent-parent return).

## Implementation plan

1. **Schema** — add the `subagent` discriminated-union variant + field validation (safe `name`, neutral metadata).
2. **Artifacts** — extend `AgentArtifacts` with `subagents[]`; emit from `collectArtifacts`; mark kind installable.
3. **Emitter** — `applySubagents` (per-editor dialect) + manifest ownership; extend uninstall plan/exec; keep idempotent + reference-safe (mirror `applySkills`).
4. **Install plan** — surface subagent steps in `planFromArtifacts`.
5. **Composer/MCP/dashboard** — confirm list/get/create/install/uninstall/delete handle the new kind through the existing paths; add a dashboard form for it.
6. **Tests** — emit/uninstall round-trip for both editors; reference-safety; composer MCP create+install of a `custom:` subagent.

## Verification

- Author a `custom:` subagent module; install an agent/flow that bundles it → `.claude/agents/<name>.md` and/or `.cursor/agents/<name>.md` written with correct per-harness frontmatter; re-install idempotent; uninstall reference-safe.
- Composer MCP `list/get/create_module/install` work for the subagent kind.
- `pnpm --dir packages/taskflow test`, `tsc`, `lint`, `pnpm build` green.

## Notes

- **Decision pinned:** subagent is a **module kind** (composable, installable, reference-safe) — not just an `as:"subagent"` self-install — so an orchestrator (N191) can declare and bundle a set of them.
- Cursor docs (user-provided) confirm `.cursor/agents/*.md` (+ `.claude/agents/`/`.codex/agents/` compat); frontmatter dialects differ (Claude `tools[]`; Cursor `readonly`/`is_background`; model namespaces differ, `inherit` portable). Verify field-level specifics at implementation.
- Foundation for N191 (orchestrator) and N192 (showcase). Synergistic with the composer MCP (N188) — could land on the `feat/composer-mcp` base branch.
- Full decision trail: this folder's `ANALYSIS.md`.
