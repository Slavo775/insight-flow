# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Insight Flow (taskflow.viz) is a single-page dashboard that visualizes AI agent task lifecycles — pipeline status, lifecycle timelines, fix-loop hotspots, and per-task review history. It reads task JSON data (master + shard files) and renders interactive charts and a Kanban board.

## Commands

```bash
pnpm dev          # Start dev server (Vite)
pnpm build        # Production build
pnpm build:dev    # Development build
pnpm preview      # Preview production build
pnpm lint         # ESLint
pnpm format       # Prettier (write mode)
```

Package manager: **pnpm** (lockfile present). Bun lockfile also exists but pnpm is primary.

## Architecture

**Stack**: TanStack Start (React 19 + TanStack Router + Vite), Tailwind CSS v4, shadcn/ui (new-york style), Zustand for state, Recharts for charts. Deploys to Cloudflare Workers via `@cloudflare/vite-plugin`.

**Vite config** uses `@lovable.dev/vite-tanstack-config` which bundles TanStack Start, React, Tailwind, tsconfig paths, and Cloudflare plugins. Do not add these plugins manually.

**Routing**: TanStack Router file-based routing. `src/routes/__root.tsx` is the root layout; `src/routes/index.tsx` is the only page (the dashboard). Route tree is auto-generated in `src/routeTree.gen.ts` — do not edit manually.

**State**: `src/lib/task-store.ts` — Zustand store with localStorage persistence (`task-viz-store` key). Holds the task array and metadata. Ships with sample data from `src/lib/sample-data.ts`; users can load their own JSON via the DataLoader component.

**Data model**: `src/lib/task-types.ts` defines `Task`, `Review`, `Incident`, `Push`, and related types. Tasks flow through statuses: ready → in-progress → implemented → reviewing → approved/fix-needed → pushed → merged. `KANBAN_COLUMNS` maps statuses to board columns.

**Components**:
- `src/components/ui/` — shadcn/ui primitives (do not edit directly; regenerate with `npx shadcn@latest add <component>`)
- `src/components/viz/` — dashboard visualization components (FilterBar, MetricsGrid, LifecycleTimeline, PipelineKanban, HotspotsCharts, TaskDetailSheet, DataLoader, CurrentJobBanner)

**Metrics**: `src/lib/task-metrics.ts` — `computeMetrics()` derives dashboard KPIs from the task array.

**Path alias**: `@/*` maps to `./src/*`.

## Code Style

- Prettier: 100 char width, double quotes, semicolons, trailing commas
- ESLint: typescript-eslint recommended + react-hooks + react-refresh + prettier integration
- `@typescript-eslint/no-unused-vars` is disabled
- TypeScript strict mode enabled

## Scripts

`scripts/task-tracker.mjs` — standalone Node script for task tracking (separate from the dashboard app).
