# N144 — flow-diagram honesty — auto/gated badges + orphan-edge warnings — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-17
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Adds a pure, unit-tested `edgeHandover`/`isEdgeBackedByHandover` helper and uses it in both `FlowMap` (read-only) and `FlowEditor` to badge edges with their handover mode (auto/gated) and flag orphan edges (dashed red), plus an orphan-warning list and legend. `ProjectPage` joins handovers from the registry and passes them down. Purely presentational — no behavior change. Risk: low.

## Checklist verification

- [x] Pure helper added + unit-tested (`flow-status.ts`, `flow-status.test.mjs`) — pass
- [x] auto/gated mode badge on edges in `FlowMap` + `FlowEditor` — pass
- [x] backed vs orphan visually distinct (stroke color + dashed) — pass
- [x] orphan edges listed in a non-blocking warning (FlowEditor) — pass
- [x] legend explains auto/gated/orphan (both surfaces) — pass
- [x] no behavior change / status writes / handover picking — pass

## Non-blocking

1. **`FlowEditor` `initialEdges` seeds once per `project.id`** with `handoversByAgent` at mount (deps intentionally `[project.id]`). If the registry resolves *after* the editor mounts, existing edges won't restyle until re-seed. In practice the editor is opened behind an "Edit" button (registry already loaded via `ProjectPage`), so this is latent. If you want robustness, re-derive edge style in a `useEffect` keyed on `handoversByAgent` (careful not to clobber in-flight user edits) — optional.
2. **`ProjectPage` `handoversByAgent` join is untested** (runtime client glue). The pure matching rule is well-covered; the registry-join (AgentModuleRef `kind` filter → `registry.modules` lookup) is manual-verify only. A light component/integration test would lock it.
3. Edge label now concatenates trigger + tag (e.g. `implemented  · auto`); on dense graphs labels lengthen. Acceptable.

## Security & edge cases

- `edgeHandover` matches trigger-less edges correctly (`(h.on ?? "") === (edge.on ?? "")`). Verified by test (analyze→taskmaster).
- Orphan detection degrades gracefully when `handoversByAgent` is `{}` (every edge orphan) — no throw. Default prop `{}` on both components.

## Notes

Depends on N142 (data) + N143 (so custom agents can carry handovers to back edges). Correctly realizes the "diagram can lie" mitigation from the analysis. On the default project there are zero orphans (canonical handovers mirror the flow), which is the intended self-consistency check.


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
