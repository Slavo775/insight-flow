# N46 — config page showing all options and project setup

**Type:** feat
**Priority:** medium
**Created:** 2026-05-26

## Problem

There is no way to inspect the active `taskflow.config.json` from the dashboard. Users must open the raw JSON file to understand what is configured or to verify defaults are in effect. A visual Config page would surface all options, their current values, and what each setting does — all in one place.

## Goal

1. Add a `/config` route to the dashboard server that renders a styled Config page.
2. The page lists every `TaskflowConfig` section (General, Server, Activity Engine, Agents, Notifications, Master, Events) as a card with key → value rows.
3. Values are highlighted as "default" (greyed) when they equal the built-in default, or "custom" (accent colour) when overridden.
4. The nav bar gains a "Config" link (alongside Dashboard and Overview).
5. A `/api/config` endpoint exposes the raw config as JSON for reuse.

## Scope

### In scope

- `packages/taskflow/src/server/dashboard.ts` — `getNavHtml()` type update + new `getConfigPageHtml()` function.
- `packages/taskflow/src/server/index.ts` — `/config` route handler + `/api/config` endpoint.
- CSS added inline in `dashboard.ts` (same pattern as `NAV_CSS`, `KANBAN_CSS`, etc.).

### Out of scope

- Editing config values from the UI.
- Validating the config against the Zod schema in the browser.
- Changes to the CLI commands or storage layer.

## Implementation plan

1. **Add `/api/config` endpoint** (`packages/taskflow/src/server/index.ts`, near the `/api/activity` handler ~line 467)
   - Respond with `JSON.stringify(config, null, 2)` and `Content-Type: application/json`.

2. **Extend `activePage` union** (`dashboard.ts` line 241)
   - Change `"home" | "overview"` to `"home" | "overview" | "config"`.
   - Add `<a href="/config" class="nav-link...">Config</a>` after the Overview link.

3. **Add `CONFIG_CSS` constant** (`dashboard.ts`)
   - Style `.config-page`, `.config-section`, `.config-section h2`, `.config-row`, `.config-key`, `.config-val`, `.config-val.default`, `.config-val.custom`, `.config-badge`.

4. **Add `getConfigPageHtml(config: TaskflowConfig): string`** (`dashboard.ts`)
   - Define `DEFAULTS` object mirroring `TaskflowConfig` defaults (workDir `"workTasks"`, shardSize `10`, port `6006`, activityEngine enabled/logFile/maxEvents, etc.).
   - Build one `<section class="config-section">` per top-level key group: General, Server, Activity Engine, Agents Git Permissions, Notifications, Master, Events.
   - Each row: `<div class="config-row"><span class="config-key">key</span><span class="config-val [default|custom]">value</span></div>`.
   - Nested objects (e.g. `agents.git.permissions`) render as a sub-table inside the Agents section.
   - `agents.extend` entries render as a code block per agent name.

5. **Add `/config` route** (`index.ts`, alongside the `/overview` block ~line 400)
   - Return `getConfigPageHtml(config)` wrapped in the same full-page shell used by other pages (doctype, head, nav, body).

6. **Export `getConfigPageHtml`** from `dashboard.ts` and import it in `index.ts`.

## Verification

- `pnpm --dir packages/taskflow run build` passes with no TypeScript errors.
- `pnpm play` — open `http://localhost:6007/config` — page renders with all sections from `playground/taskflow.config.json`.
- Custom values (e.g. `port: 6007`) appear in accent colour; unchanged defaults appear greyed.
- Nav "Config" link is active/highlighted when on the config page.
- `GET http://localhost:6007/api/config` returns the raw JSON.

## Notes

- `getNavHtml` is exported from `dashboard.ts` and called in `index.ts` — follow the same pattern for `getConfigPageHtml`.
- The `CONFIG_CSS` constant should follow the same style as `NAV_CSS` / `KANBAN_CSS` (template literal, indented rules).
- Do **not** expose secrets (there are none in `TaskflowConfig`) but keep it in mind for future keys.
