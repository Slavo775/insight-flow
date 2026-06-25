---
title: The handover system
sidebar_label: The handover system
sidebar_position: 5
---

# The handover system

A handover is how one agent passes work to the next. It is the connective tissue
of a [flow](./flows.md): without handovers a flow is a set of agents that don't
know about each other. insight-flow models handovers as **data** — declarations
that the composer renders into an agent's "## Handover" prompt section — so the
chain is described, audited, and edited without touching agent logic.

There are two places a handover can be declared, and both render through the same
section.

## Module-level handovers

A `handover` [module](./modules.md#category-3--behavior-as-data-handover-status-transition)
(N142) is composed into an agent's module list, exactly like any other module. It
declares:

- **`to`** — the agent that receives the work.
- **`on`** _(optional)_ — only hand over when the task is at this status.
- **`mode`** — `auto` or `gated` (see below); `gated` is the default.
- **`label`** _(optional)_ — a display label.

These are part of the canonical lifecycle and are **locked** (not
user-overridable), the same way `security`/`enforcement`/`protocol` are locked —
see [locked modules](./modules.md#locked-modules). When an agent has several
handover modules, the composer collapses them into **one** "## Handover" section
listing the candidates; the agent free-picks the one matching its outcome.

## Flow-edge handovers

A flow edge can also carry a handover (N147), declared on the edge instead of in
a module:

```json
{
  "from": "task-implement",
  "to": "task-git",
  "on": "implemented",
  "handover": { "mode": "auto" }
}
```

This is **project-scoped** — it lives on the flow's edge, not on the shared
agent, so a custom flow can add a handover even for a built-in/locked source
agent without mutating that agent. At flow-install time the edge's handover is
merged into the source agent's emitted prompt: `mergeHandovers` in
`packages/taskflow/src/agents/compose.ts` folds these flow handovers in with the
agent's own module handovers (deduped by `to`/`on`/`mode`) and renders them
through the same "## Handover" section.

A relation may be a plain status-change (trigger only), a pure handover (no
trigger), or both — the `handover` field is independent of `on`.

## Auto vs gated

`mode` governs what the receiving agent's prompt tells the source agent to do
when its work is complete:

- **`gated`** _(default)_ — **stop and get an explicit human go-ahead** before
  invoking the next agent's slash command. The safe default: a human stays in the
  loop at every step.
- **`auto`** — **invoke the next command directly in-session**, no pause needed.
  Used where chaining is safe and the next step is mechanical (e.g. once a task is
  `implemented`, hand to `task-git` to push).

These are **descriptive**: the agent honors the instruction from its composed
prompt — nothing in the system auto-runs commands, and `auto` never bypasses
permissions or consent. The flow diagram stays non-binding; the agent's
handovers win.

## The canonical lifecycle chain

The shipped handover modules
(`packages/taskflow/src/agents/modules/handovers.json`) form the default
lifecycle's chain. `gated` steps wait for a human; `auto` steps chain in-session:

```
task-analyze ──(gated)──▶ taskmaster
taskmaster ──(ready, gated)──▶ task-implement
task-implement ──(implemented, auto)──▶ task-git
task-git ──(pushed, gated)──▶ task-review
                                  │
        ┌──────(approved, gated)──┤
        ▼                         ▼ (fix-needed, gated)
task-human-review          task-review-fix ──(fixed, gated)──▶ task-review
   │        │        │
(approved, (fix-needed, (done, gated)
  auto)      gated)       │
   │        │             ▼
   ▼        ▼      task-request-changes ──(changes-requested, gated)──▶ task-implement
task-git  task-review-fix                          task-implement ──(changes-implemented, auto)──▶ task-git
```

Reading it: analysis hands to the taskmaster on a human go-ahead; the spec hands
to the implementer when `ready`; implementation auto-chains to `task-git` once
`implemented`; the push hands to review; review either approves (to the human
gate) or sends a fix back into the review loop; the human gate can approve (auto
to `task-git`), send a fix, or open a post-merge change request. The three `auto`
edges (`implement → git` on `implemented`, the human gate's `approve → git` on
`approved`, and the `request-changes` round-trip's `changes-implemented → git`)
are the only ones that chain without a human pause.

`taskmaster-change` mirrors `taskmaster`: once a revised spec is `ready`, it hands
to `task-implement` (gated).

## See also

- [Flows & the lifecycle](./flows.md) — edges, statuses, and `entryAgents`.
- [Everything is a module](./modules.md) — the `handover` and `status-transition`
  kinds.
- [Default flow](../built-ins/default-flow.md) — the shipped edges and handovers.
- [Default Flow](../flow/index.md) — transitions in the dashboard.
