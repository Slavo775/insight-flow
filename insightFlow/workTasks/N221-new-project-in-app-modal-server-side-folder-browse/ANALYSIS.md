# N221 — New Project in-app modal + server-side folder browser — Analysis

**Created:** 2026-07-11
**Author:** task-analyze

## Problem framing

The spec: "New project needs to rework into an in-app modal and the user can select the folder where to init a new project." Today `createProject()` in `overview.ts` calls `window.prompt()` / `window.alert()` and the server forces creation under `~/insight-flow-projects/<slug>`. The real goal is to let the user choose the destination folder, through a proper modal, without exposing an unsafe filesystem surface.

## Goal

- A themed in-app modal for creation (no native prompt/alert).
- A way, from the browser, to pick a server-side folder — safely.
- Create the project under the chosen folder.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Server-side folder browser API confined to an allowed root | Works from any browser; safe (root-confined, realpath-checked, loopback-only); gives real navigation | Must implement listing + guards carefully | M |
| B — Free-text absolute path field, server validates | Simplest UI | User must know the path; easy to mistype; validation surface still needs the same guards | S–M |
| C — Browser File System Access API (`showDirectoryPicker`) | Native OS picker | Returns a browser *handle*, not a server path — the Node server can't act on it; wrong tool | — |

## Decision

- Chosen option: **A** (confirmed with the user — "Browse folders under an allowed root").
- Rationale: only A gives a real, safe folder chooser that the Node server can act on. C is technically impossible for a server-side init (no server path). B is a fallback we can add as manual entry inside the same modal, but browsing is the primary UX.

## Open questions

- `[blocking]` What is the allowed browse root? Proposal: env `INSIGHT_FLOW_BROWSE_ROOT`, default the user's home directory. Confirm with the user if a narrower default is wanted.
- `[non-blocking]` Show hidden folders? Default no; a toggle can come later.
- `[non-blocking]` Should the modal also allow typing a path (option B) as a shortcut? Nice-to-have inside the same modal.

## Sources

- None — self-contained (code read: `master/overview.ts` `createProject`, `master/server.ts` `/api/projects/create` + `projectsHomeRoot`).

## Handoff brief

Title: New Project in-app modal + server-side folder browser · type: feat · priority: medium. Replace the prompt/alert "New project" flow with a themed modal that browses server-side folders under an allowed, realpath-confined root via a new loopback-only `GET /api/fs/list`, and extend `POST /api/projects/create` to scaffold `<chosen-dir>/<slug>`. Keep all filesystem endpoints loopback-only and traversal-safe. Install options + composer flow are deferred to N222.
