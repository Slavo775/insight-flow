# N86 — Frontend foundation — styled-components theme + shared component library + Zustand store — Analysis

**Created:** 2026-06-10
**Author:** task-analyze

## Problem framing

The request bundled three asks on top of the N85 dashboard: install Zustand + a global store (esp. agent status), define a project theme (gaps, radii, typography, colors), and build shared primitives (Button, Kanban card, typography). Grounding in the code showed these are well-motivated: a color theme already exists as CSS vars, but the palette is **duplicated** as hardcoded hex in `lib.ts`/`activity.ts` (no single source of truth); there's **no** spacing/radius/typography scale (inline literals); there are **no** generic primitives (buttons/badges are repeated raw markup); and agent/connection/config state flows via the `useDashboardStream` hook + props. So the real goal is a **frontend foundation**: token source-of-truth + reusable components + centralized global state — not net-new features.

## Goal

- One typed theme (colors/space/radius/typography) as the single source of truth; JS color helpers read tokens.
- A small shared component library, adopted across the dashboard.
- A Zustand store for genuinely-global state, removing prop-drilling.
- Strictly behavior-preserving (≈identical look; light polish only).

## Options considered

### Styling system
| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Extend CSS vars + TS token mirror *(strategist rec.)* | leanest, no new dep, lowest churn, keeps N85's CSS | not a "real" component-lib styling model; inline styles remain | S–M |
| B — **styled-components (CHOSEN)** | typed theme object + ThemeProvider; component-scoped; ergonomic variant props for a primitive lib | ~12–15KB runtime; rewrite N85's `styles.css` → styled | M–L |
| C — Tailwind | tokens = config; Vite plugin; utilities | rewrite CSS → utilities (largest churn); new build model | M–L |
| D — vanilla-extract | zero-runtime, fully typed | smaller ecosystem; `.css.ts` rewrite | M |

### Scope
- **One cohesive task (CHOSEN)** — theme + components + store together.
- Split (design-system, then store) *(strategist rec.)* — two smaller reviewable PRs.

### Visual bar
- Identical refactor *(strategist rec.)* vs **refactor + light polish (CHOSEN)** vs open redesign.

## Decision

- **Chosen: Option B (styled-components), one cohesive task, refactor + light polish, branched off `main` (N85 merged).**
- **Rationale:** Owner preference for a typed CSS-in-JS theme object + component-scoped variants outweighed the leaner extend-CSS-vars path; styled-components is the canonical choice with `DefaultTheme` typing. One task was chosen for cohesion despite the larger PR. The strategist flagged the leaner alternatives and the split, and the owner decided with the tradeoffs (added dep/runtime, CSS rewrite) explicit.

## Open questions

- `[non-blocking]` styled-components vs emotion — defaulted to styled-components; owner can swap.
- `[non-blocking]` Vitest + RTL client tests — recommended and included as a droppable sub-item; implementer notes if skipped.
- `[blocking-ish]` **No visual-regression test exists.** The CSS→styled rewrite must preserve parity by careful manual checking; consider it the main risk.
- `[non-blocking]` Store breadth — board data (tasks/shards) included in the store; keep view-local state (popover/tab) local to avoid over-globalizing.

## Sources

None — discussion was self-contained (grounded in the repo: `src/dashboard/client/{styles.css,lib.ts,activity.ts,App.tsx,ui.tsx,DetailPanel.tsx,ActivityFeed.tsx,useDashboardStream.ts}`).

## Handoff brief

> **Title:** Frontend foundation — styled-components theme + shared component library + Zustand store · **Type:** rework · **Priority:** medium
> On the N85 React dashboard, introduce a typed styled-components theme (colors/space/radii/typography as the single source of truth, replacing duplicated hex in `lib.ts`/`activity.ts`), a shared component library (Button/Badge/Card/Text/Section/Chip) adopted across the client, and a Zustand store for global state (agent + connection status, config snapshot, board data) — refactoring `useDashboardStream` to write into it. Strictly behavior-preserving (light polish allowed); no new features; dashboard stays read-only/agent-driven; master overview + `/config` untouched.
