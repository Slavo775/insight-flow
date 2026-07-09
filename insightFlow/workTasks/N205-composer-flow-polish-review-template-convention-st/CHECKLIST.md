# N205 — Composer flow polish — review-template convention, status display names, hooks in install validation — Checklist

## Done criteria — implementer subtasks (tick each as built)

- [x] **A** — `COMPOSER_RULES` (`composer-conventions.ts`) has a "reviewers are templated by default" bullet: a custom review agent writes `REVIEW.md` from the shared template (parallel to the taskmaster rule).
- [x] **B** — `project/authoring.json`: `ready`.title = "ready to implement", `approved`.title = "ready to install"; **all ids unchanged**; other statuses untouched.
- [x] **C** — `composer-install-checklist` validate step includes **hooks** and requires artifacts **present and correct** (agent `.md` created, hook installed & correct, command installed & correct, `.mcp.json` entries resolve); mirrored in `authoring-install/identity` if it restates the list.
- [x] Docs (`website/docs/authoring/*`) kept in sync where they list validation artifacts or status labels.

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes (JSON valid, composes)
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes (0 errors)
- [x] `pnpm --dir packages/taskflow test` passes

## Verification

- [x] Rendered `authoring-create`/`authoring-review` include the reviewers-templated convention (via `composer-authoring-conventions`).
- [x] Loader: `composer-authoring` `ready`.title === "ready to implement", `approved`.title === "ready to install"; ids still `ready`/`approved`; 5 agents unchanged; no id renames.
- [x] Rendered `authoring-install` validate step names hooks and says "installed and correct".
