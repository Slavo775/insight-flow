# ANALYSIS — Round N113–N115: flow editor — full authoring

## Problem framing

The N109–N112 flow editor lets you drag nodes, connect edges (trigger picked once at
connect time), and define custom states — but it's a "tweak what exists" tool, not a
"build a flow" tool. Three concrete gaps the human hit while using it:
1. A "new" flow is prefilled with the default project's full 10-agent set (`ProjectForm`
   copies `agents: base.agents` even on the non-duplicate path), so you can't start with a
   different agent set.
2. You can't add or remove an agent node in edit mode — only drag existing ones.
3. An edge's trigger can't be changed after connect, and edge deletion is keyboard-only
   (`deleteKeyCode` after selecting) — undiscoverable, so it reads as "can't delete a relationship."

## Goal

Three smallest-shippable tasks making the editor a real authoring surface: N113 new flows pick
their own agents; N114 add/remove agents in edit mode; N115 edge modal to change-trigger + delete.

## Options considered

1. **Empty-flow model**: (CHOSEN) new flow picks its agent set up front via a multi-select
   defaulting to none — keeps `ProjectSchema.agents.min(1)` intact (user picks ≥1), no schema
   change, always-valid. vs. (rejected) born with zero agents + relax schema to `min(0)` + add
   agents only in the editor — more literally "empty" but forces the add-agent task as a hard
   prerequisite and a schema relaxation. The chosen path is lower-risk and decouples the tasks.
2. **Edit interaction surface**: (CHOSEN) click → popover (nodes) / modal (edges) — most
   discoverable, matches the human's mental model. vs. hover-✕ badges (lighter, less obvious)
   vs. right-click context menus (desktop-only, weak on mobile).
3. **Add-with-remove**: (CHOSEN) bundle add+remove agents into one task (N114) — they share the
   "draft carries agents" plumbing and remove-without-add is an asymmetric trap. vs. split into
   two tasks (artificial coupling on the shared draft change).

## Decision

Proceed N113 → N114 → N115 (N114/N115 are the affordances the human is most blocked on, so
front-loading them is acceptable too). No schema changes. Editor edits keep flowing through the
N111 draft + PUT round-trip and the N110/N112 superRefine validation backstops save.

## Open questions

- Whether the node popover should also offer "open agent page" (deferred — read mode already
  navigates; the editor popover is remove-focused).
- Default position for a newly added agent node (implementer picks a sensible default).
- Pruning custom states that a removed edge/agent leaves unused — intentionally NOT done; the
  N112 in-use guard + states editor handle cleanup (harmless if left).

## Sources

- packages/taskflow/src/dashboard/client/ProjectForm.tsx (the `agents: base.agents` copy),
  components/FlowEditor.tsx (no onNodeClick/onEdgeClick; trigger only at onConnect; keyboard-only
  delete), ProjectPage.tsx (edit-mode draft = {positions, flow} + states).
- core/flow-edit.ts (validateEdgeAddition / edgeKey), core/statuses.ts (TASK_STATUSES),
  ProjectSchema states + duplicate-triple superRefine (N110/N112).
- /task-analyze session 2026-06-15 with the human; both forks (agent model, interaction surface)
  decided on the recorded options.

## Handoff brief

Created N113–N115 via taskmaster on 2026-06-15, all `ready`, priority medium, tags
dashboard/flow/editor. Builds on the merged N108–N112 customization layer. No schema or CLI changes.
