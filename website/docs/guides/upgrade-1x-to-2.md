---
title: Upgrade from 1.x to 2.0
sidebar_label: Upgrade 1.x → 2.0
sidebar_position: 9
---

# Upgrade from 1.x to 2.0

2.0 introduces the consolidated **`insightFlow/` layout**, per-task
review/incident **side files**, and the **agent composition v2** model
("everything is a module"). Existing 1.x projects keep working through a
back-compat shim, but to move fully onto the 2.0 shape, run the migrations once,
in order. **Every migration command is idempotent — safe to re-run.**

## 1. Install 2.0

```bash
npm install -g insight-flow@latest
```

## 2. Migrate a project

Run these in order from the project root. `init` does **not** migrate your data —
these explicit commands are the upgrade path.

```bash
insight-flow migrate-layout --dry-run     # 1. preview the move (no changes written)
insight-flow migrate-layout               # 2. move workTasks/ + .events → insightFlow/
insight-flow migrate-reviews              # 3. split inline reviews/incidents into per-task side files
insight-flow migrate-hooks                # 4. refresh hook scripts for the new version
insight-flow init                         # 5. re-scaffold role files (composition v2)
```

For a whole fleet of registered projects, swap the last step:

```bash
insight-flow bulk-init                    # re-scaffold every registered project
insight-flow bulk-prompt-build            # re-sync AGENT_ENFORCEMENT.md + agents.extend
```

## What each migration does

- **`migrate-layout`** — moves a top-level `workTasks/` (and `.events`) into the
  consolidated `insightFlow/` root. The legacy layout still resolves via the
  back-compat shim if you defer, so nothing breaks; this just moves you onto the
  2.0 layout. Pass `--fix-strays` if a prior partial migration left an empty,
  doubled `workTasks/workTasks/` directory behind.
- **`migrate-reviews`** — splits inline reviews/incidents on each task into
  per-task side files (`reviews.json` / `incidents.json`). Run once after upgrade.
- **`migrate-hooks`** — refreshes the bundled hook scripts and bumps
  `taskflow.config.json`'s `hooksVersion`.

## Composition v2 — custom definitions only

If you maintain **custom** composed agents or modules (in
`agents/composed/*.json` / `agents/modules/*.json`), convert each agent to a
single ordered `modules: string[]` of registry ids, and give every module a
`kind` (`"section"` with `heading`/`body`, `"include"` with `ref`, or one of the
artifact kinds). Module ids must be unique — duplicates now throw when the
registry builds.

Stock role files (`TASK_*_ROLE.md`, `AGENT_*.md`) are unchanged and remain
canonical — if you didn't author custom definitions, there's nothing to convert.

> **Realtime transport changed.** `socket.io` was removed; the live channel is
> now native Server-Sent Events at `/sse`. The bundled dashboard and CLI handle
> this automatically — only a custom Socket.IO client integration needs to switch
> to an `EventSource` on `/sse`.

## Notes

- If you defer migrating, the legacy `workTasks/` layout still resolves — nothing
  breaks, you just stay on the old layout until you run `migrate-layout`.
- After upgrading the global binary, re-run `init` (or `bulk-init`) so role files
  and scaffolding match the new version.

## See also

- [CLI → config & migration](../cli/config-and-migration.md)
- The full per-breaking-change details live in the
  [CHANGELOG](https://github.com/Slavo775/insight-flow/blob/main/packages/taskflow/CHANGELOG.md).
