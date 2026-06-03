# N81 — Consolidate insight-flow into one modular package + safety net + extension points — Checklist

## Done criteria

- [x] Single `insight-flow` package; `packages/insight-flow-master` removed (workspace uses a `packages/*` glob — the dir is gone, lockfile resynced).
- [x] `src/` organized into `core / cli / dashboard / master / agents`.
- [x] `insight-flow master` boots the overview server from within the single package (no `../../insight-flow-master/dist` path).
- [ ] `Transport` and `Storage` interfaces exist with the current implementations behind them; no behavior change. — **DEFERRED (1c); see Notes.**
- [x] `CLAUDE.md` + `README` describe the new single-package layout accurately.
- [x] socket.io NOT removed; no React / lint / pre-hook work included.

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` (`tsc --noEmit`) passes
- [x] `pnpm --dir packages/taskflow test` — all existing + new tests pass (85 tests, 0 fail)
- [x] `npm pack --dry-run` file list matches the 1a baseline (pinned by `published-surface.test.mjs`)
- [x] Lint: not configured / out of scope — skipped per `AGENT_PROTOCOL.md` step 6

## Verification

- [x] `node dist/cli.js --help` lists all subcommands including `master`
- [x] `pnpm play` serves the dashboard at :6006 (boot proven by `e2e-smoke.test.mjs`); `findMasterBin` now resolves the in-package CLI, so no "binary not found"
- [x] `git grep "insight-flow-master/dist"` returns nothing in shipping code (only historical task docs)

## Notes

- **1c deferred:** the Transport (socket.io) + Storage (JSON-file) extension seams are not in this change. The 1a+1b diff is already ~50 files (43 moves + master fold + docs); the spec explicitly permits peeling 1c into a fast-follow when it inflates review size. Recommended as a follow-up task (N82).
