# N222 — New Project install options + composer-authoring flow install — Checklist

## Done criteria

- [ ] Flow→disk install path identified + documented (which function installs a built-in flow into a project dir)
- [ ] `initProject` accepts `activity?`, `lifecycle?`, `installFlows?: string[]` (plus existing `editor`, `registerHub`)
- [ ] `installFlows: ["composer-authoring"]` writes the authoring commands/roles into the project
- [ ] `POST /api/projects/create` parses + forwards `{ activity, lifecycle, editor, registerHub, installFlows }`
- [ ] Defaults unchanged when options omitted (back-compat with N221 create)
- [ ] Modal exposes: activity, lifecycle, editor select, register-to-hub, "Install composer-authoring flow" (with tokenless activity note)

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass (`npm test`)
- [ ] No regressions in affected area

## Verification

- [ ] Create with composer-authoring checked → project has authoring slash commands + default set
- [ ] Create with activity off / editor cursor → config + scaffold reflect choices
- [ ] New test: `initProject(... installFlows: ["composer-authoring"])` emits authoring commands
- [ ] New test: create-with-options honored
