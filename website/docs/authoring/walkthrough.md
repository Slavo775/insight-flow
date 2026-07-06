---
title: Walkthrough
sidebar_label: Walkthrough
sidebar_position: 2
---

# Walkthrough

This guide takes you through the authoring flow end to end, then a concrete
worked example: **authoring a custom module**. It assumes the flow is installed
(see the [Overview](./index.md#install-it)).

## 1. Start with analysis

```text
/task-authoring-analyze "I want a module that adds our team's PR checklist to the git agent"
```

The **analyst** works a fixed method — **intent** (a whole flow, one agent, or one
module) → **goal** → design **top-down** (flow → agents → modules) → **reuse** →
**impact** → **MCP discovery** — and fans out to the read-only per-kind analyst
subagents, which inventory the existing registry (via the composer MCP `list`/`get`)
to answer: *does something already do this?* If the design needs an MCP server, it
finds one by **web search** — the free **[GitHub MCP Registry](https://github.com/mcp)**
(`github.com/mcp`) and the Official MCP Registry — no API key and nothing to install.
It also asks your opt-ins — whether the generated artifact should include the
**activity engine**, and which **harness(es)** to target (Claude, Cursor, or both).

You get back a **design brief**: the request restated, reuse candidates (each
tagged with whether it needs only a small change and whether it's referenced
elsewhere), what must be newly created, and the conventions to honour.

:::tip Reuse first, custom-only
The whole flow prefers reuse, and it treats **built-in defaults as read-only**. The
brief's per-candidate `built-in? / referenced?` flags drive the
[reuse-first rule](./agents-and-subagents.md#the-reuse-first-rule): reuse as-is →
edit in place only your *own* `custom:` def (if unreferenced) → otherwise author a
`custom:` variant or ask → create new only as a last resort.
:::

## 2. Create the spec

Approve the brief and the **Composer Taskmaster** (`/task-authoring-create`)
writes the authoring spec and creates the tracked task, binding it to the
`composer-authoring` flow. (If you'd jumped straight to `create`, it would hand
back to analysis first.)

It **scaffolds, then fills** — it runs `insight-flow create` (which copies the
shared `templates/task/*.tpl` files into the folder) and fills each section in
place, so every task keeps the same structure. The spec it writes is detailed and
buildable:

- **Description** and **Goal**.
- An **inventory** of everything to build — grouped by kind: **modules**,
  **subagents**, **agents**, **flows**, and **relationships** (each edge/handover
  with its `on` trigger and `auto`/`gated` mode) — each item with enough detail to
  build it.
- **Implementer subtasks** — an ordered **checkbox** list (`- [ ]`) of the little
  steps, written into `CHECKLIST.md` so the implementer ticks each one as it builds.
- **Verification**.

It synthesizes this from the analyst's brief (it doesn't re-run the per-kind
analysis). The same agent also handles **changes** to an existing spec — it edits
the current `TASK.md`/`CHECKLIST.md` in place rather than creating a new task.

:::note Templated by default
Every taskmaster is templated: it composes the `template-copy` module (scaffold →
fill) so tasks share one structure, and an *authoring* taskmaster also composes
`authoring-spec-structure` (the layout above). When you author your **own** custom
taskmaster, the composer includes these by default — unless you opt out.
:::

## 3. Implement

`/task-authoring-implement` builds the definitions, delegating to the per-kind
**author** subagents, which call the composer MCP. Before authoring, each author
calls [`describe(kind)`](../composer-mcp/tools.md#describekind) for the exact
shape and `get`s an existing definition as a template. The implementer works the
`CHECKLIST.md` subtasks one by one and finishes with every box ticked.

The implementer (and the fixer, which shares its **build-discipline core**) stays
self-contained: it builds only from the spec + checklist + composer conventions —
it never reads the insight-flow project (needing to is a bug to surface), never
installs (that's the gated installer step), and stops on anything outside building
the customization. Small edits — a few lines within one file — are allowed.
Nothing is installed yet.

## 4. Review → (fix) → human review

`/task-authoring-review` fans out to the read-only **reviewer** subagents
(schema, duplication/reuse, best practice). Blockers loop through
`/task-authoring-fix` and back to review. When it's clean, it hands to
`/task-authoring-human-review`, which records **your** decision verbatim.

## 5. Test, then install

After approval, `/task-authoring-test` validates the definitions **and confirms
they work** (compose/render, an install dry-run, exercise on a trivial input,
then clean up). Finally `/task-authoring-install` installs the approved
definitions via the composer MCP `install`, records the `custom:` ids it created,
and marks the task **done**.

---

## Worked example — author a custom module

Goal: a small **section** module that injects a team coding-standards note,
reusable in any agent.

**Analyze.** `/task-authoring-analyze "a reusable section module with our
coding-standards note"`. The module analyst inventories existing `section`
modules; suppose none matches, and nothing similar is referenced — so the brief
says *create new*.

**Create.** Approve → the spec: one new `section` module, id
`custom:coding-standards`, with a heading + body; no harness-specific opt-ins.

**Implement.** The module author calls `describe(kind="module")` (for the
`section` shape: `{ heading, body }`) and `get`s a built-in section as a
template, then:

```text
create_module({ def: {
  "id": "custom:coding-standards",
  "title": "Coding standards",
  "kind": "section",
  "heading": "## Coding standards",
  "body": "Match the surrounding code; no console logs in committed code; …"
} })
```

It re-`get`s to confirm it validated.

**Review → human review.** The module reviewer checks the schema, that it isn't a
duplicate of an existing section, and that the id is `custom:`. Clean → you
approve.

**Test → install.** The tester composes it into a throwaway agent to confirm it
renders, then `/task-authoring-install` runs
`install(kind="module", id="custom:coding-standards")` and marks the task done.
You can now add `custom:coding-standards` to any agent's `modules` list.

:::note Reuse in action
If an existing **`custom:`** section *almost* fit — say it only needed a different
heading — and **nothing referenced it**, the author would have edited it in place
(`update_module`) instead of creating a new one. A **built-in** section is never
edited, though — the author would author a `custom:` variant instead. And if a
candidate *were* referenced elsewhere, the author would make a variant or ask you
first. See the [reuse-first rule](./agents-and-subagents.md#the-reuse-first-rule).
:::

## See also

- [Agents & subagents reference](./agents-and-subagents.md)
- [Composer MCP tools](../composer-mcp/tools.md) — `describe`, `create_*`,
  `install`, …
- [Subagents & orchestration](../subagents/index.md) — how fan-out + rejoin works
