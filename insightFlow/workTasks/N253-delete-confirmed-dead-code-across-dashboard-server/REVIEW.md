# N253 — Delete confirmed dead code across dashboard-server, UI, agents, master — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-20
**PR:** (no PR yet — reviewed working tree)
**Verdict:** approved

## Summary

Pure-deletion task. Every removed symbol was independently re-confirmed unreferenced by both correctness and security review. No behavior change, no dangling references. The implementer correctly reclassified three audit "dead" claims as live (`/log/status`, `validateReferences`, `flowInstallPlan`/`flowRequiredInputs`) and left them.

## Checklist verification

- [x] dashboard/server: `/api/events` + `/api/session-events` removed; `/log/status` correctly KEPT (test-covered) — pass
- [x] `validateReferences` correctly KEPT (used internally + by test) — pass
- [x] UI: `SEVERITY_CLASS` deleted; `statusTone` un-exported (only used inside Badge.tsx) — pass
- [x] agents: `detectNotifyHookStatus` + `NotifyHookStatus` + orphaned helpers/consts deleted — pass
- [x] `flowInstallPlan`/`flowRequiredInputs` correctly KEPT (test-used) — pass
- [x] master: `projectsHomeRoot` + `"[::1]"` LOOPBACK entry removed — pass
- [x] orphaned `statSync` import removed — pass

## Non-blocking

None.

## Security & edge cases

- **SSRF guard (`"[::1]"` removal):** safe — all three `isLoopbackHost` callers pass `new URL(...).hostname`, which normalizes `[::1]`→`::1`, so the bracketed literal was unreachable and its removal changes nothing for real requests. Verified.
- **Dead-endpoint removal:** no auth/trust boundary depended on `/api/events` or `/api/session-events`; `MASTER_LOCK_DIR` still used elsewhere. No regression.

## Notes

Clean. Ready to merge. Related: [N254], [N255], [N256].
