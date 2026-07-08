# N203 — Composer review v2 — unify AI + human review into one dual-mode agent + consolidated requirements — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-07
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Prompt/flow-definition + docs change (no runtime logic). Merges `authoring-review` + `authoring-human-review` into one dual-mode `authoring-review` (AI pass fans out to the 4 reviewer subagents and verifies the authoring requirements; human pass records feedback; mode by feedback presence), removes the separate human-review agent, and consolidates all 8 requirements into the existing `composer-authoring-conventions` module (adds *minimal* + *no name collision*, sharpens *guarded small adjustments*), deleting the analyst's duplicate restatements. Everything validates, the full suite passes, and the change faithfully implements the approved spec. **Approved**, with one prominent non-blocking design note about AI→human sequencing (an accepted tradeoff from the analysis).

## Checklist verification

- [x] `COMPOSER_RULES` states all 8 requirements once — *minimal* + *no name collision* added, small-adjustment rule sharpened (own `custom:` + unreferenced + behaviour-preserving). Verified: rules render once in `authoring-analyze`/`authoring-implement` via the conventions module.
- [x] `authoring-review/identity` dual-mode (AI mode: reviewer subagents + requirement verification + `--type ai` + REVIEW.md; human mode: record + `--type human`); intent by feedback presence + "prior AI review" guard. Verified in the composed prompt.
- [x] `authoring-human-review/identity` removed; `recorder-discipline` + `→ test` handover folded onto `authoring-review`.
- [x] `authoring-analyze/identity` deduped (custom-only/secrets/registry restatements dropped; method kept); rules still render via conventions. `authoring-implement/identity` retains only terse method ("reuse what the analyst flagged"), no rule restatement.
- [x] `composed/authoring.json` — `authoring-human-review` deleted; `authoring-review` composes `recorder-discipline` + the 4 reviewer subagents.
- [x] `project/authoring.json` — 6 agents; edges `implement --implemented|fixed--> review`, `review --fix-needed--> implement`, `review --approved--> test`; description updated.
- [x] `handovers-authoring.json` — single `authoring-review/handover-test` (gated, `when` = human approved, not merely AI); `authoring-human-review/*` removed.
- [x] Docs — `agents-and-subagents.md` (6 agents, reviewer row rewritten), `walkthrough.md`, `index.md` updated; no stale `authoring-human-review` anywhere.

## Verification performed

- `composer-authoring` loads via the real loader: **6 agents**, no dangling endpoints, valid path to `done`; all 6 compose. `fix-needed` → implementer; `review --approved--> test`.
- `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **321 / 321** ✅ · `eslint` → **0 errors** (2 pre-existing warnings in an untouched file).
- Rendered `authoring-review` carries both modes, the intent rule, the requirements checklist, and recorder discipline. `recorder-discipline` still referenced by ≥2 agents (task-human-review, task-request-changes, authoring-review) — the N91 shared-module test passes.

## Blockers

- None.

## Non-blocking

1. **AI→human sequencing is prompt-driven, not graph-driven (accepted tradeoff).** With one review agent and the tracker's single `approved` status, after the **AI** pass approves the flow's only edge is `review --approved--> authoring-test`. There is no graph edge representing the human pass, so `insight-flow` nextSteps will point at `test` after AI approval — a user who follows the graph literally could skip the human pass. Safeguards in place: the `authoring-review/handover-test` handover is **gated** with `when` = "the human approved … not merely AI approval", and the reviewer prompt says to await the human pass before advancing. This was explicitly flagged non-blocking in `ANALYSIS.md` and accepted. *If you later want it graph-enforced,* the clean fix is a distinct `ai-approved` status (`review --ai-approved--> review` for the human pass, `review --approved--> test`), which requires a core CLI change to `review-end --type ai` — out of this task's composer-flow-definition scope.
2. **Reviewer identity re-lists the requirements checklist** (minimal, valid MCP JSON, secrets, no collision, reuse, read-only, custom-only). This is the reviewer's verification list, not the authoritative rule wording (which lives once in `COMPOSER_RULES`), so it's defensible — but it is a light restatement. If you want *zero* duplication, trim it to "verify against every authoring requirement (see the conventions)". Minor; current form is more actionable.

## Security & edge cases

- No executable code, input handling, or auth surface — prompt text + flow JSON + one test-assertion + docs. `review-security` / `review-correctness` subagents not applicable. No concern.

## Notes

- Fourth in the composer-v2 series (N200 analyze, N201 taskmaster, N202 implementer builds+fixes, N203 review unified). Consistent dual-mode pattern throughout. Targets `agents-approved`, like its siblings.
- Consumer projects that already installed the composer flow keep a stale `task-authoring-human-review` command artifact until a flow re-install — noted out of scope in the spec (same as N202's `task-authoring-fix`).

---

## Post-approval enhancements (task-review-fix — both non-blocking notes)

Applied after approval, at the human's request (they chose "Both notes"). The fix
lifecycle could not run (`fix-start` requires a `fix-needed` review, and this task
was approved), so the changes were applied directly on the branch; **a fresh
`/task-review` is recommended to re-approve.** N203 itself is tracked on the
`default` flow, so its own review lifecycle is unaffected by the CLI change below.

**Note 1 — AI→human sequencing is now graph-enforced (was prompt-only).**
- `project/authoring.json`: added a distinct **`ai-approved`** status and a self-edge `authoring-review --ai-approved--> authoring-review`; kept `--approved--> authoring-test`. Updated the flow description.
- Core CLI `cli/commands/review.ts` + `status-write.ts`: `review-end --type ai --verdict approved` now writes **`ai-approved`** *only when the task's flow declares that status* (new exported `flowDeclaresStatus` helper). The **default flow declares no `ai-approved`**, so base-flow `task-review` behaviour is byte-identical — verified.
- `authoring-review/identity`: mode intent now keys off status — `ai-approved` → human mode — with `ai-approved` as the concrete guard so an empty pass can't stand in for the AI review.
- Effect: after the AI pass approves, `insight-flow` nextSteps points back to the **review agent** (human pass), not `test`; only the human approval (`approved`) advances to `test`. The human pass can no longer be skipped.

**Note 2 — reviewer identity de-duplicated.** Trimmed the inline 7-item requirements list in `authoring-review/identity` to a reference: "verify it meets **every authoring requirement stated in the conventions above**". The canonical list now lives only in `COMPOSER_RULES`.

**Verification:** `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **322 / 322** (added a test asserting composer declares `ai-approved`, default does not, and nextSteps sequence ai-approved→review→…→approved→test) ✅ · typecheck ✅ · lint 0 errors ✅. Loader checks: composer 6 agents + `ai-approved` status + self-edge; default flow has no `ai-approved`; all 6 compose; reviewer references the conventions (trimmed).


---

## Round 2 — AI re-review (post-approval enhancements: graph-enforced sequencing + dedupe)

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-08
**Verdict:** approved

### Summary

Re-review of the two post-approval enhancements — the `ai-approved` graph-enforced sequencing (incl. the shared `review-end` CLI change) and the reviewer de-dup. The CLI change is correctly **flow-gated** and safe for the default flow; the flow/agent changes validate; the full suite passes (322). **Approved**, with two minor non-blocking hardening suggestions (neither affects the guided flow).

### Checklist verification

- [x] `project/authoring.json` — `ai-approved` status added; self-edge `authoring-review --ai-approved--> authoring-review`; `--approved--> test` kept; description updated. Loader: composer declares `ai-approved`, default does not.
- [x] `review.ts` / `status-write.ts` — AI approval maps to `ai-approved` **only when the flow declares it** (`flowDeclaresStatus`). Default flow byte-identical (test asserts default has no `ai-approved`).
- [x] `authoring-review/identity` — mode keys off `ai-approved` status; requirements list trimmed to a reference to the conventions (Note 2). Verified in the composed prompt.
- [x] nextSteps: `ai-approved` → `authoring-review` (human pass); `approved` → `authoring-test`. Human pass can't be skipped by following the graph.
- [x] Docs (`agents-and-subagents.md`, `index.md`) reflect the loop. New test `N203: composer review sequences AI → human via the ai-approved status`.

### Verification performed

- `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **322 / 322** ✅ · typecheck ✅ · `eslint` 0 errors (2 pre-existing warnings, untouched file).
- Loader: composer-authoring 6 agents + `ai-approved` + self-edge, no dangling endpoints, all compose; default flow has no `ai-approved` → shared `review-end` unchanged for it.

### Blockers

- None.

### Non-blocking

1. **`review-end` keys the AI→`ai-approved` divert off `opts.type`, not the effective review type.** `review.ts` checks `opts.type === "ai"`. If someone runs `review-end --verdict approved` on a composer task **without** `--type ai` (review-start already recorded `type: "ai"`), the divert won't fire and the task jumps to `approved`, skipping the human pass — the exact thing this change prevents. The composer review agent always passes `--type ai`, so the guided flow is safe. **Suggested one-line hardening:** compute `const type = (opts.type as string) || review.type;` and gate on `type === "ai"` (also assign `review.type` from it). Strengthens the guarantee under manual use.
2. **`kanban.ts` fixed columns don't map `ai-approved`.** The hardcoded `COLUMNS` ("approved" matches `["approved","pushed"]`) won't bucket an `ai-approved` task, so CLI `stats`/fallback views would leave it uncategorized. The **dashboard kanban is flow-aware** (N128/N129 — the flow's status set drives columns), so composer-flow boards show it fine; this only affects the hardcoded fallback. Optional: add `"ai-approved"` to the approved column's `matches`, or leave it (composer-specific).

### Security & edge cases

- CLI change is a pure status-selection branch — no new input handling, no injection/auth surface. `flowDeclaresStatus` degrades safely (flow-load error → `false` → writes `approved`). No concern.

### Notes

- The enhancement cleanly resolves Round-1 Non-blocking #1 (sequencing) and #2 (dedupe). It reached into `src/cli/` (beyond the original composer-flow scope) — authorised by the human — and was kept flow-gated so the default flow is untouched.
- N203 is tracked on the `default` flow, so its own review lifecycle is unaffected by the `ai-approved` mapping (which only triggers for composer-flow tasks).

### Follow-up fix (task-review-fix — both Round-2 non-blocking notes, at the human's request)

- **NB #1 resolved.** `review.ts` — the `ai-approved` divert now keys off the **effective `review.type`** (set from `--type` or, failing that, from review-start) instead of `opts.type`, so an AI approval can't skip the human pass even if `--type` is omitted on `review-end`. Comment updated.
- **NB #2 resolved.** `core/kanban.ts` — the "Approved" column now matches `["approved", "ai-approved", "pushed"]`, so `ai-approved` composer tasks bucket correctly in the CLI/fallback kanban view (the dashboard was already flow-aware).
- **Gates:** build ✅ · `pnpm --dir packages/taskflow test` → **322 / 322** ✅. Default-flow behaviour still byte-identical (divert only fires when the flow declares `ai-approved`).


---

## Round 3 — Human Review (approval)

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-08
**Verdict:** approved

### Summary

Human approved. Verbatim:

> approved done please merge into same branch as others

Direction: merge N203 into `agents-approved` (the same integration branch as N200–N202).

### Blockers

- None.

### Notes

- Approval covers the full N203 set: unified dual-mode review + consolidated requirements (Round 1) plus the post-approval enhancements (graph-enforced `ai-approved` sequencing + reviewer dedupe + the two hardening fixes).
- Next: `/task-git` — commit + push `feat/N203-composer-review-v2`, then merge into `agents-approved`.
