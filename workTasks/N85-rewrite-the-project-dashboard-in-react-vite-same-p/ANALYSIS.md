# N85 — Rewrite the project dashboard in React + Vite (same-port, read-only, parity) + markdown rendering of task files — Analysis

**Created:** 2026-06-09
**Author:** task-analyze

## Problem framing

The request began as "implement React for the dashboards, front + back on the same port." Analysis surfaced two corrections:
1. **"Same port" is already the architecture** — the project dashboard is one `node:http` server (port 6006) serving the UI at `/`, JSON at `/api/*`, and SSE at `/events`. Front/back are co-located, not coupled. So there was nothing to build there.
2. The user's "richer features" list (markdown viewer, drag-drop state changes, agent-module management, customizable role-gated workflows) was **five distinct items of wildly different size** — two of which (manual state changes, configurable workflows) would redefine insight-flow from an agent-driven, fixed, audited lifecycle into a Jira-like configurable board.

The real, defensible problem: `dashboard.ts` is a ~1,500-line server-rendered vanilla-JS string that's hard to maintain/extend, and there's no way to view the per-task generated docs in the UI.

## Goal

- Replace the `/` dashboard with a React + Vite SPA on the same port, at behavior parity, read-only, iframe-safe — establishing a maintainable foundation.
- Ship one genuine new feature now: pretty markdown rendering of task files.
- Keep the system agent-driven; defer the heavier/identity-changing features to their own tasks.

## Options considered

### Frontend stack
| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Modularize, no framework | Zero new runtime deps; uses existing esbuild/tsup; most aligned with N81–N84 lean arc | No vdom/components — richer UI stays manual; likely a 2nd migration later | S–M |
| B — Preact + Vite | ~3KB, JSX/hooks, `preact/compat` escape hatch; lean | Smaller ecosystem than React; still adds a build step | M |
| C — **React + Vite (chosen)** | Largest ecosystem + team familiarity; richest UI capability | ~45KB; biggest step away from the dependency-shedding arc; larger tarball | M–L |

### Scope / sequencing
- **Foundation-first (chosen)**: one task = React rewrite at parity + markdown viewer (read-only). Park drag-drop, agent-modules, and configurable workflows.
- All-at-once: rejected — couples a frontend rewrite with a core-domain redesign; unreviewable, multi-week.

### Product direction
- **Stay agent-driven (chosen)**: dashboard remains read/visualize-only; fixed audited lifecycle preserved.
- Go Jira-like (manual state changes + custom states + role-gated transitions): declined for now — a product-identity pivot that dwarfs the dashboard work; would need its own epic + analysis.

## Decision

- **Chosen: Option C (React + Vite), foundation-first, stay agent-driven.**
- **Rationale:** The user explicitly accepted React's added weight for team familiarity + richer-UI capability after seeing the tradeoffs. Foundation-first keeps the task reviewable and de-risks the build/serve/iframe/pack concerns before any heavier feature. Staying agent-driven preserves insight-flow's core identity and keeps the backend a clean, untouched contract (only a read-only markdown endpoint is added). Code evidence confirmed the boundaries: `TaskStatus` is a fixed 15-value `z.enum` (`schema/index.ts:3`, `types.ts:1`) validated on every storage op, and the dashboard has no task-write endpoints today (only `/api/agent-done`, `/api/agent-permission`, `/log/events`).

## Open questions

- `[non-blocking]` Markdown endpoint shape — `GET /api/work-tasks/:id/doc?name=…` vs a sub-path route. Either works; pick whichever is cleanest with the existing router + traversal guard.
- `[non-blocking]` Whether to introduce `react-router` — current dashboard is single-view with toggles; avoid a router unless porting reveals a real need.
- `[non-blocking]` `docs/architecture-diagrams.md` Diagram 2 may need a note since dashboard delivery changes (SPA vs server-rendered); update if the implement-agent's gates apply.
- `[non-blocking]` Migration is recommended incremental (shell + wiring first, then view-by-view, delete `dashboard.ts` generator last) rather than big-bang.

## Sources

None — discussion was self-contained (grounded in the repo: `dashboard/server/index.ts`, `dashboard.ts`, `core/schema/index.ts`, `core/types.ts`, `package.json`, `master/`).

## Handoff brief

> **Title:** Rewrite the project dashboard in React + Vite (same-port, read-only, parity) + markdown rendering of task files · **Type:** rework · **Priority:** medium
> Replace the server-rendered vanilla-JS dashboard (`dashboard.ts`, served at `/`) with a React + Vite SPA built into `dist/dashboard/` and served from the existing server on port 6006; achieve behavior parity (Kanban/timeline/detail/activity, live SSE, sounds, iframe-safe) and add pretty markdown rendering of each task's TASK/CHECKLIST/REVIEW/ANALYSIS.md via one new read-only endpoint. **Out of scope:** any UI writes/drag-drop, custom states, role-gated transitions, agent-module management, the master overview (6100), and the `/config` page. Stay agent-driven; backend stays read-only.
