# N101 — insightFlow layout — ecosystem sweep (init, hooks, master, docs)

**Type:** rework
**Priority:** high
**Created:** 2026-06-12

## Problem

- After N99/N100 the runtime understands both layouts, but everything that *generates* or *documents* paths still says `workTasks/`: init scaffolding, hook commands, templates, README, CLAUDE.md, master-server docs. New projects should be born on the `insightFlow/` layout and this repo should eat its own dogfood.

## Goal

1. `insight-flow init` scaffolds the `insightFlow/` layout for new projects.
2. Hook scripts/commands (`agents/`, cursor + claude) and `prompt-build` output reference paths via the resolver, not literals.
3. Templates (`packages/taskflow/templates/`), README, CLAUDE.md, role files updated to the new layout with a migration note pointing at `migrate-layout`.
4. This repo and `playground/` are migrated as the working proof.

## Scope

### In scope

- `packages/taskflow/src/agents/init/` scaffolding + `cli/commands/` init/prompt-build path emission.
- `packages/taskflow/templates/` (task + roles), `README.md`, `CLAUDE.md`, `TASK_*_ROLE.md` path references.
- Run `migrate-layout` on this repo + playground; commit the moved tree.
- Master server docs/registration examples.

### Out of scope

- Any new features. Renaming the `insight-flow` binary or config keys.
- Removing the legacy fallback (stays for at least one release; deprecation note only).

## Implementation plan

1. **Init path** — scaffold `insightFlow/workTasks/` + `insightFlow/events/`; verify fresh `init` → `create` → `list` round-trip in a temp dir.
2. **Hooks** — audit `agents/*-hook.ts` + generated hook JSON for hardcoded paths; route through resolver.
3. **Docs/templates sweep** — `grep -rn workTasks README.md CLAUDE.md TASK_*.md packages/taskflow/templates/` and update; keep one explicit legacy-compat paragraph.
4. **Dogfood** — migrate this repo + playground; run the full test suite + `pnpm play` smoke.

## Verification

- Fresh `insight-flow init` in temp dir produces `insightFlow/` layout and a green create/list/ui smoke.
- This repo: `ls insightFlow/workTasks` shows all N00–N112 folders; dashboard + hooks still live-update.
- `grep -rn workTasks` over docs/templates yields only the intentional compat note.

## Notes

- Depends on N99 + N100. The repo migration commit should be separate from the code changes for reviewability.
- `sync-role-templates.mjs` must keep root role files and templates in sync after the path edits.
