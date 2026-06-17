# N134 — Review

**Verdict:** APPROVED
**Reviewer:** AI (task-review)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/100

## Summary

N134 puts a UI onto the pre-existing, routing-critical `entryAgents` field
(which already drives `insight-flow create`'s flow selection). A
"Set as start point / Unset start point" toggle in the `FlowEditor` node popover
mutates the edit draft's `entryAgents` (multiple allowed); Save persists it; ★
badges mark start points on the editor canvas and the read-only `FlowMap`; the
sidebar vocabulary moves from "main" to "start point". Diff is confined to 3
client files — no schema/server/CLI change, as scoped. Gates: typecheck, lint
(0 errors), build, and 219/219 node tests all green.

## Checklist verification

- [x] Toggle in node popover beside "Remove from flow" — `FlowEditor.tsx` popover,
      `toggleEntry`, label flips on `entryAgents.includes`.
- [x] `FlowDraft` carries `entryAgents`; toggle reports a dirty draft —
      `FlowDraft.entryAgents`; `toggleEntry → report → onDraftChange → setDirty(true)`.
- [x] `saveDraft` persists `draft.entryAgents` filtered to agents — `ProjectPage.tsx`.
- [x] ★ on start-point nodes in `FlowEditor` (useEffect) and read-only `FlowMap` (badge).
- [x] Sidebar reads "start point" (no "main").
- [x] No schema / server / `create.ts` changes — verified against `git diff main...HEAD`.

## Non-blocking

1. **Label source drift (cosmetic).** The badge `useEffect` relabels every node via
   `titleOf()`, whereas the initial seed used `project.agentTitles[a] ?? a`. Values
   normally match and `titleOf` is the more complete source, so this is a wash — just
   noting the two label paths exist.
2. **`report()` recomputes node positions on a pure entry-toggle.** Harmless; the cost
   is trivial and it keeps the draft self-consistent.

## Security & edge cases

- `entryAgents` is persisted through the existing `saveDefinition("projects", …)`,
  whose `ProjectSchema` validates `entryAgents ⊆ agents` server-side; the client also
  double-filters (in `report` and `saveDraft`). Removing an agent drops it from the
  start-point set (`removeAgent`). Empty set → sidebar "(no start point …)". No new
  input or injection surface.

## Notes

- Interactive (`pnpm play`) verification was not run by the AI review; behavior was
  verified against the diff + automated gates. Recommend a quick manual toggle-and-save
  pass during human review to confirm the ★ persists and the draft round-trips.
