# N81 — Consolidate insight-flow into one modular package + safety net + extension points

**Type:** rework
**Priority:** high
**Created:** 2026-06-03

## Problem

The repo is a 2-package pnpm workspace, but `CLAUDE.md` misdescribes it as "two pieces only / no monorepo." Concerns (cli, dashboard, master, agents, core) are not cleanly separated and types/config are duplicated between `packages/taskflow` and `packages/insight-flow-master`. Worse, the CLI auto-starts the master via a hardcoded sibling path `resolve(__dir, "../../insight-flow-master/dist/index.js")` (`packages/taskflow/src/server/index.ts:202`) that does **not** exist on an `npm i -g insight-flow` — so master silently fails ("binary not found") for real users.

## Goal

1. One published `insight-flow` package with clear module folders: `core`, `cli`, `dashboard`, `master`, `agents`.
2. `insight-flow-master` folded in as `insight-flow master`; sibling-path coupling removed; master works post-install.
3. A build-decoupled test entry + a playground e2e smoke + a characterization test pinning the published surface (bin, `exports`, tarball `files`).
4. Exactly two bounded extension-point interfaces — **transport/realtime** and **storage** — with the current implementations behind them, no behavior change.
5. `CLAUDE.md` + `README` corrected to match reality; all existing tests stay green; published surface unchanged.

## Scope

### In scope

- Reorganize `packages/taskflow/src/` into `core/` (types.ts, schema/, storage.ts, config.ts, global-config.ts, paths.ts, spec.ts), `cli/` (cli.ts, commands/), `dashboard/` (server/), `agents/` (agents.ts, cursor-hooks.ts, hook-parse.ts, *-hook.ts, init/).
- Fold `packages/insight-flow-master/src/*` into `src/master/`; expose `insight-flow master` (subcommand or 2nd bin); delete the separate package + its `pnpm-workspace.yaml` entry.
- Fix the master launch in the dashboard server (remove the `../../insight-flow-master/dist` resolution).
- Update root `package.json` scripts (`build`, `master`, `master:dev`, `play`, `ui`) and tsup config.
- Add a `node --test` entry, a playground e2e smoke, and a characterization test for the published surface.
- Introduce a `Transport` (realtime) interface wrapping the current socket.io usage and a `Storage` interface wrapping the current JSON-file `storage.ts`; route existing call sites through them with no behavior change.
- Update `CLAUDE.md` + `README` to describe the single-package module layout + `insight-flow master`.

### Out of scope

- Removing/replacing **socket.io** (gated to the future React-backend spec).
- The React dashboard.
- ESLint / Prettier / pre-commit hooks.
- A generic plugin framework or abstracting the HTTP server — only the two named seams.
- Adding/removing any dependency without explicit human approval.

## Implementation plan

1. **1a — Safety net (do FIRST).** Add a `test:node` script (`node --test` over `test/*.test.mjs`); add a playground e2e smoke (boot CLI `ui`, GET `/` → 200, hit master view → 200); add a characterization test asserting (a) `insight-flow` bin runs `--help`, (b) `package.json.exports["."]` shape, (c) `npm pack --dry-run --json` file list. Capture the green baseline before touching anything.
2. **1b — Module move.** Create `core / cli / dashboard / agents` folders, move files, update all imports, keep both tsup entries (`cli`, `index`) building.
3. **Fold master.** Move `packages/insight-flow-master/src/*` into `src/master/`, reconcile its types/config onto `core`. Wire a `master` subcommand in `cli.ts` (or a 2nd bin). Delete the package dir; drop it from `pnpm-workspace.yaml`.
4. **Fix launch.** Replace the `resolve(__dir, "../../insight-flow-master/dist/index.js")` sibling lookup in the dashboard server with an in-package import/spawn of the folded master entry.
5. **Build/scripts.** Update root `package.json` and tsup config (add a master entry if using a 2nd bin); confirm the sounds copy step + `files` whitelist still hold.
6. **1c — Extension seams.** Define a `Transport` interface (e.g. `core/transport.ts`) with a `SocketIoTransport` impl wrapping the current `server/index.ts` socket.io code; define a `Storage` interface (e.g. `core/storage-port.ts`) with a `JsonFileStorage` impl wrapping the current `storage.ts`. Behavior unchanged.
7. **Docs.** Rewrite the "What This Is" / "Architecture" sections of `CLAUDE.md` and `README`.
8. **Green→green.** Re-run the full suite + characterization test; diff the published surface against the 1a baseline; confirm zero change.

## Verification

- `pnpm --dir packages/taskflow test` — all 14 existing tests + the new tests pass.
- `npm pack --dry-run` file list is identical to the pre-change baseline (no published-surface regression).
- `node dist/cli.js --help` lists all subcommands including `master`.
- `node dist/cli.js master` (or the 2nd bin) boots the overview server on :6100 from within the single package — no sibling path.
- `pnpm play` → dashboard at :6006 still works; master auto-start no longer logs "binary not found".
- `git grep "insight-flow-master/dist"` returns nothing.

## Notes

- Decided via `/task-analyze` — see `ANALYSIS.md` in this folder for the full options/decision trail. North Star: **"lean now, scale deliberately."**
- **Sequencing is mandatory:** the 1a green baseline comes BEFORE the 1b move, so the restructure is provably green→green. If 1c (seams) inflates review size, it may peel into a fast-follow spec.
- Follow-on specs (NOT this task): socket.io → native transport (gates the React backend); prehooks + lint + code-quality; React dashboard + lightweight backend.
- Watch-list during the move: tsup entries, the `exports` map, the `files` whitelist, the sounds copy, `scripts/sync-role-templates.mjs`, and root scripts referencing `packages/insight-flow-master`.
