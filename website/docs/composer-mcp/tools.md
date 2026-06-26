---
title: Tool reference
sidebar_label: Tool reference
sidebar_position: 2
---

# Composer MCP — tool reference

All tools take a `kind` of `module`, `agent`, or `flow` (except the per-kind
`create_*` / `update_*` tools, which fix the kind in the tool name). A tool that
fails returns an error result whose text is the structured reason
(`{ "ok": false, "error": "…" }`), mirroring the dashboard's HTTP status codes.

## Reads

### `list(kind)`

List every definition of `kind`, **built-in and custom**. Each entry is tagged:

| Field       | Meaning                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| `source`    | `"builtin"` or `"custom"`.                                              |
| `locked`    | Modules only — `true` for the read-only baseline + transition/handover. |
| `installed` | `true` when the target has emitted artifacts in this project.           |

### `get(kind, id)`

Return one definition (built-in or custom) with its full `definition`, the
`source` / `locked` / `installed` flags, and a **`revision`** token. Pass that
token back to `update_*` for optimistic-concurrency safety.

## Authoring

### `create_module(def)` · `create_agent(def)` · `create_flow(def)`

Create a new **custom** definition. `def` is the full object; its `id` must start
with `custom:`. The def is schema- and reference-validated before any write —
a bad shape returns `400`, a duplicate id returns `409`.

### `update_module(def, revision?)` · `update_agent(def, revision?)` · `update_flow(def, revision?)`

Update an existing definition:

- **Custom def** → updated in place.
- **Built-in id** → an **eject/override** is written (a custom file that shadows
  the shipped definition).
- **Locked module** → refused.
- **The `default` flow** → refused over MCP (use the dashboard).

Pass `revision` (from `get`) to be rejected with `409` if the stored definition
changed since you read it.

### `delete(kind, id)`

Remove a **custom definition** (or revert a built-in override). Reference-safe:
refused with `409` (and the referencing ids) while another definition still
references it; locked modules are refused. This removes the *definition* — to
remove its emitted artifacts instead, use `uninstall`.

## Install / uninstall

### `install(kind, id, force?)`

Emit the target's artifacts into the project: MCP servers → `.mcp.json`, hooks →
`.claude/settings.json`, skills/commands → `.claude/`. Set `force: true` to
overwrite a conflicting `.mcp.json` entry — the prior value is snapshotted so a
later `uninstall` can restore it. Without `force`, a genuine conflict returns the
installed-vs-incoming diff.

### `uninstall(kind, id)`

Remove the target's emitted artifacts, **reference-safe**: an artifact still
owned by another install target is retained; an `.mcp.json` entry that this
target overwrote is restored to its snapshot. The definition itself is kept.

## Worked example

```jsonc
// list custom flows
list({ "kind": "flow" })

// author a module, then install it
create_module({ "def": { "id": "custom:my-linter", "title": "My linter MCP",
  "kind": "mcp-server", "name": "my-linter", "config": { "command": "my-linter", "args": ["--stdio"] } } })
install({ "kind": "module", "id": "custom:my-linter" })

// later, back it out cleanly
uninstall({ "kind": "module", "id": "custom:my-linter" })
delete({ "kind": "module", "id": "custom:my-linter" })
```
