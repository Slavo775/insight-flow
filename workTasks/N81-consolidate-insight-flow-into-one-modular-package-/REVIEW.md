# N81 — Consolidate insight-flow into one modular package + safety net + extension points — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-03
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Consolidates the 2-package pnpm workspace into one `insight-flow` package with concern-separated module folders (`core / cli / dashboard / master / agents`), folds the former `insight-flow-master` package in as `insight-flow master`, and fixes the install-time auto-start bug (`findMasterBin` resolved a dead `../../insight-flow-master/dist` sibling path). Adds a safety net (published-surface characterization, dashboard e2e smoke, folded-master boot) and two bounded extension seams (transport, storage). Risk: **medium-mechanical, low-behavioral** — 43 files moved via `git mv` with 80 imports rewritten by a codemod, but the change is behavior-preserving and proven green→green (87 tests, 0 fail; typecheck clean; published surface pinned and unchanged).

## Checklist verification

- [x] Single `insight-flow` package; master package removed — pass (dir gone, `pnpm-lock` resynced, workspace `packages/*` glob no longer matches it).
- [x] `src/` reorganized into `core / cli / dashboard / master / agents` — pass (44 files; `index.ts` barrel retained at root).
- [x] `insight-flow master` boots from the in-package CLI, no sibling path — pass (`findMasterBin` → `resolve(__dir, "cli.js")`; auto-start spawns `[cli, "master", "--port", n]`). Covered by `master-boot.test.mjs` (server core) + code review; the live cold-start path was not exercised (a real master was running on :6100 — see Notes).
- [x] `Transport` + `Storage` interfaces exist with current impls behind them, no behavior change — pass (`seams.test.mjs`; transport preserves exact socket.io config; storage signatures derived via `typeof`).
- [x] `CLAUDE.md` + `README` describe the new layout — pass (also `docs/architecture-diagrams.md`).
- [x] socket.io NOT removed; no React / lint / pre-hook work — pass (socket.io retained, now behind the transport seam).
- Quality gates: typecheck pass · 87 tests / 0 fail · `npm pack` surface pinned · lint N/A (not configured).

## Blockers

None.

## Non-blocking

1. **`pnpm play` is fragile (pre-existing, not introduced here).** `playground/package.json` scripts call `taskflow ui` but the package bin is `insight-flow`. It only resolves via a leftover `node_modules/.bin/taskflow` symlink that survived `pnpm install`; a fresh clone would have no `taskflow` bin and `pnpm play` would fail. The dashboard boot *itself* is verified (`e2e-smoke.test.mjs` via `dist/cli.js`), so the CHECKLIST "pnpm play" item is true only incidentally. **Fix (follow-up):** rename the playground scripts + the `"taskflow"` dependency key to `insight-flow`.
2. **Storage seam adoption is intentionally minimal.** Only `cli.ts`'s master-load routes through `jsonFileStorage`; ~120 call sites still call the free functions. The boundary + default impl exist (the point), but swap-value stays low until adoption broadens. Acceptable per "lean now, scale deliberately" — track the migration.
3. **`master` not asserted in the `published-surface` `--help` enumeration.** The test is superset-tolerant so it passes; consider adding `master` to the asserted command list for completeness.
4. **No CHANGELOG entry for N81.** Given this is a notable internal refactor plus a real bugfix (master install), add a CHANGELOG note before the next publish.
5. **`.claude/settings.local.json`** retains `pkill -f "insight-flow-master"` allow entries pointing at a now-removed path — harmless local cruft, optional cleanup.

## Security & edge cases

- Import rewrite (codemod) verified by `tsc` (resolution) + full suite (behavior). Runtime path resolution (`PACKAGE_ROOT` / templates / schema / sounds) is keyed to the bundled `dist/` layout, unaffected by the `src/` reorg — confirmed by passing init/scaffold tests and `dist/sounds` present after build.
- `INSIGHT_FLOW_NO_OPEN` guard: default behavior preserved (browser still opens unless the env var is set); only tests set it. No concern.
- `findMasterBin` → `resolve(__dir, "cli.js")` resolves correctly in both the `dist/cli.js` and `dist/index.js` bundles; this is the install-time fix.
- Transport seam preserves the exact socket.io options (cors GET, ping intervals) and the `/socket.io/socket.io.js` route (IOServer still attaches to the same HTTP server). The master server's own socket.io usage was left as-is (bounded scope) — a candidate to adopt the same `Transport` later.

## Notes

- Live `insight-flow master` cold-start was **not** exercised because a real master (pid 2165, started Jun 2 from the pre-N81 binary) was running on :6100; disturbing it was avoided. `runMaster` is a faithful port of that binary's `main()`, so confidence is high; the gap is the trivial CLI dispatch → `runMaster` glue, covered by code review + typecheck.
- Follow-ups worth tracking: playground `taskflow`→`insight-flow` rename (finding 1), broaden storage-port adoption (finding 2), CHANGELOG entry (finding 4). The planned socket.io→native transport swap and the React dashboard remain separate future specs (the transport seam now exists to support the former).
