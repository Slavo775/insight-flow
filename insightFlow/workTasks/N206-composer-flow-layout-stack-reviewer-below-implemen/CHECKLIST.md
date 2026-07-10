# N206 — Composer flow layout — stack reviewer below implementer in the flow map — Checklist

## Done criteria — implementer subtasks

- [x] `project/authoring.json` has a `layout` object mapping each agent + `done` to `{x,y}`, with `authoring-review` at `{560,190}` (directly below `authoring-implement` at `{560,0}`) and the others in a row.
- [x] No change to `agents`, `flow` edges, `statuses`, `entryAgents`, or any prompt/module.

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes (JSON valid, flow loads)
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes (0 errors)
- [x] `pnpm --dir packages/taskflow test` passes

## Verification

- [x] Loader: `BUILTIN_PROJECTS["composer-authoring"].layout` present; `review.x === implement.x` and `review.y > implement.y`.
- [x] `agents` (5), `flow` edges, and `statuses` unchanged vs before.
- [x] (Manual) Dashboard flow map renders the Reviewer directly below the Implementer (matches the screenshot).
