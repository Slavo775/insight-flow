# N174 — Installable & uninstallable agents and modules (dashboard) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-23
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Generalizes the N125 flow-install engine into a `{ kind: flow | agent | module, id }` install target and adds dashboard install **and** uninstall for all three, reusing the existing emitter, N165 inputs/conflict, and N172 snapshots. Server core (`flow-install.ts` target dispatch, `emit.ts` reference-safe ownership + uninstall + `project:`→`flow:` migration) is the substance; the client generalizes one modal and adds buttons. Risk is moderate but well-contained: `tsc` (server + client) and the build pass, a new 6-case test file covers the ownership/uninstall/migration core, and I confirmed the full HTTP loop against a live `insight-flow ui` (install-plan, 400 on non-installable, install writes the command, uninstall removes it). Approving with non-blocking hardening notes.

## Checklist verification

- [x] Install engine generalized to `{kind,id}` target; flow wrappers preserved — `flow-install.ts` `targetArtifacts`/`installPlan`/`requiredInputs`/`targetBucketId`, `flowArtifacts`/`flowInstallPlan`/`flowRequiredInputs` kept as wrappers. **pass**
- [x] Agent install composes prompt + module artifacts, prompts for `${VAR}` — force-emits the composed prompt when not opted-in; `requiredInputs(target)` + server input resolution reused. **pass** (verified: `/api/install-plan?kind=agent&id=taskmaster` → command step)
- [x] Module install for mcp/skill/hook (+bundle expands); non-installable rejected & hidden — `NotInstallableError` (server 400), client `isInstallableModule` gates the buttons. **pass** (verified: `testing/prompt` → 400, `testing/skill` → 200)
- [x] Per-target buckets + reference counting + migration — `emit.ts` `migrateBuckets`, `mcpServers`/`mcpSnapshots` in manifest. **pass** (test: legacy `project:default`→`flow:default`)
- [x] Uninstall removes only when last owner gone, restores N172 snapshots — `uninstallTarget`/`uninstallPlan` + `collectClaimsExcept`. **pass** (test: shared artifact retained until last owner; snapshot restore)
- [x] Dashboard Install/Uninstall buttons on agent + module, Uninstall on flow — `AgentDetail.tsx`, `ModuleDetail.tsx`, `ProjectPage.tsx`. **pass**
- [x] New API routes reuse input/conflict/SSE — `/api/install[-plan]`, `/api/uninstall[-plan]`, `uninstall-progress` SSE. **pass**

## Non-blocking — resolution (post-approval, requested by human)

- **#1 Dead code — FIXED.** Removed `/api/flow-install` + `/api/flow-install-plan` (server) and `fetchFlowInstallPlan`/`runFlowInstall` (client `api.ts`). The two `custom-defs-api.test.mjs` cases that covered them were migrated to the generic `/api/install[-plan]?kind=flow`. Added `UnknownTargetError` so the generic endpoints preserve the old 404-on-unknown-flow semantics (was 500 on POST).
- **#2 Recompute — FIXED.** `targetArtifacts` is now composed once per request; `planFromArtifacts` / `inputsFromArtifacts` are exported and reused in both `/api/install-plan` and `/api/install` (was up to 3× per call).
- **#4 Stale comment — FIXED.** `emit.ts` header now describes per-target bucketing.
- **#3 `$ARGUMENTS` parity — DEFERRED (not a bug in N174).** Verified the N174 paths are internally consistent: for the *same* agent, flow-install and agent-install emit identical command bodies (opted-in → `collectArtifacts`, no `$ARGUMENTS`; non-opted-in → force-emit with `$ARGUMENTS`, matching the existing flow force-emit). Making them differ would trip the shared-ownership conflict guard. The only gap is opted-in vs non-opted-in *different agents*, which is pre-existing N138 behavior; unifying it means changing `collectArtifacts` + init parity + several fixtures — out of scope for this task. Left as a follow-up.
- **Edge case (multi-owner mcp snapshot loss) — DEFERRED** as recommended in the original review.

Re-verified after the fixes: server + client `tsc` clean, build clean, full suite 306/306, live HTTP smoke (generic install/uninstall, unknown id → 404, old routes gone).

## Non-blocking (original review)

1. **Dead code after the cutover** — the client now routes flow install through the generic `/api/install` (kind=flow), leaving `/api/flow-install` + `/api/flow-install-plan` (server `index.ts:796,820`) and `fetchFlowInstallPlan`/`runFlowInstall` (`api.ts:253,289`) unreferenced by the UI. Behavior is identical (same `flow:<id>` bucket), but it's two copies of the install path that can drift. Suggest deleting them, or making the flow routes thin shims over the generic handler.
2. **Recomputation per request** — `/api/install` calls `targetArtifacts` three times (`requiredInputs`, `targetArtifacts`, `installPlan`), re-composing the agent prompt each time. Mirrors the pre-existing flow pattern so not new, but a single `const art = targetArtifacts(target)` threaded through `planFromArtifacts`/`inputsFromArtifacts` would halve agent-install work.
3. **`$ARGUMENTS` parity** — an agent force-emitted by `targetArtifacts` (not opted into `command.install`) gets `\n\n$ARGUMENTS\n`, but an opted-in agent's command (via `collectArtifacts`) does not. Cosmetic; consider unifying so the installed slash command behaves identically either way.
4. **Stale comment** — `emit.ts` header still says hooks are "bucketed per agent id"; buckets are now per-target (`flow:`/`agent:`/`module:`).

## Security & edge cases

- Path-traversal: safe. Target `id` is only ever looked up in the registry (unknown → throw) or used to build a manifest *key* (`module:<id>`); artifact file names come from schema-validated slugs, never from request input. Uninstall reads names from the manifest it previously wrote.
- **Snapshot loss across multi-owner overwrite (edge case, non-blocking):** if two targets both force-overwrite the *same pre-existing* `.mcp.json` entry, the N172 snapshot lives only in the first installer's bucket. Uninstalling that bucket while the second still owns the entry discards the snapshot (entry retained as the managed value); a later uninstall of the second owner then *deletes* the entry instead of restoring the user's original. Single-owner (the common path, and what the test covers) restores correctly. Hardening: on uninstall of a retained artifact, transfer `mcpSnapshots` to a surviving owner. Acceptable to defer.

## Notes

- Deviation acknowledged & sound: `projectBucketId` changed `project:<id>`→`flow:<id>` to satisfy the per-target scheme; covered by `migrateBuckets` + a migration test, and init's lifecycle-hook install (`activity-hook.ts`) picks it up via the same helper. No test regressions attributable to it.
- Full suite: only the pre-existing flaky server-boot tests (`master-boot`, `log-activity`) fail under parallel load; both pass in isolation. No ESLint configured (per CLAUDE.md).
- Not yet pushed / no PR — reviewed against the working tree.


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-23
**Verdict:** approved

### Summary

Human verdict (verbatim): "approved done create branch commit prush PR and merge it via gh thanks"

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

Approved with no blockers. Instructed to create the branch, commit, push, open the PR, and merge it via `gh`.
