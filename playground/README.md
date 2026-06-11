# taskflow-playground

Local sandbox for dogfooding the `taskflow` npm package without publishing it.

## Setup

```bash
# 1. Build the package (from the repo root)
cd ..
pnpm --dir packages/taskflow run build

# 2. Install the playground (links to ../packages/taskflow)
cd playground
pnpm install

# 3. Launch the dashboard
pnpm ui
# → opens http://localhost:6007
```

## What's in here

- `taskflow.config.json` — points `workDir` at `./workTasks` and serves on port `6007`.
- `workTasks/master.json` + `workTasks/tasks-N00-N09.json` — seeded sample dataset with 4 tasks across the lifecycle (merged, fix-needed, with incidents).
- `package.json` — depends on `taskflow` via `link:../packages/taskflow` so changes to the package are picked up after rebuild.

## Verifying live updates

With `pnpm ui` running, edit a field in `workTasks/tasks-N00-N09.json` (e.g., change a task title). The dashboard should refresh within ~1s — the server watches `workTasks/` and broadcasts file-change events over WebSocket.

## Resetting the dataset

```bash
git checkout playground/workTasks/
```

## Pointing the playground elsewhere

To prove the `workDir` is configurable, edit `taskflow.config.json`:

```json
{ "workDir": "../some/other/path" }
```

and the dashboard will read from that directory instead.

## Composed-agent validation

This playground was driven by the N89 composed `task-implement` prompt on 2026-06-11 (behavioral validation run).
