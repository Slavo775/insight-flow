# N221 — New Project in-app modal + server-side folder browser

**Type:** feat
**Priority:** medium
**Created:** 2026-07-11

## Problem

"New project" in the hub uses `window.prompt()` for the name and `window.alert()` for the result, and always scaffolds under the fixed `~/insight-flow-projects/<slug>` root (`projectsHomeRoot()`), so the user cannot choose where the project lives. The spec wants a proper in-app modal where the user selects the folder to init in.

## Goal

1. A real in-app modal replaces `prompt()`/`alert()` for creating a project.
2. The modal lets the user browse folders (server-side) under an allowed root and pick the parent directory for the new project.
3. `POST /api/projects/create` accepts the chosen parent directory and creates `<dir>/<slug>` there (still traversal-safe, localhost-only).
4. Clear in-modal success/error states (no blocking alerts).
5. Build, typecheck, and tests are green.

## Scope

### In scope

- `packages/taskflow/src/master/server.ts` — new localhost-only `GET /api/fs/list?dir=<abs>` that lists subdirectories under an allowed browse root (traversal-guarded); extend `POST /api/projects/create` to accept `{ name, dir }` where `dir` must resolve inside the allowed root; create `<dir>/<slug>`.
- `packages/taskflow/src/master/overview.ts` — replace `createProject()` prompt/alert with a modal: folder browser (breadcrumb + dir list + up), a name field, Create/Cancel, and inline status. Add modal CSS.
- Allowed-root definition — reuse/extend an env-configurable root (e.g. `INSIGHT_FLOW_PROJECTS_HOME`, or the user's home) as the browse ceiling; document it.
- Tests in `packages/taskflow/test/master-liveness.test.mjs`.

### Out of scope

- Install options (activity/lifecycle/editor/hub-register) and composer-flow install — that is N222 (this task creates with the current defaults, just at a chosen folder).
- Any change to `initProject` internals beyond the target directory.
- A native OS folder dialog (browsers can't return a server path); the server-side browser is the mechanism.

## Implementation plan

1. **Allowed browse root.** Define `browseRoot()` (env `INSIGHT_FLOW_BROWSE_ROOT` → default the user's home dir). All listing + creation must resolve to a path that `startsWith(browseRoot + sep)` (or equals it). Reject symlink escapes via `realpathSync` before the prefix check.
2. **`GET /api/fs/list` (server.ts).** Loopback-only (same gate as create/start). Query `dir` (default `browseRoot()`); validate within root; return `{ dir, parent, entries: [{ name, isDir: true }] }` — directories only, sorted, hidden dirs optional. 400 on escape.
3. **`POST /api/projects/create` (server.ts).** Accept `{ name, dir }`. Validate `name` (existing regex) and that `resolve(dir)` is within `browseRoot()`. Target = `resolve(dir, slug)`; keep the existing "already exists" 409 and `initProject(target, false, { yes: true })` call. Return `{ id, name, path }`.
4. **Modal (overview.ts).** Build a modal (hidden by default) with: current path breadcrumb, an "⬆ up" entry, the fetched directory list (click to descend), a project-name input, and Create/Cancel buttons. Wire `createProject()` to open it; fetch `/api/fs/list` on open + on each descend; on Create POST name+dir, show inline success (with the path + "Open" link to the new project) or inline error. No `alert`/`prompt`.
5. **Styling.** Add modal + overlay CSS consistent with the existing dark theme (`--surface`, `--border`, etc.).
6. **Tests.** `GET /api/fs/list` lists dirs and rejects a path outside the root (`../` escape → 400); `POST /api/projects/create` with a `dir` inside the root creates the project there; a `dir` outside the root → 400.

## Verification

- Open the hub → "＋ New project" opens the modal (no prompt).
- Browse into a folder under the allowed root, type a name, Create → project scaffolded at `<dir>/<slug>`, appears on the overview.
- `curl 'localhost:6100/api/fs/list?dir=<outside-root>'` → 400.
- `cd packages/taskflow && npx tsc --noEmit && npm test` green.

## Notes

- Security is the crux: the fs-list + create endpoints write/read the filesystem and the server binds all interfaces, so both must stay loopback-only AND confined to `browseRoot()` with realpath-based escape checks (mirror the N210/N212 SSRF/traversal guards).
- Depends on N219/N220 only loosely (shared overview file); can build on the current overview but should land after them to avoid churn.
