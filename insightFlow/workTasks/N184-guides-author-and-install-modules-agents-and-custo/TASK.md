# N184 — Guides: author and install modules, agents, and custom flows

**Type:** feat
**Priority:** medium
**Created:** 2026-06-25

## Problem

- The `guides/` section (created in N181) is a stub listing planned recipes. Users have no problem-oriented, copy-pasteable how-tos for the things they most need to do: wire PR creation, add quality gates, author custom modules/agents/flows, and run/undo the install engine. Concepts (N182) explains the model; this fills the *how*.

## Goal

1. Fill `website/docs/guides/` with task-focused recipes (replace the stub list).
2. Cover the everyday config recipes (PR host wiring, quality gates) and the composition-v2 authoring + install workflows.
3. Each guide is a short, copy-pasteable walkthrough that assumes the basics.

## Scope

### In scope

- Author guide pages under `website/docs/guides/` (expand the N181 landing). Suggested pages:
  1. `wire-pr-creation.md` — set `agents.extend.task-git` for `gh`/`glab` (or prefill URL); ground in `PR_API.md` + `agents.extend` (config.ts).
  2. `quality-gates.md` — make `/task-implement` + `/task-review-fix` run typecheck/lint/test via `agents.extend`.
  3. `custom-module.md` — author a `custom:<slug>` module (kinds: section/include/mcp-server/hook/skill/bundle); user-space registry (`src/agents/user-registry.ts`); validation rules.
  4. `custom-agent.md` — compose a custom agent from module ids (`agents.custom` / user registry); generate its role file via `prompt-build --compose`.
  5. `custom-flow.md` — define a custom flow (agents + edges + statuses + entryAgents), bind task types with `flows.byType` / `set-default-flow`.
  6. `install-engine.md` — install/uninstall modules from a flow: the install plan, `${VAR}` inputs (`core/inputs.ts`), the `.claude/taskflow-managed.json` manifest, and undo/rollback (N172).
  7. `multi-project-master.md` — run `insight-flow master`, register projects, view the overview.
  8. `upgrade-1x-to-2.md` — migrate layout (`migrate-layout`) + composition v2 (mirror the README/CHANGELOG upgrade notes).
- Each guide: numbered steps, real commands, expected output. Ground in source/config; link to Concepts (N182) for the *why* and Reference (N183) for the inventory.
- Update `guides/_category_.json` / `guides/index.md` to list the real pages.

### Out of scope

- The conceptual model (N182) and the default inventory (N183) — link, don't re-explain.
- The dashboard UI guide (N185).
- Any source-code change (these are docs; the recipes invoke existing CLI/config).
- Net-new features — document existing behavior only.

## Implementation plan

1. **Confirm each workflow against source/CLI**: `agents.extend` (config.ts), `user-registry.ts`, `prompt-build --compose`, `flow-install.ts` + `agents/emit.ts` (install/undo), `core/inputs.ts` (`${VAR}`), `set-default-flow`/`set-flow`, `migrate-layout`, `master`.
2. **Write the config recipes** (`wire-pr-creation`, `quality-gates`) — smallest, highest-use.
3. **Write the authoring recipes** (`custom-module`, `custom-agent`, `custom-flow`).
4. **Write the engine/ops recipes** (`install-engine`, `multi-project-master`, `upgrade-1x-to-2`).
5. **Update the Guides landing** to link the real pages; cross-link Concepts + Reference.
6. **Build** — `pnpm --dir website build` clean; verify every command shown matches actual CLI flags.

## Verification

- `pnpm --dir website build` passes with zero broken-link/anchor warnings.
- Each recipe's commands match real CLI flags / config keys (spot-check against `cli.ts` + `config.ts`).
- Guides landing lists the real pages; Concepts/Reference cross-links resolve.
- `npx prettier --check` passes on new files.

## Notes

- Program order: N181 ✅ → N182 (Concepts) → N183 (Reference) → **N184 (Guides, this)** → N185 (Dashboard).
- Depends conceptually on N182 (link "why") and N183 (link inventory), but can be written in parallel if needed.
- Keep recipes technology-agnostic where insight-flow is (the PR/quality-gate examples are user-supplied `agents.extend`, per the project's agnosticism rule).
