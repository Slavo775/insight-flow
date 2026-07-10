# N210 — Global home base — project-less dashboard, create-project from UI (non-coder onboarding)

**Type:** feat
**Priority:** high

## Problem

insight-flow can't be used globally by a non-coder. The dashboard **hard-exits** when there's no project (`dashboard/server/index.ts:501`). The **master** (`~/.insight-flow`, :6100) is a global overview hub but read-only — no way to **create** or **open** a project from the UI. So `npm i -g insight-flow` → run → use is impossible without a terminal + manual `init`. See `ANALYSIS.md`.

## Goal

1. **Home base**: the master serves a home page that lists projects + a **"New project"** action.
2. **Create from UI**: "New project" validates a folder/name and calls `initProject` (no terminal), then opens that project's dashboard.
3. **Open**: launch/link any registered project's dashboard from the home base.
4. **Global entry**: bare `insight-flow` in a non-project dir opens the home base instead of erroring.
5. Docs: the zero-to-dashboard non-coder path.

## Scope

### In scope
- `packages/taskflow/src/master/server.ts` — new endpoints: `POST /api/projects/create` (validate path/name → `initProject` → register), and a way to **open** a project (spawn `insight-flow ui` for it + return its URL, or a tracked launch). Localhost-only; path validation.
- `packages/taskflow/src/master/overview.ts` (+ client) — the home UI: project list + "New project" form + "Open" buttons.
- `packages/taskflow/src/cli/cli.ts` — bare `insight-flow` (or a `home` command) in a non-project dir opens the home base; when inside a project, keep launching the project dashboard.
- `packages/taskflow/src/dashboard/server/index.ts` — optionally, instead of `process.exit(1)` on no-project, redirect/point to the home base (decide with the cli entry).
- Docs: getting-started (global install → home → create → work).

### Out of scope
- A desktop app wrapper (future).
- Cursor-specific concerns.
- Composer-first init (N209) and `install-flow` (N208, shipped).

## Implementation plan

1. **Decide + implement folder selection** (see ANALYSIS open questions): recommend a configurable **projects-home root** (default e.g. `~/insight-flow-projects`) + a project name; the master creates `<root>/<name>` and validates it stays inside the root.
2. **`POST /api/projects/create`** on the master: validate name/path → `mkdir` → `initProject(dir, ...)` → register the new project → return its id/path.
3. **Open/launch**: master spawns `insight-flow ui` for the chosen project (allocate a free port, track the child, return the URL), or deep-links if the user runs it. Track lifecycle so re-open reuses a running instance.
4. **Home UI** (`overview.ts` + client): projects list, "New project" form, "Open" per project; wire to the new APIs over the existing SSE.
5. **Global entry** in `cli.ts`: if no project is found up-tree, launch the master home base (start it if needed) instead of erroring; inside a project, unchanged.
6. **Security**: bind to localhost; reject paths outside the projects root; no arbitrary FS writes.
7. **Docs + tests**: getting-started non-coder path; tests for the create-project endpoint (validation + init) and the global-entry routing.

## Verification

- `insight-flow` in an empty/non-project dir opens the **home base** (no crash).
- Home page lists projects; "New project" creates + inits a folder and opens its dashboard.
- "Open" launches/links an existing project's dashboard.
- Create-project rejects paths outside the projects root; localhost-only.
- Build + full test suite green.

## Notes

- This is the "C" from the init review — the non-coder / global onboarding, deliberately kept **separate** from the init changes (N207 shipped; N208 shipped `install-flow`; N209 = composer-first init). Big feature; **decide the folder-selection + launch mechanics before building** (ANALYSIS open questions). Merge into `agents-approved`.
