# N282 — Hub reliability — listen errors, registry by path, liveness counter, lock probe, versioned service worker — Checklist

## Done criteria

- [ ] Both servers handle `listen` errors with a clear stderr message and non-zero exit; process error handlers print to stderr (A50)
- [ ] The dashboard starts the activity engine and hub integration only after `listen` succeeds (A50)
- [ ] Every `fs.watch` has an `'error'` handler that closes and re-arms (A50)
- [ ] The registry reconciles by path; duplicate folder names get distinct `projectId`s and tokens; create never re-points another entry (A51a)
- [ ] Online status uses a per-id stream counter or current-stream check (A51b)
- [ ] Port assignment reserves in-flight ports and never returns a busy port; early child exit is surfaced (A51c)
- [ ] "Hub running" is decided by an HTTP probe; the lock is cleared on crash and `SIGHUP`; EPERM handled consistently (A51d)
- [ ] The SW cache name includes the package version; `/hub-notify.js` is bypassed or network-first; the `'/'` key only stores shell HTML (A23, A79)
- [ ] `/update` and `/api/register` are validated; `Connection` tokens stripped; version fetch deduped and bounded; HTML buffering capped; mid-stream throw destroys and logs (A52)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in affected area (`master-liveness`, `master-boot`, `master-proxy`, `hub-registry`, `e2e-smoke` green)

## Verification

- [ ] Tests: busy port, duplicate names, reregister race, stale lock with reused PID, SW versioning, `/update` validation, hop-by-hop tokens
- [ ] Manual: `insight-flow ui` on a busy port prints the port message and exits 1
- [ ] Manual: a version bump delivers the new `hub-notify.js` without clearing site data
