# N183 — Reference: default inventory (modules, agents, default flow, master server)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-25

## Problem

- There is no **reference** for what insight-flow ships: which modules exist (by kind), which agents are built in, what the default flow looks like, and how the master server is configured. The Concepts pages (N182) explain the *model*; this task documents the concrete *inventory*.

## Goal

1. A Reference page listing the **default modules** by kind (the ~80 shipped modules + their ids).
2. A Reference page listing the **10 default agents** (which modules each composes, what each does).
3. A Reference page describing the **default flow** (10 agents / 13 edges / 15 statuses / entry agents / install list).
4. A Reference page for the **master server** (config, endpoints, what it aggregates).
5. Fold in the small **`sync-docs.mjs` reference-position fix** flagged in N181 so the Reference category can sit last in the sidebar.

## Scope

### In scope

- New reference pages. Placement: a `reference-data/` (or `inventory/`) group under the consumer Reference area, OR pages added beside `cli/`/`configuration.md` — pick what orders cleanly with the N181 IA (Concepts links here). Suggested pages:
  1. `default-modules.md` — table of shipped modules grouped by kind: cross-cutting baseline (`security`/`enforcement`/`protocol`, locked), global singletons (`config`, `notify`, `actions`, `minimal-diff`, `scope-guard`, `recorder-discipline`), the `activity` integration bundle (6 hooks + bundle), `testing/*`, `langfuse/*`, role-specific modules, and the 12 `handover` modules. Note locked vs ejectable.
  2. `default-agents.md` — the 10 composed agents (`taskmaster`, `task-analyze`, `task-implement`, `task-review`, `task-review-fix`, `task-human-review`, `task-git`, `task-incident`, `task-request-changes`, `taskmaster-change`): one-line role + the modules each is composed from + artifacts (mcp/hooks/skills/commands).
  3. `default-flow.md` — the default project flow: agents, the 13 edges (from→to, on, mode), 15 statuses, entry agents (`task-analyze`, `taskmaster`), install list (`activity`). (May cross-link the existing `flow/` pages rather than duplicate the lifecycle prose.)
  4. `master-server.md` — `src/master/`: config (`master.*` keys + `~/.insight-flow/master.json`, port 6100), endpoints (`GET /events` SSE, `POST /api/register`, `GET /`), the in-memory project registry, and `ClaudeProjectStatus` states.
- **`packages/taskflow/scripts/sync-docs.mjs`**: change the synced Reference category `position` (currently `6`, line ~121) to a value that places it **last** in the N181 sidebar order (e.g. `9`). Re-run `pnpm --dir website sync` and confirm the generated `reference/_category_.json` updates and the sidebar reads Get Started → Guides → Concepts → CLI → Configuration → … → Reference last.
- Ground every list against source: `src/agents/modules/` (the .json registries), `src/agents/composed/`, `src/agents/project/default.json`, `src/master/`.

### Out of scope

- The conceptual *model* (N182) — link to it, don't re-explain.
- How-to authoring/installing (N184) and the dashboard (N185).
- Auto-generating these tables from the registry (manual for now; note the source files for future drift).
- Relocating the synced `reference/` **folder** (only its category `position` integer changes).

## Implementation plan

1. **Inventory from source.** Enumerate modules from `src/agents/modules/**/*.json` (group by kind), agents from `src/agents/composed/*.json`, the flow from `src/agents/project/default.json`, and master endpoints from `src/master/server.ts` + `master/config.ts`.
2. **Write the four reference pages** with accurate tables (id · kind · locked? · what it does).
3. **Fix `sync-docs.mjs`** reference category position → last; run `pnpm --dir website sync`; verify `reference/_category_.json` regenerated with the new position.
4. **Wire placement** — `_category_.json` / `sidebar_position` so the new pages sit in the Reference area and Concepts (N182) links resolve.
5. **Build** — `pnpm --dir website build` clean; confirm sidebar order ends with Reference.

## Verification

- `pnpm --dir website build` passes with zero broken-link/anchor warnings.
- `pnpm sync` regenerates `reference/_category_.json` at the new (last) position; sidebar order ends with **Reference**.
- Spot-check inventory counts against source: 10 agents, locked ids (3), the `activity` bundle's 6 hooks, default flow entry agents.
- `npx prettier --check` passes on new files; `sync-docs.mjs` change is the only code edit.

## Notes

- Program order: N181 ✅ → N182 (Concepts) → **N183 (Reference inventory, this)** → N184 (Guides) → N185 (Dashboard).
- This task **resolves the N181 deviation**: the Reference category was pinned at `position: 6` by `sync-docs.mjs`; moving it last here completes the intended sidebar order.
- Grounded counts (from analysis): ~80 modules across registries; 8 kinds; 10 agents; default flow 10 agents/13 edges/15 statuses; master endpoints `GET /events`, `POST /api/register`, `GET /`.
