# N14 — Reduce token consumption across insight-flow agents and CLI — Review

**Reviewer:** Task Reviewer (AI)
**PR:** none yet — work currently sitting in the local working tree (no branch / no GitHub PR)
**Verdict:** REQUEST CHANGES

---

## Summary

Eight token-saving changes were delivered: CLI JSON compaction, shared `GITHUB_PR_API.md` snippet, consolidated `TOKEN EFFICIENCY` footers, externalized TASK/CHECKLIST scaffolds, single-path `task-git.md`, automated role-template sync, new `insight-flow show --summary` command, and per-task `reviews.json` / `incidents.json` side files with server-side hydration.

After those landed, an out-of-scope pivot was added: the React app at `src/` was deleted entirely, the legacy server-rendered dashboard (`packages/taskflow/src/server/dashboard.ts`) was restored and its detail panel rewritten with structured (non-JSON) rendering, root build tooling (Vite, ESLint, Prettier, ~50 packages) was removed, and `node_modules` shrunk from ~1.0 GB to ~53 MB.

**Risk: medium.** Code is correct in the happy path, but one blocker breaks the idempotency of the migration command and the out-of-scope deletions render TASK.md's "Out of scope" section misleading for anyone reading the spec later.

## Checklist verification

- [x] All `JSON.stringify(payload, null, 2)` in `packages/taskflow/src/commands/*.ts` switched to compact form — verified, only `cmdStats` (`query.ts:113`) keeps pretty printing.
- [x] `GITHUB_PR_API.md` exists at repo root; `TASK_REVIEWER_ROLE.md` (L39) and `TASK_REVIEW_FIXER_ROLE.md` (L35) `@`-reference it.
- [x] `AGENT_ENFORCEMENT.md` carries shared `TOKEN EFFICIENCY (applies to every role)` block; each role footer trimmed to `TOKEN EFFICIENCY (see @AGENT_ENFORCEMENT.md …)`.
- [x] `packages/taskflow/templates/task/TASK.md.tpl` and `CHECKLIST.md.tpl` exist; `cmdCreate` writes them with `{{ID}}` / `{{TITLE}}` / `{{TYPE}}` / `{{PRIORITY}}` / `{{DATE}}` substitution and reports the paths in JSON output (verified on N14 itself).
- [x] `TASKMASTER_ROLE.md` no longer carries inline TASK.md / CHECKLIST.md scaffolds.
- [x] `.claude/commands/task-git.md` uses `gh pr create` only; `compare/main` URL branch removed.
- [x] `packages/taskflow/scripts/sync-role-templates.mjs` present; `pnpm sync-roles` works; `prepublishOnly` wires sync → build → typecheck.
- [x] All 8 root role files byte-identical to `packages/taskflow/templates/roles/` after `sync-roles`.
- [x] `insight-flow show --id Nxx [--summary]` returns lean compact JSON or hydrated full JSON.
- [x] `Task` type makes `reviews` / `incidents` optional; adds `reviewCount`, `lastReviewVerdict`, `openIncidentCount`.
- [x] Side files written by `review-{start,end}`, `fix-{start,end}`, `incident-{create,status,resolve}` mutations (verified `workTasks/N00-*/reviews.json` and others exist).
- [ ] **`insight-flow migrate-reviews` idempotent — FAILS, see Blocker 1.**
- [x] `/api/work-tasks/<shard>` HTTP endpoint hydrates side files into `task.reviews` / `task.incidents`.
- [ ] **`mergeFiles` in `data-loader.tsx` defaults missing arrays to `[]` — N/A, the React app was subsequently deleted. Checklist item is stale; see Non-blocking 2.**

## Quality gates

- [x] `pnpm typecheck` (taskflow package) — passes.
- [ ] `npx tsc --noEmit` from root — N/A, root `tsconfig.json` was deleted as part of the React removal.
- [ ] `pnpm lint` from root — N/A, root `eslint.config.js` was deleted.
- [x] `pnpm test` (taskflow) — 5/5 init tests pass.

## Blockers

### Blocker 1 — `migrate-reviews` is not idempotent; rerun corrupts `reviewCount` and `lastReviewVerdict` summary fields

- **File:** `packages/taskflow/src/commands/migrate.ts:108-136` (`cmdMigrateReviews`)
- **Symptom:** running `insight-flow migrate-reviews` a second time (after the first migration already split inline arrays) zeroes out every task's `reviewCount` on disk and sets `lastReviewVerdict` to `null` for tasks that previously had a non-null value.
  - Reproduced: `node packages/taskflow/dist/cli.js show --id N00 --summary` returned `"reviewCount":0` after a rerun, while `workTasks/N00-*/reviews.json` contains 2 reviews. `cmdStats` is unaffected because it reads side files directly, but `show --summary`, `cmdNextReview`, and any downstream consumer of `task.reviewCount` now read stale data.
- **Why:** the migration computes the summary from `task.reviews ?? []` after deleting the inline array. On second run, `task.reviews` is undefined (correctly absent), so the recompute sees an empty array and zeroes the fields.

```ts
// migrate.ts current
const hadReviews = Array.isArray(task.reviews) && task.reviews.length > 0;
if (hadReviews) saveTaskReviews(config, task, task.reviews ?? []);
// …
recomputeTaskSummary(task, task.reviews ?? [], task.incidents ?? []);
//                              ^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^
//                              empty on re-run → zeroes the summary
```

- **Fix:** read from side files (or the inline array) via the hybrid loader so re-runs are no-ops:

```ts
import { loadTaskReviewsHybrid, loadTaskIncidentsHybrid } from "../storage.js";
// …
if (hadReviews) saveTaskReviews(config, task, task.reviews ?? []);
if (hadIncidents) saveTaskIncidents(config, task, task.incidents ?? []);
const reviews = loadTaskReviewsHybrid(config, task);
const incidents = loadTaskIncidentsHybrid(config, task);
recomputeTaskSummary(task, reviews, incidents);
```

Then re-run `insight-flow migrate-reviews` once to restore the corrupted summary fields. After the fix, `show --id N00 --summary` should report `"reviewCount":2,"lastReviewVerdict":"approved"`.

### Blocker 2 — TASK.md scope is now misleading after the dashboard pivot

The "Out of scope" section of `workTasks/N14-*/TASK.md` currently states:

- "React dashboard `Task` type and consumer components — kept unchanged because server-side hydration preserves the contract."
- "Legacy server-rendered inline dashboard (`server/dashboard.ts`) — reads through the same hydrated `/api/work-tasks` endpoint, so no source change required."

Both are now false: `src/` was deleted in its entirety, and `server/dashboard.ts` was both modified (pretty detail panel) and made the canonical UI. A reader auditing the diff against this spec will be confused.

- **Fix:** either (a) amend TASK.md to record the scope pivot ("legacy dashboard becomes the only UI; React app removed"), update CHECKLIST.md to include the new items (`src/` deleted, `server/dashboard.ts` detail panel rewritten with `renderInfo` / `renderImplementation` / `renderReview` / `renderPush` / `renderIncident` / `renderStatusHistory`, root package.json slimmed, `node_modules` 1.0 GB → 53 MB, server `index.ts` legacy-only path), or (b) split the pivot into a new task `N15 — Consolidate to single server-rendered dashboard`. Either is acceptable; (a) is the more honest record since the work shipped together.

## Non-blocking

1. **`migrate-reviews` writes `shardsTouched` on every rerun.** Even when `tasksSplit` is empty, the shard JSON file is rewritten (mtime bumped). Cheap to fix when fixing Blocker 1 — only mark `shardChanged = true` when something actually changed.
2. **`workTasks/N02-*/REVIEW.md` etc. still exist** alongside the new `reviews.json` side files. They were the human-authored review documents and intentionally retained; flagging only so the new contributor isn't surprised.
3. **N14 task was never branched / pushed.** Implementation, including all eight checklist items plus the dashboard pivot, sits uncommitted in the working tree. `/task-git` was deliberately skipped (the working tree commingles the work with pre-existing modifications from before this session). Recommend a small `git add -p` pass to stage only N14-related files before commit, or accept a single bundled commit.
4. **`AGENT_ENFORCEMENT.md` mentions "Verify all CHECKLIST.md items before marking implemented or done"** — for retrospective tasks like N14 this is satisfied post-hoc by this review. Worth a one-line note in `TASKMASTER_ROLE.md` about retrospective task creation flow (status pre-set to `ready`, then manually advance via `status` / `implement-end` / `review-start`).
5. **No tests cover the new code paths.** `recomputeTaskSummary`, `loadTaskReviewsHybrid`, `hydrateShardJson`, and `cmdMigrateReviews` are all uncovered by automated tests. Init tests still pass but won't catch the kind of regression in Blocker 1. Consider adding a `migrate-reviews.test.mjs` that runs migration twice and asserts summary fields are stable.

## Security & edge cases

- `hydrateShardJson` in `server/index.ts` reads `<task.folder>/reviews.json` and `incidents.json` relative to `workDir` after stripping the leading path segment via `folder.replace(/^.*?\//, "")`. A maliciously crafted `task.folder` value containing `..` segments could escape `workDir`. **Likely safe in practice** because `task.folder` is written by `cmdCreate` to a deterministic slug-only path and the schema doesn't accept arbitrary strings, but the read path doesn't enforce containment. Suggest adding a `normalize` + `startsWith(workDir + sep)` guard mirroring the one removed from `serveUiFile`.
- The dashboard's new `renderIncident` interpolates `inc.severity` directly into a CSS class via string concatenation: `'severity-' + escHtml(inc.severity)`. Severity values come through the Zod schema as `z.string()` (any string). A creative severity like `"low; background:red"` would be HTML-escaped (`escHtml`) but, because it's pasted into a class name attribute, browsers tolerate weird characters. Either constrain `severitySchema` to a union enum (`"critical" | "high" | "medium" | "low"`) or sanitize the class fragment. Low impact — severity is set by the CLI, not external input.
- `prompt-build.ts` still lists the 8 role files for `@AGENT_ENFORCEMENT.md` patching. The list mirrors `scripts/sync-role-templates.mjs`. If either gets out of sync, a future role addition will silently miss one path. Consider deriving both from a single shared constant.

## Notes

- Plan file: `/Users/ssedlak/.claude-personal/plans/optimized-jumping-minsky.md` — used as the source of truth for the eight checklist items and approved by the user before implementation.
- Token-saving wins are real and verifiable: CLI compact JSON drops `next-review` / `current` / `show --summary` outputs to ~1 line each (vs ~10–15 lines pretty-printed); shards shrunk from 66 KB → 54 KB after side-file split (a larger win is expected as review history accumulates in future tasks); `node_modules` 1.0 GB → 53 MB after the dashboard pivot.
- Suggested follow-up after the two blockers land:
  - Rerun `insight-flow migrate-reviews` once (post-fix) to restore summary fields.
  - Decide on retrospective-task workflow guidance in `TASKMASTER_ROLE.md`.
  - Decide whether to bump CLI to `0.5.0` (schema v2 + new commands `show` / `migrate-reviews` + dashboard pivot is a minor bump in semver terms).

---

# Round 2 — Re-review after fixes

**Reviewer:** Task Reviewer (AI)
**Round:** 2
**Verdict:** APPROVED

## Summary

Both blockers and all actionable non-blocking items from round 1 are resolved. The fix kept the surface area tight (migration helper swap, server-side path guard, schema enum, dashboard whitelist map, regression test, doc amendments). No new code paths introduced beyond what round 1 called for.

## Blocker verification

### Blocker 1 — `migrate-reviews` idempotency: RESOLVED

`packages/taskflow/src/commands/migrate.ts:113-139` now loads canonical reviews/incidents via `loadTaskReviewsHybrid` / `loadTaskIncidentsHybrid` before calling `recomputeTaskSummary`. The previous bug (zeroing `reviewCount` on re-run) is gone.

End-to-end verification on this repo:

```
$ insight-flow migrate-reviews                # second run, post-fix
{"action":"migrate-reviews","tasksSplit":[],"shardsTouched":[]}

$ insight-flow show --id N00 --summary
... "lastReviewVerdict":"approved","reviewCount":2,"openIncidentCount":0 ...
$ insight-flow show --id N08 --summary
... "lastReviewVerdict":"approved","reviewCount":3,"openIncidentCount":0 ...
```

Both `tasksSplit` AND `shardsTouched` empty on re-run — also closes Non-blocking #1 (shard rewrite on no-op). Summary fields match each task's actual `reviews.json` content.

### Blocker 2 — TASK.md scope mismatch: RESOLVED

- `Modified: 2026-05-22` line added.
- Goal #7 ("Scope pivot, added after initial implementation") documents the dashboard consolidation.
- New "In scope (added 2026-05-22 with the dashboard pivot)" block enumerates every deleted file + every restored/rewritten helper (`renderInfo`, `renderImplementation`, …, `severityChip`).
- Two false "Out of scope" bullets (React kept unchanged, `server/dashboard.ts` untouched) removed.
- Implementation plan grew a step 9 covering the pivot with file-level detail.
- Verification + Notes sections refreshed to point at the new commands and the post-fix expected outputs.

`CHECKLIST.md` similarly amended: 12 new ticked items under "Done criteria — dashboard consolidation pivot", root-level quality-gate items marked `[N/A]` with explanation (root `tsconfig.json` / `eslint.config.js` removed alongside the React app), verification commands updated.

The spec now matches what was actually delivered.

## Non-blocking verification

| # | Item | Status |
|---|---|---|
| 1 | shard write on no-op rerun | RESOLVED — `summaryChanged` guards `shardChanged`; verified `shardsTouched:[]` above |
| 2 | orphan `REVIEW.md` files | acknowledged in round 1 — intentionally retained, no change required |
| 3 | uncommitted working tree | acknowledged — caller-driven decision at commit time, no code change |
| 4 | retrospective-task workflow doc | deferred (one-line doc note) — appropriate to defer; not a blocker |
| 5 | no tests for new code paths | RESOLVED — `packages/taskflow/test/migrate-reviews.test.mjs` (2 tests: first-run split + re-run idempotency); wired into `pnpm test`; **7/7 pass** |

## Security & correctness re-checks

- **`hydrateShardJson` containment**: `server/index.ts:32-43` now normalises the resolved task folder and refuses paths outside `workDir + sep` (also handles the `folderPath === normalize(workDir)` edge). On the guarded path it defaults `task.reviews` / `task.incidents` to `[]` so the consumer still sees the contracted shape — good failure mode.
- **Severity enum**: `schema/index.ts:58` `IncidentSeveritySchema = z.enum(["critical","high","medium","low"])`. Existing `IncidentSchema.severity` now references it. The few existing incidents on disk all use values already in the enum, so the schema tightening is a no-op for the migrated repo (no data invalidation).
- **`severityChip`**: `dashboard.ts:323-327` looks up CSS class via a frozen `SEVERITY_CLASS` map (`critical`/`high`/`medium`/`low`) and falls back to `severity-medium` for anything else. The class fragment is no longer derived from user-provided text. `escHtml(sev || 'medium')` still escapes the label text itself.

## Quality gates (post-fix)

- `pnpm typecheck` (taskflow) — passes.
- `pnpm build` (taskflow) — clean.
- `pnpm test` — 7/7 (5 init + 2 migrate-reviews).
- Live dashboard at `:6006` — title "Taskflow Dashboard"; `SEVERITY_CLASS` whitelist present in served HTML; hydrated `/api/work-tasks/tasks-N00-N09.json` returns N00 with 2 reviews matching `reviewCount`.

## Notes

- No further blockers. Verdict approved — the task is implementation-complete.
- Next sensible step is to ship: a single commit (or staged sequence) for the working tree, then a CLI version bump to `0.5.0` per the CHANGELOG notes in TASK.md.
- The deferred items 3 (commit decision) and 4 (retrospective-task workflow doc note in TASKMASTER) are not gating — both are caller-driven choices, not code defects.
