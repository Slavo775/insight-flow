# N96 — Project layer — agent flow map + global install — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-12
**PR:** https://github.com/Slavo775/insight-flow/pull/73
**Verdict:** approved

## Summary

Project layer (PR #73, `d9ab94a`): `ProjectSchema` with flow triggers constrained to `TaskStatusSchema` (the "fourth copy" drift mitigation — an invalid trigger fails validation, tested), `project/default.json` (9→10 agents post-N97, lifecycle + change-request loop), `install: ["activity"]` via the new bundle, `ACTIVITY_AGENT` dissolved with a one-time manifest-bucket rename (`activity` → `project:default`, no-op/no-clobber semantics tested), and the read-only `/project` page (BFS-layered flow map, trigger-labeled edges, install panel). Live-verified: playground migration kept hook groups stable + idempotent; `/api/project` and SPA route healthy. The descriptive-now/prescriptive-later contract is pinned in schema comments, loader header, and README. Verdict: **approved**.

## Checklist verification

- [x] Trigger validation against the real status enum (bad trigger fails a test) — pass
- [x] `default.json` referential integrity (agents ∈ COMPOSED_AGENTS, flow endpoints declared, install bundle-aware) — pass (loader throws; tested)
- [x] ACTIVITY_AGENT + composed/activity.json removed; install via emitter under `project:default` — pass
- [x] No-duplicate migration (playground verified; bucket renamed; second run idempotent) — pass
- [x] `/api/project` + `/project` page + nav link — pass (live)
- [x] Contract documented (code + README) — pass
- [x] Drift suite untouched — pass

## Blockers

None — approved.

## Non-blocking

1. **Stale-bucket edge**: a consumer that somehow has *both* an `activity` bucket and `project:default` (partial pre-release states) gets a no-op rename, leaving the old bucket lingering — harmless (nothing applies under it; adoption keeps settings clean) but unclean. A one-line "merge instead of skip" would tidy it; fine to leave given the shapes never co-shipped.
2. `layerAgents` BFS has a fixed guard (32 iterations) — fine for any plausible agent count; a comment noting the bound's intent would help future readers.
3. Edge `task-human-review → task-request-changes (on: done)` reads slightly odd (request-changes follows *testing* a done task) — semantically defensible for a descriptive map; revisit wording when the flow goes prescriptive.

## Security & edge cases

- `/api/project` serves static registry-derived data; no inputs. Loader validation happens at import time — a malformed shipped project fails the build/tests, not runtime.

## Notes

- The N97 follow-up already exercised the flow's honesty (git node added) — the layer is doing its job.
- Same-session caveat; human gate on PR #73.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-12
**Verdict:** approved

### Summary

Batch approval of N93–N97 with instruction to merge the full PR stack. Human's exact comment:

> please approved all of this task create invoke task git and merge via gh all 6 mrs

### Blockers

None — approved.

### Notes

- Merged via /task-git as part of the #69→#74 stack.
