# N204 — Composer install v2 — one install+validate agent (install-first), edge-case checklist, rollback-on-failure

**Type:** feat
**Priority:** high
**Created:** 2026-07-08

## Problem

The composer (authoring) flow's tail is `authoring-test` → `authoring-install` → done. The tester validates definitions **before** install (compose/dry-run/throwaway smoke — largely duplicating the N203 reviewer), and the installer just installs and marks done. Nothing checks that the **real install** succeeded, the installer has no playbook for the issues that actually pop up during install, and installing flows / handling failures is under-specified. Since install is **reference-safe and reversible (uninstall)**, install-first-then-validate is both what the human wants and safe. See `ANALYSIS.md`.

## Goal

1. Merge `authoring-test` into **one** `authoring-install` agent that runs: **pre-flight plan → install → post-install validate → done**.
2. It installs **agents, modules, and flows** (composer MCP `install`) and validates the *real* install afterwards (artifacts present, references resolve, a smoke exercise).
3. A new **`composer-install-checklist`** section module codifies the install edge cases + the fix boundaries.
4. On validation failure → **rollback (uninstall)** + hand back to the implementer (`fix-needed`).
5. Any fix touching settings **unrelated to this task/flow** → **human approval first**.
6. On success → `done`. `authoring-test` is removed.

## Scope

### In scope

- `packages/taskflow/src/agents/modules/roles/authoring.json` — rewrite `authoring-install/identity` (plan → install → validate → done, dual concern); **remove** `authoring-test/identity`; add the `composer-install-checklist` section module.
- `packages/taskflow/src/agents/composed/authoring.json` — **delete** the `authoring-test` agent; `authoring-install` composes `composer-install-checklist` + the new `install→implement` fix handover; drop the `authoring-test/handover-install`.
- `packages/taskflow/src/agents/project/authoring.json` — remove `authoring-test` from `agents`; rewire the tail: `authoring-review --approved--> authoring-install`, `authoring-install --> done`, `authoring-install --fix-needed--> authoring-implement`; update description.
- `packages/taskflow/src/agents/modules/handovers-authoring.json` — remove `authoring-test/handover-install`; add `authoring-install/handover-fix` (→ implement, gated, on validation failure). (The review→test handover already became review→install via the flow edge; ensure the handover module points review's approved edge to install.)
- `website/docs/authoring/agents-and-subagents.md`, `walkthrough.md`, `index.md` — 5 agents; install-then-validate; the edge-case checklist; the failure/rollback path.
- `packages/taskflow/test/compose.test.mjs` — authoring agent-count floor `>= 6` → `>= 5`.
- Whatever minimal mechanism lets the installer set `fix-needed` on rollback (see Implementation plan step 5) — keep it composer-scoped.

### Out of scope

- The base product flow (`task-*`) — unchanged.
- Reworking the composer MCP install execution (`flow-install.ts`) itself — the installer *uses* the existing install/uninstall + structured errors; it does not change them.
- Reconciling already-installed composer flows in consumer projects (a re-install drops the stale `task-authoring-test` command).

## Implementation plan

1. **New `composer-install-checklist` section module** (`modules/roles/authoring.json`, `kind: section`, flat id `composer-install-checklist`). Body: the ordered install playbook + edge cases + boundaries:
   - Phases: **pre-flight plan** (compute the install plan; surface unknown-target / conflict / missing-secret before writing) → **install** (agents/modules/flows via composer MCP `install`) → **post-install validate** (the emitted artifacts exist: `.claude/commands/*`, `.claude/agents/*`, `.mcp.json` entries; references resolve; a trivial smoke run) → **done**.
   - Edge cases + handling: unknown target / not-installable → **definition bug → rollback + hand to implement**; `.mcp.json` conflict on an **unrelated** entry (one you did not author) → **stop, get human approval** before overwrite; missing `${VAR}` secret → tell the user to add it (dashboard install UI or `.insight-flow/secrets.local.json`) and retry; file already present → report, fix only if install-scoped.
   - Boundary: fix **installs, not definitions**; never change settings unrelated to this task/flow without human approval; record the installed `custom:` ids (audit + uninstall).
2. **Rewrite `authoring-install/identity`** to be the plan→install→validate→done agent, composing the checklist. Keep "record the installed ids" and the `done` terminal. Add the rollback→`fix-needed` path.
3. **Remove `authoring-test`** — delete `authoring-test/identity`, the composed agent, its flow-agent entry, and `authoring-test/handover-install`.
4. **Rewire the flow** (`project/authoring.json`): `authoring-review --approved--> authoring-install`; `authoring-install --> done`; `authoring-install --fix-needed--> authoring-implement`. Update the flow description.
5. **`fix-needed` on rollback** — give the installer a way to set `fix-needed` (e.g. a generic status-write command already available to agents, or a minimal verb). Prefer reusing an existing status-write path; keep it composer-scoped and don't alter base-flow behaviour. Document the chosen mechanism in the identity + checklist.
6. **Docs + test** — update the three authoring docs (5 agents, install-first, checklist, rollback) and the compose-test agent-count floor (6 → 5).

## Verification

- `pnpm --dir packages/taskflow run build` ✅ and `pnpm --dir packages/taskflow test` → all pass (agent floor 5).
- `composer-authoring` loads via the real loader: **5 agents** (no `authoring-test`), no dangling endpoints, valid path to `done`; edges `review --approved--> install`, `install --> done`, `install --fix-needed--> implement`.
- Rendered `authoring-install` shows the plan → install → validate → done phases, installs flows, and composes the `composer-install-checklist` (edge cases + human-approval boundary + rollback).
- No `authoring-test` / `task-authoring-test` left in `src` or docs.

## Notes

- Fifth in the composer-v2 series (N200 analyze, N201 taskmaster, N202 implementer builds+fixes, N203 review unified) → N204 install unified. Same merge-two-into-one pattern.
- Install is reversible (uninstall) — that's what makes install-first safe. The N203 reviewer already covers schema/compose, so the old pre-install dry-run was redundant; the new value is verifying the *real* install.
- This repo tracks its own tasks on the `default` flow (composer-authoring is a built-in shipped to consumers), so N204 is a normal source edit. Merge into `agents-approved`, like its siblings.
