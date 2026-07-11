# N221 — New Project in-app modal + server-side folder browser — Checklist

## Done criteria

- [ ] `GET /api/fs/list?dir=` lists subdirectories, loopback-only, confined to `browseRoot()`
- [ ] Path escape (`../`, symlink) → 400
- [ ] `POST /api/projects/create` accepts `{ name, dir }`; creates `<dir>/<slug>` inside the root
- [ ] `dir` outside the root → 400; existing project → 409 (unchanged)
- [ ] Overview modal replaces `prompt()`/`alert()`: breadcrumb, up entry, dir list, name field, Create/Cancel
- [ ] Inline success (path + Open link) and inline error — no blocking dialogs
- [ ] Modal styled to the existing dark theme

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass (`npm test`)
- [ ] No regressions in affected area

## Verification

- [ ] "＋ New project" opens the modal (no prompt)
- [ ] Browse → name → Create scaffolds at `<dir>/<slug>` and it appears on the overview
- [ ] `curl 'localhost:6100/api/fs/list?dir=<outside-root>'` → 400
- [ ] New test: fs-list confinement + create-under-chosen-dir + escape rejection
