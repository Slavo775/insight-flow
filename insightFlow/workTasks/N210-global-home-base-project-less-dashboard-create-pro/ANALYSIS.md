# N210 — Global home base — project-less dashboard, create-project from UI (non-coder onboarding) — Analysis

**Created:** 2026-07-10
**Author:** task-analyze

## Problem framing

insight-flow can't be used **globally / by a non-coder** today. Spike C proved it: launching the dashboard in a directory with no project **hard-exits** — `dashboard/server/index.ts:501`: `"Work directory not found — Run 'taskflow init' first."`. So `npm i -g insight-flow` → `insight-flow` in a non-project folder **errors**. A UX designer / manager can't go install → open → use; they still need a terminal, a folder, and manual `insight-flow init`.

There *is* a foundation: the **master** server (`~/.insight-flow`, port 6100) is already a **global, multi-project overview** — projects register with it (`POST /api/register`) and it serves `/overview`. But it's read-only: no way to **create** a project or **open/launch** one's dashboard from the UI.

Root cause: the two servers are (a) per-project dashboard that requires an init'd project, and (b) a global master that only *observes*. Nothing lets a non-coder create/enter a project from a UI.

## Goal

1. A **global home base**: `insight-flow` (or a `home`/global mode) works with **no project** — it opens the master's home page instead of erroring.
2. The home page **lists your projects** (already registered) and offers **"New project"** → picks/confirms a folder → runs `initProject` for you (no terminal) → opens that project's dashboard.
3. **Open** any existing project → launches/links its dashboard.
4. Docs: the zero-to-dashboard non-coder path.

## Mechanics (verified in code)

- **Project dashboard** (`startServer`, `dashboard/server/index.ts`) **exits** when `workDir` is missing (L500-503).
- **Master** (`master/server.ts`) serves `/overview`, `POST /api/register`, `POST /api/projects/:id/update|status`, SSE `/events` — a global hub at `~/.insight-flow`. **No create-project / init / launch endpoint.**
- **`initProject(cwd, force, opts)`** (`agents/init/index.ts`) is the programmatic init — the home base can call it to scaffold a chosen folder.
- The CLI bin is global-installable (`bin: insight-flow`); `insight-flow master` runs the hub.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — extend the **master** into a home base (create-project API + home UI + open/launch project dashboards) | Builds on the existing global surface; one hub for everything; fits the architecture | Master gains write ops (init a folder) + needs to spawn/track per-project dashboards | Medium-High |
| B — make the **project dashboard** handle "no project" (empty-state onboarding + create-project) | Reuses the rich dashboard UI | Conflates per-project + global; every dashboard would carry global concerns | Medium |
| C — desktop app wrapper (Electron) | Best non-coder UX (double-click app) | Large new surface, packaging, updates | High |

## Decision

- **Chosen option: A — the master as home base** (aligns with the human's "use it globally" framing and the earlier design discussion).
- Rationale: the master is *already* the global, multi-project surface; extending it (create/open) is the smallest step to "install globally → run → create/work" without conflating the per-project dashboard. Reversible and incremental.

## Open questions

- `[blocking]` **Folder selection in a browser.** A web UI can't freely pick a filesystem path. Options: a text input for an absolute path the master validates + creates; a constrained "projects home" root (e.g. `~/insight-flow-projects/<name>`); or the OS file dialog only if we later wrap in a desktop shell. Decide the safe default (recommend: a configurable projects-home root + name).
- `[blocking]` **Launching a project dashboard from the home base.** Does the master **spawn** `insight-flow ui` for the chosen project (child process + port allocation + lifecycle), or just **deep-link** to a dashboard the user starts? Recommend: master spawns + tracks (it already tracks registrations).
- `[non-blocking]` **Global entry.** Should bare `insight-flow` in a non-project dir open the home base (vs. today's error)? Likely yes, behind detection (no `taskflow.config.json` found up-tree).
- `[non-blocking]` **Security.** The create-project API writes to disk from a local UI — bind to localhost only; validate paths; never traverse outside the projects root.

## Sources

- None — self-contained. Grounded in: `dashboard/server/index.ts` (no-project exit), `master/server.ts` (overview/register/no-create), `agents/init/index.ts` (`initProject`), `cli/cli.ts` (`ui`/`master` entry). Plus the earlier Spike C result.

## Handoff brief

Title: *Global home base — project-less dashboard, create-project from UI (non-coder onboarding)*. Type: feat. Priority: high. Tags: dashboard, master, onboarding, ux. Scope: Extend the master (`~/.insight-flow`, :6100) into a home base so a non-coder can install globally, run `insight-flow`, and — with no pre-existing project — see their projects, **create a new one from the UI** (master calls `initProject` on a chosen/validated folder), and **open** it (master launches/links its dashboard). Make bare `insight-flow` in a non-project dir open the home base instead of erroring. Localhost-only; validate paths. Big feature — decide the folder-selection + dashboard-launch mechanics first. Merge into `agents-approved`.
