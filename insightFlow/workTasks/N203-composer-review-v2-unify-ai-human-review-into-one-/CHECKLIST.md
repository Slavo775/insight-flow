# N203 — Composer review v2 — unify AI + human review into one dual-mode agent + consolidated requirements — Checklist

## Done criteria — implementer subtasks (tick each as built)

- [x] `COMPOSER_RULES` (`composer-conventions.ts`) states all 8 requirements once — adds *minimal module* and *no name collision*, sharpens *guarded small adjustments* (own `custom:` + unreferenced + behaviour-preserving).
- [x] `authoring-review/identity` rewritten as dual-mode: AI mode (fan out to the 4 reviewer subagents, verify each requirement, `review-start/-end --type ai`, write REVIEW.md from template) and human mode (record feedback, `review-start/-end --type human`, write REVIEW.md); intent = human-feedback presence, with the "prior AI review required for human mode" guard.
- [x] `authoring-human-review/identity` removed; `recorder-discipline` + the `→ test` handover folded onto `authoring-review`.
- [x] `authoring-analyze/identity` and `authoring-implement/identity` deduped — restated custom-only/reuse/locked rules removed (method steps kept); rules still render via `composer-authoring-conventions`.
- [x] `composed/authoring.json` — `authoring-human-review` agent deleted; `authoring-review` composes `recorder-discipline` + the 4 reviewer subagents.
- [x] `project/authoring.json` — `authoring-human-review` removed from `agents`; edges: `implement --implemented|fixed--> review`, `review --fix-needed--> implement`, `review --approved--> test`; flow description updated.
- [x] `handovers-authoring.json` — `authoring-review/handover-test` added; `authoring-human-review/*` handovers removed.
- [x] `website/docs/authoring/agents-and-subagents.md` + `walkthrough.md` — one review agent (AI + human), the requirements list, 6 agents.

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes (JSON valid, composes)
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes (0 errors)
- [x] `pnpm --dir packages/taskflow test` passes (agent-count floor 7 → 6)

## Verification

- [x] `composer-authoring` loads via the real loader: 6 agents (no `authoring-human-review`), no dangling edges, valid path to `done`; `review --approved--> test` and both `fix-needed`→implement edges present.
- [x] Rendered `authoring-review` shows both AI and human modes + the intent rule + explicit requirements verification.
- [x] The 8 requirements appear once (in `COMPOSER_RULES`); `authoring-analyze`/`authoring-implement` render them via the conventions module but no longer restate them in their own bodies.
- [x] No `authoring-human-review` / `task-authoring-human-review` left in `src` or docs.
