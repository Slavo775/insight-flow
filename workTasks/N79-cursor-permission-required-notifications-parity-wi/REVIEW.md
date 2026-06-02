# N79 — Cursor permission-required notifications parity with Claude Done shortcut plus hook coverage — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-02
**PR:** (no PR yet)
**Verdict:** approved (see Round 2)

## Summary

N79 correctly closes the Done vs permission asymmetry for Cursor: `POST /api/agent-permission` mirrors `/api/agent-done`, the approval gate curls it after `approval-required`, and `hooks.json` adds `preToolUse` + `beforeMCPExecution` gates. Tests cover the new endpoint and hook generation; Claude gains a harmless `PermissionRequest` → `awaiting-permission` mapping. **One runtime bug** when `notifications.browser` is `false` must be fixed before approval.

## Checklist verification

- [x] `POST /api/agent-permission` exists; respects `notifications.browser` on emit — pass (`server/index.ts`)
- [x] Dashboard `agent-permission` → `Permission required` toast — pass (when `browserNotifications` enabled)
- [x] Approval script curls `/api/agent-permission` — pass (`cursor-hooks.ts`, `.cursor/hooks/insight-flow-approval.sh`)
- [x] `preToolUse` + `beforeMCPExecution` in `hooks.json` — pass
- [x] Matchers: shell patterns + Shell-like tools + all MCP; still `ask` not `deny` — pass
- [x] `approval-required` still POSTs via `hook` — pass
- [x] stdout only permission JSON — pass (`>/dev/null 2>&1` on hook)
- [x] README updated — pass
- [x] Build + tests — pass (`pnpm --dir packages/taskflow test`)
- [x] `/api/agent-done` + stop hook unchanged — pass (diff scope)
- [ ] Manual verification items — pending human (expected)

## Blockers

1. **`firePermissionAlert` undefined when `notifications.browser === false`** — `packages/taskflow/src/server/dashboard.ts` (~1029–1030)

   `firePermissionAlert` is declared inside the `browserNotifications ? \`...\`` block (~933–939), but `sock.on('status')` always calls it on `to === 'awaiting-permission'` (~1030), which is outside that block.

   **Why:** Projects with `"notifications": { "browser": false }` will throw `ReferenceError: firePermissionAlert is not defined` on the first permission status transition (Claude or Cursor).

   **Fix:** Hoist `lastPermissionAlertAt` + `firePermissionAlert` into the always-emitted script (or branch: `playStatusSound('permission-needed')` when browser off, `firePermissionAlert()` when on). Keep `sock.on('agent-permission')` behind the browser flag only.

## Non-blocking

1. **`beforeMCPExecution` gates every MCP call** — intentional per spec (“conservative”), but users may get frequent `ask` + toasts. Document tuning in README or follow-up config hook for matchers.

2. **`preToolUse` Shell matcher** — any tool named `Shell` / `run_terminal_cmd` triggers `ask`, not only destructive commands. Acceptable for v1; may feel noisy vs `beforeShellExecution` precision.

3. **No automated test for `notifications.browser: false` + status → `awaiting-permission`** — add once blocker is fixed.

4. **CHANGELOG** — not updated; fine if release is a separate task.

5. **Existing consumers** — need `insight-flow init --editor cursor --force` to pick up hooks; README mentions behavior but not the force step explicitly.

## Security & edge cases

- `/api/agent-permission` is unauthenticated localhost-only (same as `/api/agent-done`) — acceptable, consistent.
- Approval gate never returns `deny` — matches non-regression requirement.
- Debounce (2s) on `firePermissionAlert` prevents double toast when both socket + status fire — good.

## Notes

- Stderr redirect fix (`2>&1` vs `2>/dev/null`) on approval hook is correct for surfacing real errors without polluting stdout.
- Manual checklist items remain for human sign-off after blocker fix.
- Related: N77 (Cursor hooks), N72 (Done wording).


---

## Round 2 — re-review after fix

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-02
**Verdict:** approved

### Summary

Round-1 blocker resolved: `firePermissionAlert` is hoisted beside `playStatusSound` (always emitted) and guards `fireStatusDesktopNotif` with `typeof`. Regression test in `provider-dashboard.test.mjs` asserts the helper exists when `notifications.browser: false`. Full suite green. N79 implementation matches TASK.md; approve for merge pending optional human manual checks.

### Checklist verification

- [x] Round-1 blocker (firePermissionAlert ReferenceError) — **resolved** (`dashboard.ts` ~557–568; test added)
- [x] All Round-1 automated checklist items — still pass
- [ ] Manual Cursor/Claude verification — pending human (unchanged, non-gating)

### Blockers

None.

### Non-blocking

(Carried from Round 1; unchanged.)

1. MCP gate may be noisy — acceptable v1.
2. Shell `preToolUse` matcher breadth — acceptable v1.
3. ~~No test for browser:false~~ — addressed by `provider-dashboard.test.mjs` N79 test.
4. CHANGELOG — separate release task.
5. Consumers need `init --editor cursor --force` for hook refresh.

### Security & edge cases

No new concerns. `firePermissionAlert` with browser off: sound path no-ops via missing `notifSettings` (same as before); no throw.

### Notes

Fix commit files: `dashboard.ts`, `provider-dashboard.test.mjs`. Ready for `/task-git`.
