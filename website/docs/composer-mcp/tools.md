---
title: Tool reference
sidebar_label: Tool reference
sidebar_position: 2
---

# Composer MCP — tool reference

All tools take a `kind` of `module`, `agent`, `flow`, or `chain` (except the
per-kind `create_*` / `update_*` tools, which fix the kind in the tool name).
`install` / `uninstall` take only `module`, `agent`, or `flow`: a chain has no
install step. A tool that
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

### `describe(kind?)`

Return the authoritative **how-to-author** reference: the cross-cutting rules
(`custom:` ids, the locked tier, the agent baseline, the handover / single-token
model, and the **reuse-first decision rule**) plus the exact `create_*` shape and
fields for a kind. Pass `kind` = `module` | `agent` | `flow` | `chain`, or omit for all
kinds. Read it before `create_*` / `update_*`; pair it with `get` on an existing
definition as a working template.

## Authoring

### `create_module(def)` · `create_agent(def)` · `create_flow(def)` · `create_chain(def)`

Create a new **custom** definition. `def` is the full object; its `id` must start
with `custom:`. The def is schema- and reference-validated before any write —
a bad shape returns `400`, a duplicate id returns `409`.

A **chain** links existing flows into a flow of flows:
`{ id, title, description?, flows: string[], links: { from, on, to, mode?, when? }[] }`.
`title` is at most 200 characters and `description` at most 2000. `flows` needs at
least one flow; `flows[0]` is the entry flow. Each link's `from` and `to` must be
in `flows`. A link leaves a **terminal** status `on` of flow `from` and enters
flow `to`, which must have an entry agent. Two links with the same `from` / `on` /
`to` are rejected. `mode` is `gated` (default) or `auto`; `when` is one line of at
most 200 characters, with no control characters. Chain ids must start with
`custom:` — there are no built-in chains. See
[Chains](../cli/git-and-flow.md#chains-flow--flow) for how a task moves along a
chain at run time.

In `list` and `get`, a chain entry has `source: "custom"` and no `installed` or
`locked` flag; `list` items also carry `flows` and `linkCount`.

### `update_module(def, revision?)` · `update_agent(def, revision?)` · `update_flow(def, revision?)` · `update_chain(def, revision?)`

Update an existing definition:

- **Custom def** → updated in place.
- **Built-in id** → an **eject/override** is written (a custom file that shadows
  the shipped definition). This is supported for deliberate one-off changes, but
  the guided [authoring flow](../authoring/index.md) prefers authoring a `custom:`
  **variant** instead, so shipped defaults stay read-only and upgradable.
- **Locked module** → refused.
- **The `default` flow** → refused over MCP (use the dashboard).
- **Built-in agent override** → must keep the agent's locked baseline modules
  (`security`, `enforcement`, `protocol`). An override that drops any of them is
  refused with `400`.
- **A flow a chain uses** → refused when the edit would break the chain (for
  example, it drops a terminal status a link starts from).

Pass `revision` (from `get`) to be rejected with `409` if the stored definition
changed since you read it.

### `delete(kind, id)`

Remove a **custom definition** (or revert a built-in override). Reference-safe:
refused with `409` (and the referencing ids) while another definition still
references it; locked modules are refused. This removes the *definition* — to
remove its emitted artifacts instead, use `uninstall`.

A module, agent, or flow that is still **installed** is refused (code
`installed`): `uninstall` it first, then `delete`. This keeps its hooks and
`.mcp.json` entries from being left behind with no definition. Chains have no
install step, so this check does not apply to them.

## Install / uninstall

### `install(kind, id, force?, confirm?, values?)`

Emit the target's artifacts into the project: MCP servers → `.mcp.json`, hooks →
`.claude/settings.json`, skills/commands → `.claude/`. Set `force: true` to
overwrite a conflicting `.mcp.json` entry — the prior value is snapshotted so a
later `uninstall` can restore it. Without `force`, a genuine conflict returns the
installed-vs-incoming diff.

**Two-step confirm for executable artifacts.** A target whose plan emits a **hook**
or an **MCP server** persists a shell command / server into `.claude/settings.json`
or `.mcp.json` that will run in the user's *future* Claude sessions. For such
targets `install` first returns `{ needsConfirm: true, kind, id, plan, missingInputs }`
and writes **nothing**; re-call with `confirm: true` — after a human has seen the
plan — to actually apply it. This stops a prompt-injected agent from silently
persisting a shell hook or MCP server. Targets that emit no hook / MCP server
(e.g. skills, commands) apply directly, no confirm needed.

Pass `values` to supply any `${VAR}` inputs the plan needs (or store them
beforehand); inputs still missing come back in `missingInputs` so you can gather
them before confirming. An install that would apply with inputs still missing
fails (with `missingInputs`) instead of writing a literal `${VAR}`.

### `uninstall(kind, id)`

Remove the target's emitted artifacts, **reference-safe**: an artifact still
owned by another install target is retained; an `.mcp.json` entry that this
target overwrote is restored to its snapshot. The definition itself is kept.

The result carries `installed`: `true` when artifacts were removed, `false` (with
empty `reports`) when the target was not installed — nothing is changed then.

## Worked example

```jsonc
// list custom flows
list({ "kind": "flow" })

// author a module, then install it
create_module({ "def": { "id": "custom:my-linter", "title": "My linter MCP",
  "kind": "mcp-server", "name": "my-linter", "config": { "command": "my-linter", "args": ["--stdio"] } } })

// it emits an MCP server, so the first call only returns the plan (nothing is written)
install({ "kind": "module", "id": "custom:my-linter" })
// → { "needsConfirm": true, "kind": "module", "id": "custom:my-linter",
//     "plan": [{ "kind": "mcp", "key": "my-linter", "label": "MCP server: my-linter", "target": ".mcp.json" }],
//     "missingInputs": [] }

// a human checks the plan, then apply it
install({ "kind": "module", "id": "custom:my-linter", "confirm": true })

// later, back it out cleanly
uninstall({ "kind": "module", "id": "custom:my-linter" })
delete({ "kind": "module", "id": "custom:my-linter" })
```
