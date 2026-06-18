# N143 — surface status-transition + handover in module/agent editors (CRUD, locked read-only)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-17

## Problem

- The `status-transition` module kind (N128) and the new `handover` kind (N142) define an agent's end-of-turn behavior as data — but neither is creatable/editable in the dashboard. `ModuleForm`'s editable `KINDS` is `["section","include","mcp-server","hook","skill","bundle"]` (`ModuleForm.tsx:145`); `status-transition`/`handover` are absent, so users can only author them by hand-editing JSON.
- The /task-analyze decision is that the **agent is the authoritative source** for handovers. Users need to add/edit/remove these directly in the module and agent editors — "instead of a status change you can add a handover" — while canonical (shipped) ones stay read-only via the existing locked tier.

## Goal

1. `status-transition` and `handover` are first-class editable kinds in `ModuleForm`, each with a correct kind-specific field set.
2. `AgentForm` lets a user add/reorder/remove an agent's status-transition + handover modules inline (the end-of-turn section), alongside the existing module list.
3. Locked canonical status-transition/handover modules remain read-only (reuse the existing locked-tier guard).
4. Full CRUD round-trips correctly through the registry API and validates against the schema (N142/N128) on save.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/ModuleForm.tsx` — add `"status-transition"` and `"handover"` to `EditableKind`/`KINDS` (line 145–146) and `KIND_LABELS`; add kind-specific field sets in the `switch (s.kind)` builder (~line 236): status-transition → `agent` + `sets` + optional `from`; handover → `to` (agent picker), optional `on` (trigger), `mode` (auto/gated toggle, default gated), optional `label`.
- `toModule`/`fromModule` (ModuleForm) — serialize/deserialize the new fields.
- `packages/taskflow/src/dashboard/client/AgentForm.tsx` — surface add/remove/reorder of these end-of-turn modules in the agent's module list (it already renders `kind` badges via `kindColor`); ensure the agent/trigger pickers are populated from the registry + `TASK_STATUSES`/flow states.
- `kindColor` (`components/CompositionMap.tsx`) — add colors for the two kinds so badges render.
- The trigger picker reuses `TASK_STATUSES` (`core/statuses.ts`) and the project's custom states, consistent with `FlowEditor`'s `TriggerOptions`.

### Out of scope

- The schema/compose foundation (N142) — assumed merged.
- FlowEditor edge badges / orphan warnings (N144).
- Final composed-prompt wording (N145).
- No server-side storage changes beyond what the existing custom-module registry API (`custom-defs.ts`) already supports for module CRUD.

## Implementation plan

1. **Kinds + labels.** Extend `EditableKind` and `KINDS` in `ModuleForm.tsx` with `status-transition` and `handover`; add human labels to `KIND_LABELS` (e.g. "status transition", "handover").
2. **Field sets.** In the form-state builder (`switch (s.kind)`), add branches: status-transition (`agent` picker from registry agents, `sets` from status universe, optional `from`); handover (`to` agent picker, optional `on` trigger, `mode` segmented control defaulting `gated`, optional `label`). Mirror existing branch structure (e.g. the `mcp-server`/`hook` branches).
3. **Serialize.** Update `toModule`/`fromModule` so the new fields persist and reload; keep `id`/`title`/`source` handling identical to other kinds.
4. **Locked guard.** Confirm the existing locked read-only path (`ModuleForm.tsx:312` "locked modules stay read-only") covers the canonical handover ids from N142 — no separate handling needed.
5. **AgentForm inline.** In `AgentForm.tsx`, ensure the add-module picker lists the new kinds and the ordered list renders/reorders them; verify deleting respects existing guards. Add helper copy clarifying these are end-of-turn behaviors.
6. **Badges.** Add `kindColor` entries for the two kinds in `CompositionMap.tsx`.

## Verification

- `pnpm --dir packages/taskflow run build` + `npx tsc --noEmit` pass.
- In `pnpm play`: create a custom `handover` module (to=task-git, mode=auto), attach it to a custom agent, save, reload — fields round-trip; the composition preview shows the badge.
- Editing a canonical (locked) handover from N142 is blocked/read-only.
- Saving an invalid handover (e.g. empty `to`) surfaces the schema validation error inline.

## Notes

- Depends on **N142** (schema + canonical modules). Pairs with **N144** (the flow-diagram side of the same data).
- Reuse patterns already in the file: `ModuleForm`'s per-kind `switch`, the locked mirror (`ModuleForm.tsx:157`), `AgentForm`'s ordered module list + `kindColor`, `FlowEditor.TriggerOptions` for the trigger picker.
- Keep diffs minimal; match the existing two-space + double-quote style.
