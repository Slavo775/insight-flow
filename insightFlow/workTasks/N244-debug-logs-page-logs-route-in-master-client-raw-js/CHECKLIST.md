# N244 — Debug logs page — /logs route in master client (raw JSON, project/type filter, pagination) — Checklist

## Done criteria

- [ ] `/logs` route added to the master React client + a header nav link
- [ ] `useLogs({project,type,page,pageSize})` hook fetching `GET /logs?…` (loading/error/empty handled)
- [ ] Project filter (name / master / all — options from `GET /api/hub/projects` + `master`)
- [ ] Type filter (error / warning / info / all)
- [ ] Pagination (prev/next + page size) driving the API query
- [ ] Each row shows type badge, timestamp, projectName, message, and `data` as pretty `<pre>` JSON; newest first
- [ ] New page included in the master vite build + served

## Quality gates

- [ ] `pnpm --dir packages/taskflow build` passes (master client bundle)
- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in the master overview / existing routes

## Verification

- [ ] `http://localhost:6100/logs` renders recent logs (newest first)
- [ ] Changing project/type filters updates the list via the API
- [ ] Prev/next paging fetches correct slices
- [ ] A real error (post-N243) appears on the page
