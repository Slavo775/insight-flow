# N02 — Real-time activity engine with WebSocket dashboard — Review

**Reviewer:** Task Reviewer (AI)
**PR:** (no PR — branch `feat/N02-realtime-activity-engine`, not yet opened on GitHub)
**Verdict (Round 1):** FIX NEEDED
**Verdict (Round 2):** APPROVED (after fixes)

---

## Round 2 — Summary

All round-1 issues resolved in commit `eefae32`. Tracker bookkeeping in `46f4681`. Quality gates still green. No new regressions observed. Approving.

**Risk:** Low — fixes were minimal and targeted; nothing else in the diff changed since round 1.

## Round 2 — Checklist verification

- [x] `ActivityEvent` and `ActivityEngineConfig` types defined in `types.ts`
- [x] `taskflow.config.json` supports `activityEngine: { enabled, logFile, maxEvents }` with defaults
- [x] Hook script exists and appends JSONL lines to activity log
- [x] `ActivityEngine` class watches activity log file, maintains ring buffer, emits events
- [x] Server upgraded from SSE to WebSocket (`/ws` endpoint)
- [x] WebSocket broadcasts `file-change` events (replaces SSE)
- [x] WebSocket broadcasts `activity` events from the activity engine
- [x] New WS clients receive a snapshot of recent activity on connect
- [x] Dashboard HTML extracted to `server/dashboard.ts` — now tracked in git
- [x] Dashboard has collapsible activity panel showing live Claude actions
- [x] Activity panel color-codes tool types and auto-scrolls
- [x] Connection status indicator in dashboard (connected/disconnected/reconnecting)
- [x] `taskflow init` generates Claude Code hook config in `.claude/settings.local.json`
- [x] `taskflow init` copies/generates hook script to `.claude/hooks/`
- [x] Activity engine is a no-op when `activityEngine.enabled: false`
- [x] Activity panel hidden in dashboard when engine is disabled
- [x] `.taskflow-activity.jsonl` added to `.gitignore` during init (code exists; runtime verification deferred to user-level smoke test)

## Round 2 — Issues resolved

### Blocker 1 — New files not staged/committed → RESOLVED

`activity.ts`, `dashboard.ts`, `ws.ts` are now part of commit `eefae32`. Verified via `git diff main..HEAD --stat` shows all three with `+` mode.

### Non-blocking — CSS `display: none` then `display: flex` conflict → RESOLVED

`dashboard.ts:70` now reads:

```css
.activity-panel { ... display: none; ... flex-direction: column; }
.activity-panel.open { display: flex; }
```

Base rule has `display: none` only; `flex-direction: column` is inert until `.open` flips to `display: flex`. Panel correctly starts hidden.

### Non-blocking — `addActivityEvent` called when activity is disabled → RESOLVED

`dashboard.ts:286, 291` both `snapshot` and `activity` branches now guard with `typeof addActivityEvent === 'function'`. When `activityEnabled` is false the function is never declared, but the guards skip the call so no `ReferenceError` is possible.

### Non-blocking — Unused `ActivityEngineConfig` import → RESOLVED

`init/index.ts:4` now imports only `TaskflowConfig`. No lingering references — typecheck would have caught a dangling identifier.

## Quality gate results

- `npx tsc --noEmit` (package): **PASS**
- `npx tsc --noEmit` (root): **PASS**
- `pnpm run build` (taskflow): **PASS** — `dist/cli.js 78.90 KB`, `dist/index.js 47.03 KB`
- Lint: pre-existing prettier failures across the repo (781 errors not introduced by this task or its fixes); matches the round-1 baseline.

## Notes

- No GitHub PR exists yet (`mrUrl` is absent on the tracker). When the PR is opened, the round-1 / round-2 findings here can be linked or pasted into the PR description.
- Runtime verification items (`taskflow init` populates `.gitignore`, WebSocket auto-reconnect, hook fires within ~200ms) remain user-driven smoke tests — the code paths are present and typecheck-clean, which is the most the static review can attest to.
- Future hardening (out of scope for approval): replace the inline duplicate-suppression of `display: flex`/`flex-direction` with a proper class toggle approach; consider extracting the inline JS string in `dashboard.ts` into a static asset to enable prettier/eslint coverage.
