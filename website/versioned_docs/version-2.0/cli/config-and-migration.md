---
title: Config & Migration
sidebar_label: Config & Migration
sidebar_position: 9
---

# Config & Migration

Maintain configuration and migrate older projects to current layouts.

| Command | Purpose |
|---------|---------|
| `migrate` | Migrate from a legacy `tracker.json` to the sharded layout. |
| `migrate-reviews` | Split inline reviews/incidents into per-task side files (schema v2). |
| `migrate-layout` | Move `workTasks/` + `.events` into the consolidated `insightFlow/` root. Flags: `--dry-run`, `--fix-strays`. |
| `prompt-build` | Print or apply the enforcement / composed role block. Flags: `--apply`, `--compose`, `--out`. |

## Examples

```bash
insight-flow migrate-layout --dry-run     # preview the N101 layout move
insight-flow migrate-layout --fix-strays  # apply + relocate stray files
insight-flow prompt-build --compose --apply   # rebuild role files from modules
```

:::tip
`prompt-build --compose` regenerates the canonical `*_ROLE.md` files from their JSON
modules — the same content surfaced under [Agents](../agents/index.md) and the
synced **Reference** section.
:::
