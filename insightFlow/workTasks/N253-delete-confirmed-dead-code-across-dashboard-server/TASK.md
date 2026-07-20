# N253 — Delete confirmed dead code across dashboard-server, UI, agents, master

**Type:** chore
**Priority:** medium
**Created:** 2026-07-18

## Problem

A ponytail audit (2026-07-18) grep-confirmed a set of exports, endpoints, and symbols that have **zero callers anywhere** in `src`/`test`/client/master. They are stale leftovers from abandoned features. Pure removals, no behavior change — worth clearing before the N254 refactor touches the same files.

## Goal

1. Remove the 3 dead HTTP endpoints in the dashboard server (no client/test/master consumer).
2. Drop dead exports and their types in UI and agents code.
3. Remove the dead public export `validateReferences` and its barrel line.
4. Remove trivially-dead lines in master (`projectsHomeRoot`, `"[::1]"` LOOPBACK entry).
5. `tsc --noEmit`, lint, and the test suite stay green.

## Scope

### In scope (each item was grep-confirmed dead by the audit — re-confirm before deleting)

- **dashboard/server** — `packages/taskflow/src/dashboard/server/index.ts`:
  - `/log/status` endpoint (~line 1605)
  - `/api/session-events` endpoint (~line 1685)
  - `/api/events?taskId=` endpoint (~line 1654) — abandoned per-task timeline reader
  - `validateReferences` — drop the `export` in `custom-defs.ts:84` and its re-export in `src/index.ts` barrel (~line 188); keep the function only if still used internally, else delete
- **UI** — `packages/taskflow/src/dashboard/client/`:
  - `SEVERITY_CLASS` in `lib.ts:120` (real styling lives in `components/Severity.tsx`)
  - `statusTone` in `components/Badge.tsx:22` — drop the `export`, keep it local to Badge
- **agents** — `packages/taskflow/src/agents/`:
  - `detectNotifyHookStatus` + `NotifyHookStatus` type in `notify-hook.ts:100` (never wired up; the activity twin IS used)
  - `flowInstallPlan` (`flow-install.ts:104`) and `flowRequiredInputs` (`flow-install.ts:164`) — test-only wrappers over generic `planFromArtifacts`/`inputsFromArtifacts`; migrate the tests to the generics, then delete the wrappers
- **master** — `packages/taskflow/src/master/server.ts`:
  - `projectsHomeRoot` export (~line 46) — zero callers
  - the `"[::1]"` entry in `LOOPBACK_HOSTS` (~line 370) — `headerHost` strips brackets, so it can never match

### Out of scope

- Any refactor, extraction, or dedup — that is N254 / N255. This task ONLY deletes.
- `flowHandoversByAgent` (used by `flowArtifacts` — NOT dead).
- Anything the re-confirm grep shows to now have a caller — leave it and note it.

## Implementation plan

1. **Re-confirm each symbol** — for every item above, `grep -rn "<symbol>" packages/taskflow/src packages/taskflow/test` and verify no live caller before deleting. The audit is a snapshot; re-verify.
2. **Delete dashboard endpoints** — remove the 3 route branches + any now-orphaned helper only they used.
3. **Un-export / delete UI symbols** — `SEVERITY_CLASS`, `statusTone` export.
4. **Delete agent dead code** — `detectNotifyHookStatus`+type; migrate the 2 tests off `flowInstallPlan`/`flowRequiredInputs` to the `target*` generics, then delete the wrappers.
5. **Delete master dead lines** — `projectsHomeRoot`, `"[::1]"`.
6. **Rebuild + gates** — `pnpm --dir packages/taskflow run build`, `tsc --noEmit`, lint, `pnpm --dir packages/taskflow test`.

## Verification

- `pnpm --dir packages/taskflow test` green; `tsc --noEmit` clean; lint clean.
- `insight-flow ui` boots; dashboard + master render; no 404s from removing the 3 endpoints (confirmed unused).
- `git grep` for each deleted symbol returns nothing.

## Notes

- Source: ponytail audit 2026-07-18 (4 parallel scanners). See ANALYSIS.md.
- Do N253 **before** N254 — smaller surface for the http-util refactor. Related: [N254], [N255], [N256].
