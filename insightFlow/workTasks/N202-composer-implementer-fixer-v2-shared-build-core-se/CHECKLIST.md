# N202 — Composer implementer + fixer v2 — shared build core, self-contained context, checklist tracking, no-install guard — Checklist

## Done criteria

- [x] `authoring-build/core` section module added to `modules/roles/authoring.json` (self-contained context, no-install guard, scope-lock, small-adjustment allowance, spec+checklist obligation).
- [x] `authoring-implement/identity` trimmed to role-specifics; "Do NOT install" line moved to the core; adds "follow checklist, finish with all boxes ticked".
- [x] `authoring-fix/identity` trimmed to role-specifics and relies on the shared core.
- [x] `authoring-build/core` added to the `modules` list of both `authoring-implement` and `authoring-fix` in `composed/authoring.json` (right after the identity module).
- [x] `authoring-spec-structure.json` — "Implementer subtasks" now specifies a markdown checkbox (`- [x]`) list the implementer ticks off.
- [x] `website/docs/authoring/agents-and-subagents.md` (Implementer + Fixer rows) and `walkthrough.md` updated to describe the shared core, guards, and checklist tracking.

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes (JSON valid, composes)
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes (pre-commit prettier + eslint clean)
- [x] No regressions in the other `authoring-*` agents (still compose)

## Verification

- [x] Rendered `authoring-implement` prompt includes the `authoring-build/core` section and forbids installing + reading the project, locks scope, allows small edits, and requires all checklist boxes ticked.
- [x] Rendered `authoring-fix` prompt includes the same `authoring-build/core` section.
- [x] `grep -c "authoring-build/core" composed/authoring.json` returns 2.
