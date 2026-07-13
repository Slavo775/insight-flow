# N221 — New Project in-app modal + server-side folder browser — Checklist

## Done criteria

- [x] `GET /api/fs/list?dir=` lists subdirectories, loopback-only, confined to `browseRoot()` (env `INSIGHT_FLOW_BROWSE_ROOT` → home)
- [x] Path escape (`../`, symlink) → 400 (realpath-based `realDirWithinRoot`)
- [x] `POST /api/projects/create` accepts `{ name, dir }`; creates `<dir>/<slug>` inside the root
- [x] `dir` outside the root → 400; existing project → 409 (unchanged)
- [x] Overview modal replaces `prompt()`/`alert()`: folder path, ⬆ up entry, dir list, name field, Create/Cancel
- [x] Inline success (path) + inline error via `#np-status` — no blocking dialogs
- [x] Modal styled to the existing dark theme (`.np-*` classes)
- [x] **Security add:** `/api/fs/list` + `/api/projects/create` refuse cross-site browser fetches (ACAO:* would otherwise leak the home listing / allow CSRF create) via `Sec-Fetch-Site`

## Quality gates

- [x] `npx tsc --noEmit` passes (`npm run typecheck`)
- [x] `npm run lint` passes (eslint clean)
- [x] Related tests pass (`npm test` → 344, +2 N221 tests)
- [x] No regressions in affected area

## Verification

- [x] "＋ New project" opens the modal (no prompt) — live: `np-overlay` served, `prompt(` gone
- [x] Create scaffolds at `<dir>/<slug>` — hermetic test (`initProject` runs, `taskflow.config.json` present)
- [x] `/api/fs/list?dir=<outside-root>` → 400 — live (`/etc`) + test (outside + traversal)
- [x] New test: fs-list confinement + create-under-chosen-dir + escape rejection + cross-site 403
