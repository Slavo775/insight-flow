# N134 — Analysis (pre-taskmaster strategist)

## Problem framing

The human asked for a context-menu action to "set an agent as the start point /
master agent" of a flow, beside the existing "delete agent" option. Tracing the
code showed the concept **already exists** as the `entryAgents` field and is
fully functional — it is only missing a UI to set it:

- Schema: `core/schema/index.ts:440` (`entryAgents`, validated against the agent set).
- Server round-trip: `dashboard/server/index.ts:780`.
- Task routing: `cli/commands/create.ts:37` picks the flow whose `entryAgents`
  includes the chosen agent (N122/N123).
- Sidebar display: `ProjectPage.tsx:296-301` already renders "★ · main".
- Save path: `ProjectPage.tsx:220` already carries `entryAgents` verbatim.

So this is "expose an existing routing-critical field," not "invent a concept."

## Goal

A flow author can toggle agents as flow **start points** from the flow editor
(multiple allowed), persisted into `entryAgents`, with ★ badges on both maps and
consistent "start point" vocabulary. No schema/server/migration change.

## Options considered

1. **Context-menu toggle in the FlowEditor node popover** (CHOSEN) — matches the
   human's "beside delete agent" ask; the popover at `FlowEditor.tsx:446` already
   hosts "Remove from flow".
2. Inline toggle on the sidebar agent links — rejected: the human explicitly
   wants it in the node context menu, and the sidebar isn't an editing surface.
3. A brand-new "master agent" field/concept — rejected: redundant with
   `entryAgents`, and "master" collides with the `insight-flow master` overview
   server (`src/master/`, its own lock at `~/.insight-flow/master.lock`).

**Naming:** "main" (current) vs "start point" vs "master agent". Human chose
**"start point"**; relabel the UI, keep the internal field name `entryAgents`.

**Cardinality:** single exclusive entry vs multiple. Human chose **multiple**
(matches the shipped default `["task-analyze","taskmaster"]`).

## Decision

Context-menu toggle in `FlowEditor`, persisted via the existing `entryAgents`
field; ★ badge in `FlowEditor` + read-only `FlowMap`; sidebar relabel
"main" → "start point". Client-only; the draft (`FlowDraft`) gains an
`entryAgents` array (today only carried verbatim on save).

## Open questions

- Badge glyph: using ★ (already the sidebar glyph). Implementer may add a
  border/style accent too.
- `default.json` content unchanged (only UI wording changes).

## Sources

- `packages/taskflow/src/dashboard/client/components/FlowEditor.tsx` (popover, draft)
- `packages/taskflow/src/dashboard/client/components/FlowMap.tsx` (badges)
- `packages/taskflow/src/dashboard/client/ProjectPage.tsx` (sidebar, startEdit, saveDraft)
- `packages/taskflow/src/core/schema/index.ts:440`, `dashboard/server/index.ts:780`,
  `cli/commands/create.ts:37`, `agents/project/default.json`

## Handoff brief

feat / medium / tags: dashboard, flow-editor, ux. Add a "Set as start point /
Unset start point" toggle to the FlowEditor node popover that mutates the flow's
existing `entryAgents` (multiple allowed), persisted on Save; badge start points
(★) in both flow maps; relabel sidebar "main" → "start point". No schema/server
change. Sibling of N135.
