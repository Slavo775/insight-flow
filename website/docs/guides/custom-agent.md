---
title: Compose a custom agent
sidebar_label: Custom agent
sidebar_position: 5
---

# Compose a custom agent

A [composed agent](../concepts/agents.md) is a single **ordered list of module
ids**. The composer renders the text modules (`section` / `include`) into a role
prompt in declared order, and collects any artifact modules (`mcp-server` /
`hook` / `skill`) for installation. This guide composes a custom agent and
generates its role file.

## 1. Write the agent definition

User-space agents live under `insightFlow/agents/`, one JSON file per agent. The
id starts with `custom:` and a lowercase slug. `modules` is the ordered list of
registry ids — built-in ids and your own `custom:` module ids both work.

`insightFlow/agents/spec-writer.json`:

```json
{
  "id": "custom:spec-writer",
  "title": "Spec Writer",
  "description": "Drafts a tight spec before any code is written.",
  "modules": [
    "security",
    "enforcement",
    "custom:house-style",
    "taskmaster/spec-shape"
  ],
  "command": { "install": true, "as": "command" }
}
```

- Each module id must resolve in the registry (built-ins + your user-space
  modules) — an unknown id throws at load.
- `command.install: true` (optional) means the agent's composed prompt is also
  installed as a runnable slash command. The command name is derived from the id
  tail (`custom:spec-writer` → `/task-spec-writer`); it must not collide with a
  built-in command name.

## 2. Generate its role file

Compose the agent to Markdown with `prompt-build --compose`. Pass the agent id to
compose just one:

```bash
insight-flow prompt-build --compose custom:spec-writer
```

That prints the composed role Markdown to stdout. To write it out, add `--apply`
(writes the agent's mapped role file when one exists, plus its
`mcp-server` / `hook` / `skill` artifacts), or `--out <dir>` to write a
`<id>.composed.md` preview file:

```bash
# write artifacts + role file (idempotent; per-target created/updated/unchanged)
insight-flow prompt-build --compose custom:spec-writer --apply

# or just preview to a folder
insight-flow prompt-build --compose custom:spec-writer --out build/prompts
```

Expected `--apply` output (one line per target):

```
no role-file mapping for 'custom:spec-writer' — MD not written (artifacts only)
created .claude/commands/task-spec-writer.md
```

> Custom agents have no canonical root-level role file, so `--apply` emits their
> artifacts (and, with `command.install`, the slash command) rather than a
> `*_ROLE.md`. The nine built-in agents are the ones with role-file mappings.

## 3. Verify

Run `insight-flow prompt-build --compose custom:spec-writer` and read the output:
the modules appear as standalone blocks in your declared order. If a module id is
wrong you'll get `Unknown module '<id>' referenced by agent 'custom:spec-writer'`.

## See also

- [Author a custom module](./custom-module.md)
- [Define a custom flow](./custom-flow.md) — put the agent into a lifecycle.
- [The install engine](./install-engine.md)
- [Concepts → Agents](../concepts/agents.md)
