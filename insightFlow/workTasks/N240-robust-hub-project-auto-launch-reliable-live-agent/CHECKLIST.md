# N240 — Robust hub project auto-launch + reliable live agent-status to master (notifications fire) — Checklist

## Done criteria

### Phase 1 — auto-launch never crashes the hub (confirmed bug)
- [x] Auto-launch skips a project whose `cwd` path does not exist (`existsSync` guard) in `master/server.ts` (the `/start` handler — the only spawn site; there is no startup bulk-launch loop)
- [x] `child.on("error", ...)` attached so a spawn failure (async ENOENT etc.) logs and is swallowed, never crashes the master
- [x] Applies to the on-demand `/api/hub/projects/:id/start` path (the overview auto-calls it; no separate startup loop exists)
- [x] Stale `hub.json` entries (missing `path`) are **ignored** — a missing-path `/start` returns a clean 404 (deliberately NOT auto-pruned, to avoid silently deleting user registrations)
- [x] Integration test added (`master-liveness.test.mjs`): missing-path `/start` → 404, master stays up

### Phase 2 — live agent-status reaches the master
- [x] Root cause found (by code reading): `reregister` (index.ts:602) re-pushed `pushStateToMaster` (agentStatus) but NOT `pushStatusToMaster` (claudeStatus). On any master restart/crash the registry resets `claudeStatus` to null → hub-notify (reads `claudeStatus`) never fires until a fresh transition.
- [x] Fix applied (minimal, mirrors the working initial-register push): `reregister` now calls `pushStatusToMaster(getStatus())`.
- [ ] **Live end-to-end smoke still needed** (deploy the build + real agent turn): a real `active → done` fires a "Claude finished" banner; a permission prompt fires "needs permission". Recommended after this ships in a release.
- [ ] (Optional, deferred) a diagnostic showing per-project `claudeStatus` + last-push time

## Quality gates

- [ ] `pnpm --dir packages/taskflow build` passes
- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow test` passes (add a unit test for the spawn-guard / stale-entry skip)
- [ ] No regressions in the hub overview / project start / self-heal paths (N220/N228)

## Verification

- [ ] Bogus `hub.json` entry with a non-existent path → master stays up, logs a skip, serves the overview
- [ ] Real agent turn in a running project → master `claudeStatus` goes `active → done` + banner fires
- [ ] The stale-entry crash no longer reproduces
