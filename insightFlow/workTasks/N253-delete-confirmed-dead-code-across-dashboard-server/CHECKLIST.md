# N253 — Delete confirmed dead code across dashboard-server, UI, agents, master — Checklist

## Done criteria

- [x] dashboard/server: `/api/session-events` + `/api/events?taskId=` endpoints removed (grep-confirmed zero consumers repo-wide; SSE stream is `/sse`, unaffected)
- [~] `/log/status` endpoint — **KEPT**: re-confirmation found a dedicated behavioral test (`test/log-events-endpoint.test.mjs`) + `dashboard-error-boundary.test.mjs` exercising it. Not dead; audit missed the test dir.
- [~] `validateReferences` export — **KEPT**: re-confirmation found 3 internal callers in `custom-defs.ts` AND `test/terminal-nodes.test.mjs` imports it via the barrel. Not dead; audit missed the test.
- [x] UI: `SEVERITY_CLASS` deleted; `statusTone` no longer exported (kept local to Badge, removed from barrel)
- [x] agents: `detectNotifyHookStatus` + `NotifyHookStatus` type deleted, plus now-orphaned privates (`hookFilePath`, `settingsRegistersHook`) and consts (`NOTIFY_HOOK_REL_PATH`, `SETTINGS_CANDIDATES`)
- [~] `flowInstallPlan`/`flowRequiredInputs` — **KEPT**: exported and used by 3 test files (`agent-command`, `inputs`, `compose`) exercising real flow behavior. Deleting = inlining `planFromArtifacts(flowArtifacts(x))` at every call — lateral churn, not a cleanup. Not dead.
- [x] master: `projectsHomeRoot` export + `"[::1]"` LOOPBACK entry removed (verified `new URL().hostname` strips brackets → SSRF guard unchanged)
- [x] orphaned `statSync` import removed from dashboard server
- [x] `git grep` for each deleted symbol returns zero hits

## Quality gates

- [x] `npx tsc --noEmit` passes
- [x] lint passes (eslint clean on all 6 changed files; prettier clean)
- [x] `pnpm --dir packages/taskflow test` passes (369/369)
- [x] No regressions in affected area

## Verification

- [x] build + full test suite green; removed endpoints have no consumer (grep-confirmed), so no client breakage
