# N57 — release v0.9.0 — batch-ui changelog, README, version bump

**Type:** chore
**Priority:** high
**Created:** 2026-05-27

## Problem

N56 shipped the `batch-ui` / `ui-batch-register` / `ui-batch-down` feature on main but the package is still at `0.8.0`. The `CHANGELOG.md` `[Unreleased]` section is empty and the README "What's new" still reflects 0.8.0 highlights. A release commit is needed to cut v0.9.0 and publish to npm.

## Goal

1. Add `## [0.9.0] — 2026-05-27` entry to `packages/taskflow/CHANGELOG.md` covering N56.
2. Update `## What's new in 0.8.0` → `## What's new in 0.9.0` in `packages/taskflow/README.md` with 0.9.0 highlights.
3. Bump `packages/taskflow/package.json` `"version"` from `"0.8.0"` to `"0.9.0"`.
4. Verify build + tests pass, then publish the package to npm via `npm publish`.

## Scope

### In scope

- `packages/taskflow/CHANGELOG.md` — add `[0.9.0]` section above `[0.8.0]`, clear `[Unreleased]`.
- `packages/taskflow/README.md` — update "What's new" heading and bullet points to reflect 0.9.0 (batch-ui launcher, ui-batch-register, ui-batch-down).
- `packages/taskflow/package.json` — `"version": "0.9.0"`.
- Build + publish: `pnpm --dir packages/taskflow run build && pnpm --dir packages/taskflow exec npm publish`.

### Out of scope

- Behaviour changes to any command.
- Changes to `insight-flow-master` package.
- Updating playground or test fixtures.

## Implementation plan

1. **CHANGELOG** (`packages/taskflow/CHANGELOG.md`)
   - Add above `## [0.8.0]`:
     ```
     ## [0.9.0] — 2026-05-27

     ### Added (N56)
     - `insight-flow batch-ui` — interactive multi-select prompt to launch dashboards for multiple registered projects at once; spawns a detached `insight-flow ui` process per project on auto-assigned ports starting at 6007; opens all URLs in the default browser (suppress with `--no-open`); non-TTY mode selects all projects.
     - `insight-flow ui-batch-register` — run inside any insight-flow project folder to register it in the global registry (`~/.insight-flow/batch-ui.json`) using the project name from `taskflow.config.json`; actionable errors for missing/invalid config and duplicate entries.
     - `insight-flow batch-ui --add "<label>" <path>` — register a project by explicit path without `cd`-ing.
     - `insight-flow batch-ui --list` — list all registered projects.
     - `insight-flow ui-batch-down` — stop all servers started by the last `batch-ui` run (reads PIDs from global registry, sends SIGTERM, clears list; handles already-exited processes gracefully).
     - Global registry persists last-selected projects for pre-checked prompt on next run.
     - Cross-platform: macOS (`open`), Linux (`xdg-open`), Windows (`start`, `insight-flow.cmd`).
     ```
   - Set `## [Unreleased]` section body to _(nothing yet)_.

2. **README "What's new"** (`packages/taskflow/README.md` line 7)
   - Change heading: `## What's new in 0.8.0` → `## What's new in 0.9.0`
   - Replace the 5 current bullets with:
     - **Multi-project launcher** — `insight-flow batch-ui` starts dashboards for several projects at once; interactive TTY prompt, auto-port assignment, browser open.
     - **Register from project folder** — `insight-flow ui-batch-register` reads `taskflow.config.json` and registers the project in a global file (`~/.insight-flow/batch-ui.json`) in one command.
     - **Stop all servers** — `insight-flow ui-batch-down` terminates all servers started by the last `batch-ui` run via PID tracking.

3. **Version bump** (`packages/taskflow/package.json`)
   - `"version": "0.8.0"` → `"version": "0.9.0"`

4. **Build & verify**
   - `pnpm --dir packages/taskflow run build` — must succeed with zero TypeScript errors.
   - `pnpm --dir packages/taskflow run typecheck` — zero errors.
   - `pnpm --dir packages/taskflow test` — all tests pass.

5. **Publish**
   - `pnpm --dir packages/taskflow exec npm publish` (runs `prepublishOnly`: sync-roles → build → typecheck).
   - Verify: `npm view insight-flow version` should return `0.9.0`.

## Verification

```bash
node -e "console.log(require('./packages/taskflow/package.json').version)"
# → 0.9.0

grep "## \[0.9.0\]" packages/taskflow/CHANGELOG.md
# → ## [0.9.0] — 2026-05-27

grep "What's new in 0.9" packages/taskflow/README.md
# → ## What's new in 0.9.0

npm view insight-flow version
# → 0.9.0
```

## Notes

- `prepublishOnly` in `packages/taskflow/package.json` runs `npm run sync-roles && npm run build && npm run typecheck` — no need to build separately before publish.
- N56 is the only merged task since 0.8.0 — CHANGELOG entry covers only that task.
- Related: N55 (v0.8.0 release, same structure), N56 (batch-ui implementation).
