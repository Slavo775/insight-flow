---
title: Author a custom module
sidebar_label: Custom module
sidebar_position: 4
---

# Author a custom module

A [module](../concepts/modules.md) is the smallest reusable unit insight-flow
composes agents from. The shipped modules are built in and immutable; your own
live in **user space** and carry a `custom:` id. This guide authors one and
validates it.

## 1. Pick a kind

Every module declares a `kind`. The authorable kinds are:

| Kind         | What it contributes                                         |
| ------------ | ----------------------------------------------------------- |
| `section`    | A heading + body of role-prompt text.                       |
| `include`    | A verbatim `@<ref>` line (e.g. `@AGENT_SECURITY.md`).       |
| `mcp-server` | An entry merged into `.mcp.json` under `mcpServers[name]`.  |
| `hook`       | A Claude Code hook reconciled into `.claude/settings.json`. |
| `skill`      | A `.claude/skills/<name>/SKILL.md` file.                    |
| `bundle`     | A list of other module ids, expanded in place.              |

Only `mcp-server`, `hook`, `skill`, and `bundle` emit installable artifacts;
`section` and `include` are pure prompt text. (`status-transition` and
`handover` are behavior-as-data and are typically authored on a flow's edges, not
by hand here.)

## 2. Write the file

User-space modules live under `insightFlow/modules/`, one JSON file per module.
The id **must** start with `custom:` followed by a lowercase slug
(`custom:my-module`), and the filename should match the id tail.

A `section` module — `insightFlow/modules/house-style.json`:

```json
{
  "id": "custom:house-style",
  "title": "House code style",
  "kind": "section",
  "heading": "## House style",
  "body": "Match the existing two-space indent and double quotes. Keep diffs minimal."
}
```

An `mcp-server` module with a templated secret — `insightFlow/modules/context7.json`:

```json
{
  "id": "custom:context7",
  "title": "Context7 MCP",
  "kind": "mcp-server",
  "name": "context7",
  "config": {
    "command": "npx",
    "args": ["-y", "@upstash/context7-mcp"],
    "env": { "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}" }
  },
  "inputs": [
    { "name": "CONTEXT7_API_KEY", "title": "Context7 API key", "secret": true }
  ]
}
```

The `${CONTEXT7_API_KEY}` placeholder becomes a collected input at install time —
see [The install engine](./install-engine.md#var-inputs).

## 3. Validate

User-space definitions are parsed with the **same Zod schemas** as the built-ins,
on load. The quickest way to surface an error is to ask for the module's install
plan (which loads the registry):

```bash
insight-flow ui
```

Open the dashboard at `http://localhost:6006`, browse to your module in the
module browser, or trigger any flow/agent that references it. A malformed module
throws a precise error, e.g.:

```
Invalid user-space definition insightFlow/modules/house-style.json:
  custom id must be 'custom:' followed by lowercase letters, digits, and hyphens
```

Common rules the loader enforces:

- Non-`custom:` ids are rejected unless they exactly match a shipped built-in you
  are intentionally overriding (locked modules — `status-transition` / `handover`
  and the cross-cutting baseline — can never be overridden). Overriding a built-in
  is supported for one-off changes, but the [authoring flow](../authoring/index.md)
  prefers a `custom:` **variant** — built-in defaults are treated as read-only so
  they stay upgradable.
- Duplicate ids across files throw.
- `section` modules need a heading or a non-empty body; `skill` / hook-script
  names must be safe path segments.

## See also

- [Compose a custom agent](./custom-agent.md) — wire your module into an agent.
- [The install engine](./install-engine.md) — install the artifacts a module emits.
- [Concepts → Modules](../concepts/modules.md)
