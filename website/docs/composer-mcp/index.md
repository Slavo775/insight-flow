---
title: Composer MCP
sidebar_label: Overview & setup
sidebar_position: 1
---

# Composer MCP

**The composer MCP server is how you get an AI assistant to help you set up and
customize insight-flow itself.** Tailoring insight-flow to a project means
working with its [modules](../concepts/modules.md), [agents](../concepts/agents.md),
and [flows](../concepts/flows.md) — and that's normally a dashboard job. This
server hands those same operations to an MCP client (Claude Code, or any other)
as **tools**, so you can _ask_ for the change in plain language —
"add a security-review agent to my flow", "create a module that wires up my
linter", "install that flow" — and the assistant carries it out by calling the
composer directly. It's the conversational, agent-driven way to manage your
insight-flow setup.

Concretely, the server exposes insight-flow's composer registry — modules,
agents, and flows, both built-in **and** custom — so an MCP client can list,
author, edit, install, uninstall, and delete definitions as tool calls: the same
operations the [dashboard](../dashboard/index.md) offers, but programmatic and
agent-callable. Because the tools are kind-parameterized, this includes the
[`subagent` module kind](../concepts/modules.md) — you can author native
subagents over MCP and install them to `.claude/agents/`.

It is the same engine under both surfaces: every tool delegates to the exact
functions the dashboard's HTTP API uses, so validation, the locked/eject tiers,
revision concurrency, reference-safe uninstall, and the `.mcp.json` undo snapshot
all behave identically.

## Run it

The server speaks MCP over **stdio** — it runs as a subprocess of the client,
not a network service. There is no port and no config setting; you register the
CLI command:

```bash
insight-flow mcp
```

It runs until the client closes the connection, exchanging JSON-RPC on
stdin/stdout. (Don't run it interactively expecting output — it's a protocol
stream, not a REPL.)

## Register it with an MCP client

Add it to the project's `.mcp.json`:

```jsonc
{
  "mcpServers": {
    "composer": {
      "command": "insight-flow",
      "args": ["mcp"]
    }
  }
}
```

That's exactly what the built-in **`mcp-composer`** module writes — so instead of
hand-editing `.mcp.json` you can let insight-flow wire itself up:

```bash
# from the dashboard, or over the composer MCP itself:
#   install(kind="module", id="mcp-composer")
```

The `mcp-composer` module ships built-in. It's not in the **default** flow (so a
normal project doesn't get it automatically), but the built-in **Composer
authoring** flow (N194) lists it in its `install`, so installing that flow
registers the `composer` server for you. You can also add it to any custom flow's
`install`, or install it directly.

> **Composer authoring flow.** insight-flow ships a second built-in flow whose
> agents (analyze → create → implement → review → fix → human-review → test →
> install) author and install custom modules/agents/flows through these MCP
> tools, fanning out to per-kind subagents (analyst / author / reviewer ×
> module / agent / flow / relationship). Because the MCP is **stdio**, there's no
> server to manage — the harness spawns it per session; if the tools are missing,
> the fix is registering `mcp-composer`, not launching anything. See
> [Authoring customizations](../authoring/index.md) for the full guide.

> The server resolves the **current project** (the nearest ancestor with a
> `taskflow.config.json`), so run the client from inside an insight-flow project.
> Custom definitions are read from and written to that project's
> `insightFlow/{modules,agents,projects}/`.

## Safety

The tools run **autonomously** — there is no per-call human gate. The guardrails
that bound them are the same ones the rest of insight-flow enforces:

- **Locked modules** (`security`, `enforcement`, `protocol`, and every
  `status-transition` / `handover` module) are read-only — `update` and `delete`
  refuse them.
- **The default flow** is refused by `update` over MCP — ejecting/overriding it
  is a deliberate dashboard action, never an autonomous tool call.
- **Uninstall is reference-safe** — an artifact still owned by another install
  target is retained, and an overwritten `.mcp.json` entry is restored to its
  pre-install snapshot rather than deleted.
- **Delete is reference-safe** — a definition still referenced by another
  definition is refused (with the referencing ids).

See the [tool reference](./tools.md) for every tool and its inputs.
