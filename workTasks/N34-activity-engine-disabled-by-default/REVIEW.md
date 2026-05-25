# N34 — Activity engine disabled by default — Review

## AI Review — Round 1

**Reviewer:** Task Reviewer (AI)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Summary

All three opt-in guards (`dashboard.ts`, `server/index.ts`, `init/index.ts`) correctly switched from `!== false` to `=== true`. One checklist item missed: playground config still has `"enabled": false` but the spec requires it to be explicitly `true` so the sandbox remains usable for development/demo.

### Checklist verification

- [x] `activityEnabled` in `dashboard.ts` uses `=== true` — ✅ line 4
- [x] Same guard in `server/index.ts` — ✅ line 364
- [x] `insight-flow init` scaffold sets `"enabled": false` — ✅ `init/index.ts` line 47
- [x] Config template updated to `enabled: false` — ✅ confirmed in `buildConfigWithExamples` stub
- [ ] `playground/taskflow.config.json` has `"enabled": true` — ❌ playground has `"enabled": false`; the sandbox cannot show activity tabs without manually editing this file

### Blockers

1. **Playground config has `enabled: false`** — `playground/taskflow.config.json` line 8: `"enabled": false`. The checklist explicitly requires `"enabled": true` there so that `pnpm play` demonstrates the activity feature. With `false`, the activity tabs are hidden in the dev sandbox, making it impossible to exercise N33–N37 features during development without a manual config edit.
   _Fix: set `"enabled": true` in `playground/taskflow.config.json`._

### Non-blocking

- The `init/index.ts` hook-generation guard at line 210 still uses `!== false`. When `enabled: false` is set in config, `false !== false` = false correctly skips hook generation. Functionally correct even though the style differs from the server guards.

### Security & edge cases

- None.

### Notes

- This is the only task in N33–N37 whose fix doesn't touch `dashboard.ts`.
