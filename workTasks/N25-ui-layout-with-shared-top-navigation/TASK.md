# N25 — UI layout with shared top navigation

**Type:** feat
**Priority:** medium
**Created:** 2026-05-24

## Problem

The dashboard (`/`) and the overview page (`/overview`) are completely independent HTML pages with no shared layout. The `/` page has a `.top-bar` div with a title and a gear button but no navigation links. The `/overview` page is a bare iframe wrapper with zero chrome. There is no way to navigate between the two pages from within the UI.

## Goal

1. Introduce a shared top navigation bar that renders on every page served by the project server.
2. Nav shows: **project name** (context chip), **Home** link (`/`), **Overview** link (`/overview`).
3. Active page is visually highlighted.
4. Both the main dashboard (`/`) and the overview page (`/overview`) use the same nav markup and CSS — no duplication.
5. `pnpm typecheck` and `pnpm --dir packages/taskflow run build` both pass after the change.

## Scope

### In scope

- `packages/taskflow/src/server/dashboard.ts` — add `getNavHtml()` and `getNavCss()` helpers; weave `getNavHtml` into `getDashboardHtml`.
- `packages/taskflow/src/server/index.ts` — use `getNavHtml` / `getNavCss` when building the `/overview` iframe page.
- Nav CSS added to the `CSS` const in `dashboard.ts` and also exported via `getNavCss()` so `server/index.ts` can inline it without re-importing the full CSS block.

### Out of scope

- Master server UI (port 6100) — the nav sits outside the iframe, so the master's HTML is untouched.
- Any JS framework, bundler, or new file creation.
- Responsive / mobile breakpoints beyond what fits naturally.

## Implementation plan

1. **Add `getNavHtml` helper in `dashboard.ts`**
   - Signature: `export function getNavHtml(projectName: string, activePage: "home" | "overview"): string`
   - Renders `<nav class="top-nav">` containing:
     - Left: `<span class="nav-project">${projectName || "insight-flow"}</span>`
     - Right: `<div class="nav-links"><a href="/" class="nav-link${activePage === "home" ? " active" : ""}">Home</a><a href="/overview" class="nav-link${activePage === "overview" ? " active" : ""}">Overview</a></div>`

2. **Add `getNavCss` helper in `dashboard.ts`**
   - Returns a string of only the nav-related CSS rules (listed below).
   - The same rules are also appended to the `CSS` const so `getDashboardHtml` picks them up automatically.

3. **Nav CSS rules** (append to `CSS` const and return from `getNavCss`)
   ```
   .top-nav { position: sticky; top: -24px; z-index: 100; background: var(--surface); border-bottom: 1px solid var(--border); height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; margin: -24px -24px 24px -24px; }
   .nav-project { font-size: 13px; font-weight: 600; color: var(--text); letter-spacing: -0.01em; }
   .nav-links { display: flex; gap: 4px; }
   .nav-link { font-size: 13px; color: var(--text-muted); text-decoration: none; padding: 6px 12px; border-radius: 6px; transition: background 0.15s, color 0.15s; }
   .nav-link:hover { background: var(--border); color: var(--text); }
   .nav-link.active { background: var(--accent); color: #fff; }
   ```

4. **Wire nav into `getDashboardHtml`**
   - In the HTML return string, prepend `getNavHtml(projectName, "home")` immediately after `<body>\n` and before the existing `.top-bar` div. No other changes to the top-bar or layout.

5. **Update `/overview` route in `server/index.ts`**
   - Import `getNavHtml` and `getNavCss` from `"./dashboard.js"`.
   - Replace the bare `iframeHtml` string with one that:
     - Has `:root` CSS vars + `getNavCss()` inline in `<style>`
     - Renders `getNavHtml(config.projectName || "", "overview")` above the iframe
     - Sets iframe height to `calc(100vh - 48px)` (accounting for the 48 px nav)

## Verification

- `pnpm --dir packages/taskflow run build` passes (no TS errors).
- `pnpm typecheck` passes.
- `pnpm play` → open `http://localhost:6006/` — nav bar at top, project name left, Home (active/blue) + Overview right.
- Click Overview → `http://localhost:6006/overview` — same nav, Overview active, iframe fills the rest.
- Click Home → returns to dashboard, Home active again.
- Re-run `pnpm play` with `config.master.standalone = true` — `/overview` still returns 404 (nav code unreachable).

## Notes

- `top: -24px` on the sticky nav compensates for the `body { padding: 24px }` so the nav stays flush to the viewport edge when scrolled.
- `getNavCss()` is a pure string export — no side effects. `getDashboardHtml` uses the full `CSS` const which will contain the nav rules after step 3.
- Do not remove or change the existing `.top-bar` markup — the live-dot, project name subtitle, and settings gear button stay as-is on the Home page below the nav.
- Related: docs/architecture-diagrams.md Diagram 2 (server routes) does not need updating — no new routes, no iframe behaviour change.
