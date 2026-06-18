# N142 — handover module kind — schema + compose render + locked canonical set — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-17
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Adds the `handover` agent-module kind (schema + compose render + locked canonical set), mirroring `status-transition` (N128) faithfully. Mechanism is clean and well-scoped; no runtime/state behavior changed (descriptive only). Risk: low. The only material side effect is regenerating 9 shipped `*_ROLE.md`, which is correctly gated by the byte-identical drift test (passing).

## Checklist verification

- [x] `handover` kind in `AgentModuleSchema` (`core/schema/index.ts`) with `{to, on?, mode(default gated), label?}` — pass
- [x] `handoverSection` + `composeAgent` wiring renders `## Handover` with `deriveCommandName(to)` — pass
- [x] Canonical modules in `agents/modules/handovers.json`, registered in `MODULE_REGISTRY`, locked via `user-registry.ts` `isLockedModule` (kind === "handover") — pass
- [x] Wired onto the right agents; matches `default.json` edges (analyze→taskmaster gated, →task-git auto, rest gated) — pass
- [x] `*_ROLE.md` regenerated; drift guard byte-identical; `task-incident` correctly unchanged — pass
- [x] Tests: auto/gated/default-mode + multi-handover collapse — pass (244/244)

## Non-blocking

1. **Multi-handover position** (`compose.ts` composeAgent): the combined `## Handover` section renders at the *first* handover module's position and lists *all* handovers regardless of interleaving. Correct for the canonical agents (handovers are adjacent before `actions`), but if a future author interleaves handover modules with other sections, the others silently relocate into the combined block. Consider documenting "keep handover modules contiguous" or asserting adjacency. Cosmetic only.
2. **`task-human-review → task-git (approved)` is `auto`** — i.e. on human approval the recorder may chain `/task-git`, which can perform a merge. This is by-design (you chose →git = auto) and the merge stays gated by `AgentGitPermissions` + the N145 HANDOVER DISCIPLINE clause, so it's safe — but it's the highest-consequence auto edge. Worth a sentence in the README/CLAUDE.md when documented.

## Security & edge cases

- Locked-by-kind is correct: built-in `handover`/`status-transition` cannot be ejected (`readKind` rejects a non-custom locked id); `custom:` handovers remain allowed. Verified against `user-registry.ts`.
- `handover` contributes nothing to `collectArtifacts` (non-text kind ignored) — no MCP/hook/skill leakage. Correct.

## Notes

Foundation for N143/N144/N145. Sibling of N128/N131/N133. Clean, idiomatic, matches house style.


---

## Round 2 — Human Review

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
