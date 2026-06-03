# N81 — Consolidate insight-flow into one modular package + safety net + extension points — Checklist

## Done criteria

- [x] Single `insight-flow` package; `packages/insight-flow-master` removed (workspace uses a `packages/*` glob — the dir is gone, lockfile resynced).
- [x] `src/` organized into `core / cli / dashboard / master / agents`.
- [x] `insight-flow master` boots the overview server from within the single package (no `../../insight-flow-master/dist` path).
- [x] `Transport` and `Storage` interfaces exist with the current implementations behind them; no behavior change.
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

- **1c (extension seams) implemented:** `Transport` (`dashboard/server/transport.ts` + `SocketIoTransport`) wraps all dashboard socket.io usage — the seam for the planned socket.io→native swap. `Storage` (`core/storage-port.ts` + `jsonFileStorage`, signatures derived via `typeof` so they can't drift) abstracts the JSON-file backend; wired at the central `cli.ts` master-load and exported from the public API. Per "lean now, scale deliberately", the remaining ~120 storage call sites adopt the port incrementally — the boundary + default impl now exist. Both seams covered by `seams.test.mjs`.
