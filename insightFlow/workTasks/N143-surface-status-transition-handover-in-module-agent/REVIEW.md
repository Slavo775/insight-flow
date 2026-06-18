# N143 — surface status-transition + handover in module/agent editors (CRUD, locked read-only) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-17
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

`ModuleForm` gains `status-transition` + `handover` kinds with correct field-sets, serialize round-trip, and a kind-aware locked guard; `AgentForm`'s generic picker + the new `kindColor` entries cover composition. The *editors* are correct. But the change set left a sibling read surface — `ModuleDetail` — stale relative to the new locked-by-kind rule, producing a broken/inconsistent affordance on shipped canonical modules. One blocker; the rest are non-blocking polish.

## Checklist verification

- [x] `status-transition` + `handover` in `EditableKind`/`KINDS`/`KIND_LABELS` — pass
- [x] Field-sets render (transition: agent/sets/from?; handover: to/on?/mode/label?) — pass
- [x] `toRecord`/`fromModule` round-trip the new fields — pass
- [x] `AgentForm` add/reorder/remove (generic picker; `kindColor` badges) — pass
- [~] Locked canonical modules read-only **in both editors** — **partial**: ModuleForm guard correct (`isLockedModuleClient`), but ModuleDetail still uses the 3-id set → see Blocker 1
- [x] `kindColor` entries for both kinds — pass
- [x] Delete-guard: deleting a custom handover referenced by an agent is blocked (`custom-defs.ts referencingIds` checks `agent.modules.includes`) — pass

## Blockers

1. **`ModuleDetail.tsx` lock check is stale → broken Edit link on locked canonical modules.** `ModuleHeader` (`ModuleDetail.tsx:276,279`) gates the "· locked" badge and the `Edit` link on `LOCKED_MODULE_IDS.has(module.id)` — the 3-id baseline only. A shipped canonical handover/status-transition module (e.g. `task-implement/handover-git-implemented`) is locked **by kind**, not by id, so its detail page renders an **"Edit" link that dead-ends** at ModuleForm's read-only guard, and omits the "· locked" badge. This directly contradicts the spec's "locked canonical modules remain read-only" and the ModuleForm behavior.
   - **Why:** N143 introduced locked-by-kind modules but only taught ModuleForm about it; ModuleDetail wasn't updated.
   - **Fix:** mirror `isLockedModuleClient` (id-set OR built-in `status-transition`/`handover`) in `ModuleDetail.ModuleHeader` for both the "· locked" badge and the Edit-link gate. Extract the helper to a shared client util so ModuleForm + ModuleDetail can't drift again.
   - **✅ Resolved (fix round 1):** extracted `LOCKED_MODULE_IDS` + `isLockedModuleClient` to new shared `client/locked.ts`; `ModuleForm` and `ModuleDetail` both import it (no local copies remain). `ModuleDetail.ModuleHeader` now uses `isLockedModuleClient(module)` for the locked badge + Edit-link gate, so shipped canonical handover/status-transition modules show "· locked" and no Edit link. Gates green: 244/244 tests, package + client `tsc --noEmit` clean, build OK. Non-blocking items (KindPanels/facetLabel/AgentDetail legend) left as-is per scope guard.

## Non-blocking

1. **`KindPanels` (`ModuleDetail.tsx:178`) has no `status-transition`/`handover` case** → `default: return null`, so the detail page of a custom handover shows no `to`/`on`/`mode`. Add two small panels (mirror the `hook`/`mcp-server` KV style).
2. **`facetLabel` (`ModuleDetail.tsx:289`)** falls to `default: module.kind` for the new kinds — uninformative. Add `handover → "→ {to} ({mode})"`, `status-transition → "sets {sets}"`.
3. **`AgentDetail.tsx:51`** legend `KINDS = ["section","include","mcp-server","hook","skill"]` omits `handover`/`status-transition` (and `bundle`, pre-existing) — agents now carry handover nodes whose kind won't appear in the legend. Add them.
4. **Custom-flow statuses not selectable**: the `sets`/`on`/`from` pickers offer only `TASK_STATUSES`, not a custom flow's own `Project.statuses`/`states`. Acceptable for the shipped canonical flow; note as a follow-up for custom flows.
5. No automated test (UI). The schema round-trip is covered transitively (server reuses `AgentModuleSchema`, N142 tests it); manual playground verification recommended.

## Security & edge cases

- Custom-id namespacing intact: new modules save as `custom:<tail>`; the locked-by-kind rule does not block custom handovers from being created/edited. Verified.
- Delete guard for the new kinds is covered by the existing `referencingIds` agent-membership check — no dangling references possible.

## Notes

Depends on N142 (merged in this branch). The blocker is a ~10-line fix in one file. Re-review after the ModuleDetail lock fix; the non-blocking items can ride along since they touch the same file.


---

## Round 2 — approved

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-18
**Verdict:** approved

### Summary

Re-review of the Round 1 blocker fix. The lock check was extracted to a shared `client/locked.ts` (`LOCKED_MODULE_IDS` + `isLockedModuleClient`) and both `ModuleForm` and `ModuleDetail` import it — the two surfaces can no longer drift. Blocker resolved; approving.

### Checklist verification

- [x] Blocker 1 — `ModuleDetail.ModuleHeader` now gates both the "· locked" badge and the Edit link on `isLockedModuleClient(module)` (kind-aware), not the 3-id set — pass
- [x] Shared helper `client/locked.ts` is the single source; no local `LOCKED_MODULE_IDS` copies remain in `ModuleForm`/`ModuleDetail` (verified: 0 direct refs) — pass
- [x] No other module-edit entry point gates on a stale lock — `ModulesPage`/`AgentsPage` have no lock logic; the module Edit affordance lives only in `ModuleDetail` — pass
- [x] Gates: 244→246 tests pass, package + client `tsc --noEmit` clean, build OK — pass

### Blockers

None — Round 1 blocker resolved.

### Non-blocking

Round 1's non-blocking items remain open by design (scope-guarded out of the fix): `KindPanels`/`facetLabel` cases for the new kinds, and the `AgentDetail` legend `KINDS`. Carry them as a small follow-up or fold into a later polish pass — none block approval.

### Security & edge cases

- Custom (`custom:`) handover/transition modules stay editable (the shared helper only locks built-in/non-custom of those kinds) — confirmed against `locked.ts`.
- `AgentDetail.tsx:100` agent Edit link is unrelated (agent, not module; pre-existing behavior).

### Notes

Clean fix — extracting the helper is the right call (prevents future drift). N143 ready to move forward with the round.


---

## Round 3 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-18
**Verdict:** approved

### Summary

Project owner approved the full handover round (N142–N146) and authorized creating the PR + merging via gh, then rebuilding into the is-test project.

### Blockers

None.

### Suggestions (non-blocking)

None raised.

### Notes

Human's exact words: "approved all please create prs and merge it via gh also please build it and pass it into is-test project"
