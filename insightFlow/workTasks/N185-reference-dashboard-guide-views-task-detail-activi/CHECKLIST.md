# N185 — Reference: dashboard guide (views, task detail, activity feed) + screenshots — Checklist

## Done criteria

- [ ] Dashboard guide covers all views: Kanban/Overview, Task detail, Agents browser, Modules browser, Flow/Project editor, Activity feed.
- [ ] Each view section explains what it's for and includes a screenshot.
- [ ] Screenshots saved under `website/static/img/dashboard/` and embedded.
- [ ] At least one hero screenshot added to `get-started/overview.md` (and/or Getting Started).
- [ ] Cross-links to Concepts (N182) for the Agents/Modules/Flow model.
- [ ] View names/descriptions match `src/dashboard/client/` (App.tsx routes).
- [ ] No dashboard source-code change; screenshots use the playground (no real-project data).
- [ ] Model / inventory / how-to NOT duplicated (out of scope).

## Quality gates

- [ ] `pnpm --dir website build` passes, zero broken-link/anchor/image warnings.
- [ ] Images render in the built guide + Overview.
- [ ] `npx prettier --check` passes on new markdown.

## Verification

- [ ] Open the built site: dashboard guide renders with screenshots; Overview shows the hero image.
- [ ] Each documented view exists in the running dashboard (`insight-flow ui` / `pnpm play`).
