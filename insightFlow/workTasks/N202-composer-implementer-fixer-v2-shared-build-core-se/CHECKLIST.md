# N202 — Composer implementer + fixer v2 — shared build core, self-contained context, checklist tracking, no-install guard — Checklist

> Reflects the **final** design (fixer removed, implementer builds + fixes). See `TASK.md` "Design evolution" and `REVIEW.md` for the round-by-round history.

## Done criteria

- [x] `authoring-build-core` section module (flat id) added to `modules/roles/authoring.json` — self-contained context (project-read not strictly banned; needing it = a bug), never-install guard, scope-lock (create + update custom things), small-change-via-direct-invocation allowance, follow-checklist-to-completion.
- [x] `authoring-implement/identity` is **dual-mode**: build (`implement-start/-end`, work the checklist) and fix (`fix-start/-end`, only review-flagged blockers, hand back to review); composes `authoring-build-core`.
- [x] Separate **Composer Fixer removed** — `authoring-fix` gone from the flow `agents`, `composed/authoring.json`, `authoring-fix/identity`, and `authoring-fix/handover-review`; no `authoring-fix` / `task-authoring-fix` left in `src`.
- [x] Composer flow routes `fix-needed` to the implementer — `authoring-review --fix-needed--> authoring-implement`, `authoring-human-review --fix-needed--> authoring-implement`, `authoring-implement --fixed--> authoring-review`; handover modules + reviewer/human-review identities updated to match.
- [x] `authoring-spec-structure.json` — "Implementer subtasks" is a `- [ ]` checkbox list written into `CHECKLIST.md`.
- [x] MCP-secrets guidance offers **both** paths (dashboard install UI **or** hand-edit `secrets.local.json`) in `composer-conventions.ts` (`COMPOSER_RULES`) and the `authoring-analyze` MCP-pass note.
- [x] `website/docs/authoring/agents-and-subagents.md` (7 agents, Fixer row dropped, Implementer builds+fixes) and `walkthrough.md` (review→fix loops back to implementer; secrets both-ways) updated.

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes (JSON valid, composes)
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes (pre-commit prettier + eslint clean)
- [x] `pnpm --dir packages/taskflow test` → 321 / 321 (compose-test agent-count floor updated 8 → 7)

## Verification

- [x] Rendered `authoring-implement` prompt includes `authoring-build-core`, documents build + fix modes, forbids installing, treats project-reading as a bug signal (not a hard ban), locks scope to create/update custom things, allows a direct small change without the taskmaster, and requires all checklist boxes ticked.
- [x] `composer-authoring` loads via the real loader: 7 agents, 11 edges, no dangling endpoints, valid path to `done`; both `fix-needed` edges target `authoring-implement`.
- [x] Rendered `authoring-analyze` shows the MCP-secrets "either way" (install UI + file) wording.
