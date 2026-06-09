# N84 — Adopt the Storage port across CLI commands — route call sites through jsonFileStorage — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-09
**PR:** https://github.com/Slavo775/insight-flow/pull/59
**Verdict:** approved

## Summary

Mechanical, behavior-preserving migration of the CLI layer onto the N81 `Storage` port. All 11 command modules in `cli/commands/*` now route the 10 port methods they use (`loadTaskById`, `loadAllTasks`, `loadMaster`, `saveMaster`, `loadShard`, `saveShard`, `getShardFileName`, `ensureShardExists`, `saveTaskReviews`, `saveTaskIncidents`) through the `jsonFileStorage` singleton instead of importing the `storage.ts` free functions directly (`cli.ts` was already on the port from N81). Non-port helpers (`now`, `resolveId`, `parseTaskNum`, `recomputeTaskSummary`, `loadTaskReviewsHybrid`, `loadTaskIncidentsHybrid`, `getWorkDir`/`getMasterPath`) are correctly left as direct imports. **Low risk** — the port delegates to the same functions; only call-site routing changed.

## Checklist verification

- [x] CLI + command call sites use `jsonFileStorage` / the `Storage` port — **pass**. All 12 `cli/` modules import from `storage-port.js`; reviewer's bare-port-call scan returns zero un-migrated call sites.
- [x] No behavior change (port delegates to the same functions) — **pass**. Independently re-ran the full suite: **87/87** green (the suite exercises `create`/`next`/`show`/`stats`/etc. end-to-end).
- [x] Future backend swappable at a single wiring point — **pass**. The `jsonFileStorage` binding in `storage-port.ts` is the one place to swap.
- [x] `typecheck` — **pass** (re-run clean; also enforced by the pre-commit hook).
- [x] `test` — **pass** (87/87).
- [x] Verification: `grep` confirms port adoption + zero bare calls; suite green proves behavior preserved — **pass**.

## Non-blocking

1. **Read paths for reviews/incidents stay off the port.** The CLI reads reviews/incidents via `loadTaskReviewsHybrid` / `loadTaskIncidentsHybrid` (inline→side-file fallback), so the port's `loadTaskReviews` / `loadTaskIncidents` (and `getShardPath` / `ensureWorkDir`) are now unused by callers. This is explicitly scoped out in TASK.md ("side-file/util helpers … not part of the `Storage` port"), so it's a documented boundary, not a defect — but the seam is therefore not yet 100%. A real backend swap would still need to cover the Hybrid read paths + `getReviewsPath`/`getIncidentsPath`/`recomputeTaskSummary`. Worth tracking for whenever a second backend actually lands.
2. **Singleton-import vs DI.** The chosen style means a future swap is "rebind/replace `jsonFileStorage`," not "inject a different `Storage`." ANALYSIS weighed this and called DI over-engineering until a second backend exists — agreed; correct YAGNI call.

## Notes

- Purely internal storage-call routing — no change to agent lifecycle, server federation, notifications, or the activity pipeline, so the `docs/architecture-diagrams.md` update gates don't apply.
- Implementation branch was rebased onto current `main` (it had been cut from pre-N82 `main`) and force-pushed to PR #59; N84 is independent of the still-unmerged N83.
- Follow-up candidate: extend the port to cover the Hybrid read paths + side-file helpers if/when an alternative backend is scheduled (closes the remaining seam gap).
