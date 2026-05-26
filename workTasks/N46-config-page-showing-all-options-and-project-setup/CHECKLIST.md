# N46 — config page showing all options and project setup — Checklist

## Done criteria

- [ ] `/api/config` endpoint returns the full `TaskflowConfig` as JSON.
- [ ] `/config` route returns a full HTML page with all config sections rendered.
- [ ] Nav bar shows "Config" link; it has the `active` class when on `/config`.
- [ ] `activePage` type in `getNavHtml` includes `"config"`.
- [ ] Each config section is a styled card with key/value rows.
- [ ] Values matching built-in defaults render with the `.default` style (greyed).
- [ ] Values overriding defaults render with the `.custom` style (accent colour).
- [ ] `agents.extend` entries render as a code block per agent name.
- [ ] `agents.git.permissions` flags render as a sub-table.
- [ ] `getConfigPageHtml` is exported from `dashboard.ts` and imported in `index.ts`.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes (no TypeScript errors).
- [ ] No regressions on `/` (kanban) or `/overview` pages.

## Verification

- [ ] `pnpm play` → `http://localhost:6007/config` renders without errors; all sections visible.
- [ ] `curl http://localhost:6007/api/config` returns valid JSON matching `playground/taskflow.config.json`.
- [ ] Navigating Dashboard → Overview → Config cycles through all three nav links correctly.
