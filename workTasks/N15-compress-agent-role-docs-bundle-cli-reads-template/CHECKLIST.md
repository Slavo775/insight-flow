# N15 — Compress agent role docs + bundle CLI reads + template REVIEW.md — Checklist

## Done criteria

- [ ] `AGENT_PROTOCOL.md` exists at repo root and contains every procedural step that previously appeared in ≥3 role files (CLI-only mutations, gh PR flow, branch naming, status-history conventions, fix-loop flow, conventional commits, "after writing files call /task-git").
- [ ] All 8 role files (`TASKMASTER_ROLE.md`, `TASKMASTER_CHANGE_ROLE.md`, `TASK_IMPLEMENTER_ROLE.md`, `TASK_REVIEWER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`, `TASK_HUMAN_REVIEW_ROLE.md`, `TASK_INCIDENT_ROLE.md`, `TASK_REQUEST_CHANGES_ROLE.md`) are ≤ 40 lines and `@`-reference `AGENT_PROTOCOL.md`.
- [ ] `packages/taskflow/scripts/sync-role-templates.mjs` and `packages/taskflow/src/commands/prompt-build.ts` are updated so `AGENT_PROTOCOL.md` ships with the package and is recognised by the role-template sync.
- [ ] `insight-flow next --with-spec`, `next-review --with-spec`, `next-fix --with-spec` return JSON containing `task` and `checklist` keys with file contents (string), or `null` if the file is missing.
- [ ] `insight-flow show --id Nxx --spec` returns a JSON object containing the lean summary fields plus `task` and `checklist` strings. Composes with `--summary`.
- [ ] `packages/taskflow/templates/task/REVIEW.md.tpl` exists with `{{ID}}` / `{{TITLE}}` placeholders and 5 fixed section headings (Summary / Checklist verification / Blockers / Non-blocking / Notes).
- [ ] `insight-flow review-start --id Nxx` scaffolds `REVIEW.md` on first call; subsequent calls (re-review) append `## Round N` instead of overwriting.
- [ ] `insight-flow stats --tokens` outputs token-usage trends grouped by `task.type` and `task.priority` (min / median / p90 / max / last-5-avg / all-time-avg), pretty-printed.
- [ ] `TASK_REVIEWER_ROLE.md` and `TASK_HUMAN_REVIEW_ROLE.md` updated to direct the agent to `Edit` the scaffolded `REVIEW.md` sections (no Write-from-scratch).

## Quality gates

- [ ] `cd packages/taskflow && pnpm typecheck` passes.
- [ ] `pnpm build` (taskflow) clean.
- [ ] `pnpm test` (taskflow) green — existing init tests + migrate-reviews tests + new `bundle-reads.test.mjs` + new `role-output-golden.test.mjs`.
- [ ] `packages/taskflow/test/fixtures/golden/<role>/` captures expected output for each of the 8 roles before role-doc compression; `role-output-golden.test.mjs` asserts compressed-role plumbing produces byte-identical files.
- [ ] No regression in the human-readable output of TASK.md / CHECKLIST.md / REVIEW.md produced by the compressed roles vs the uncompressed roles on the same throwaway input task (manual diff check).

## Verification

- [ ] `wc -l TASK_*_ROLE.md TASKMASTER_*_ROLE.md` — each line count ≤ 40.
- [ ] `grep -l "@AGENT_PROTOCOL.md" TASK_*_ROLE.md TASKMASTER_*_ROLE.md` returns all 8 files.
- [ ] `node packages/taskflow/dist/cli.js next --with-spec` JSON includes non-null `task` + `checklist` for the picked task; `next --with-spec` for a task without spec files returns `task: null, checklist: null` (graceful).
- [ ] `node packages/taskflow/dist/cli.js show --id N14 --summary --spec` returns the lean summary fields plus `task` and `checklist` content; total length under ~12 KB (compact JSON).
- [ ] First `node packages/taskflow/dist/cli.js review-start --id <throwaway-task>` produces a `REVIEW.md` containing the heading block + 5 empty section headings.
- [ ] Second `review-start` on the same task appends `## Round 2 — pending verdict` without modifying the existing `## Round 1` content.
- [ ] `node packages/taskflow/dist/cli.js stats --tokens` runs without error and reports a `tokens` block per type/priority, even when most tasks have `tokensUsed: null` (graceful — skip nulls).
- [ ] Dry-run: create a throwaway task N99, take TASK.md / CHECKLIST.md / REVIEW.md from compressed roles + uncompressed roles (stash trick). Section headings, checklist items, quality-gate items match 1:1 between both. Manual review confirms no semantic regression.
