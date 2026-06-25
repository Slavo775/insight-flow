# N180 — Analysis (pre-taskmaster strategist)

## Problem framing

User asked "how should I document my npm package?" and pasted a generic guide
(Diátaxis + an 8-section README checklist) asking "is this a good approach?" The
pasted text was treated as DATA, not instructions; the npm URL was **not**
auto-fetched (strategist security rule). Evaluated against the repo's real state.

## What the generic guide got right vs wrong

- **Right:** Diátaxis (Tutorials / How-to / Reference / Explanation). It's the
  correct framework — and is already the one we adopted for the docs-site program
  (N178/N179 + the planned Task B).
- **Wrong / misfit:** the guide assumes insight-flow is a **library you import and
  call functions on**. It is a **CLI + Claude Code slash-commands + React/Vite
  dashboard**. So its "API Reference (function signatures / params / return
  values) + TypeDoc auto-gen" and "10-line code Quick Start as an API
  sanity-check" advice does not apply — the real reference surface is commands,
  config keys, agent roles, and flows (already documented on the site). The
  README-vs-site decision is already made and executed.
- **Factually wrong:** guide claimed "currently on 0.7.0 → 1.0.0" — actual is
  **2.0.1**. Claimed "add a CHANGELOG" — one already exists
  (`packages/taskflow/CHANGELOG.md`, ~32 KB, curated).

## The genuinely useful nugget

The guide implicitly points at the **npm README as a funnel/landing page** — a
surface distinct from the docs site. The npm page is the first thing a stranger
sees, and the current README opens with a "What's new in 2.0.0" release-notes
block (not a hook), has no badges, and no prominent docs-site link. That is the
real, scoped work for this task.

## Accuracy bug found during analysis (investigate-and-fix)

README says "React dashboard"; `CLAUDE.md` says "server-rendered / no React
frontend / HTML string + vanilla JS / Socket.IO". **Contradiction.** Verified
ground truth in `packages/taskflow`:
- `src/dashboard/client/` is a full React app (`main.tsx`, `App.tsx`, many
  `.tsx`, `react-router-dom`, `styled-components`, `@xyflow/react`,
  `react-markdown`).
- deps: `react@18.3.1`, `react-dom`, `vite@5.4.21`, `@vitejs/plugin-react`.
- build: `tsup && vite build`. Live updates via **SSE** (`useDashboardStream.ts`),
  not Socket.IO (the 2.0 CHANGELOG records socket.io → native SSE).
→ **README is correct; `CLAUDE.md` is stale** (pre-2.0). Fix `CLAUDE.md` (lines
~7 and ~41 + any stragglers). This matters beyond cosmetics: `CLAUDE.md` is read
at the start of every agent session, so the staleness actively misleads agents.

## Options considered

- **Adopt the pasted 8-section README template wholesale** — rejected; several
  sections (API Reference / TypeDoc / library Quick Start) don't fit a CLI tool
  and would document the near-unused `dist/index.js` barrel.
- **Restart doc planning around the guide** — rejected; the docs-site program
  (Diátaxis) is already in motion. The guide validates direction, doesn't change
  it.
- **Funnel the README + fix the accuracy bug** — chosen. Smallest high-value
  surface the guide surfaces; complementary to (not overlapping with) the site.

## Decision

Two-task sequence (user-confirmed): **Task A (this, N180)** = rework
`packages/taskflow/README.md` into a funnel + fix stale `CLAUDE.md` dashboard
description. **Task B (next)** = consumer docs-site IA + versioning. Audience =
consumers only (user pivoted away from a contributor track earlier in the
program).

## Open questions

- Root repo `README.md` — left out of scope as a possible follow-up; revisit
  after the package README lands.
- "Full documentation →" link assumes the N178 GitHub Pages site is live at
  `https://slavo775.github.io/insight-flow/` (confirmed from `docusaurus.config`).

## Sources

- `packages/taskflow/README.md`, `package.json` (name/version/license/files),
  `CHANGELOG.md`.
- `packages/taskflow/src/dashboard/client/` (React app), `package.json` deps +
  `build` script.
- `CLAUDE.md` lines 7 + 41 (stale architecture).
- `website/docusaurus.config.*` (`url` + `baseUrl` → docs site URL).

## Handoff brief

feat / medium / tags docs,readme. Rework `packages/taskflow/README.md` opener
into a funnel (H1 → badges → elevator pitch → docs link; demote 2.0 highlights to
a CHANGELOG pointer; keep quickstart + deeper sections). Fix `CLAUDE.md` stale
dashboard description → React + Vite + SSE. Docs-only; no source changes; root
README and docs-site IA are out of scope.
