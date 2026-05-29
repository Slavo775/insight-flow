# N73 — task-analyze: strategist agent that runs before taskmaster to challenge assumptions and propose alternatives — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-29
**PR:** (not yet pushed — review against working tree on `fix/N72-...`)
**Verdict:** fix-needed

## Summary

Ten files touched to add the `task-analyze` agent end-to-end: new `TASK_ANALYZER_ROLE.md` at repo root with Phase 1 (challenge/propose/interrogate) + Phase 2 (handoff) + a dedicated Security guardrails section; new `templates/task/ANALYSIS.md.tpl` (Problem · Goal · Options · Decision · Open questions · Sources · Handoff brief); wiring in `agents.ts` (`AGENT_ROLE_FILE_MAP`), `sync-role-templates.mjs`, `init/index.ts` (`SKILL_TASK_ANALYZE`, skills map, CLAUDE.md table row, `agents.extend` stub), `create.ts` (`--with-analysis` flag), `cli.ts` (help). Build + 10 test suites pass; smoke `init` + `create --with-analysis` confirmed in a clean tmp dir. Risk: low — additive, no schema or lifecycle changes; existing `create` behavior unchanged when the flag is omitted.

## Checklist verification

- [x] `TASK_ANALYZER_ROLE.md` at repo root with Phase 1 + Phase 2 — pass.
- [x] References `@AGENT_ENFORCEMENT.md`, `@AGENT_PROTOCOL.md`, `@AGENT_EVENTS.md` — pass (lines 11, 12, 81 of the new role file).
- [x] `packages/taskflow/templates/roles/TASK_ANALYZER_ROLE.md` synced — pass (sync-roles second run: `copied: 0`).
- [x] `templates/task/ANALYSIS.md.tpl` with mandatory `## Sources` — pass.
- [x] Dedicated **Security guardrails** section in role file — pass (untrusted-content rule, no auto-fetch, marker block, refuse on fully-external, high-risk action gate, allowlist convention, anomaly response).
- [x] `AGENT_ROLE_FILE_MAP` includes `task-analyze` — pass.
- [x] `SKILL_TASK_ANALYZE` registered in skills map — pass.
- [x] `insight-flow create --with-analysis` implemented; output JSON includes `analysisMd` — pass (smoke: `{"...,"analysisMd":"workTasks/N00-smoke-analyze/ANALYSIS.md"}`); without flag: `analysisMd: null`.
- [ ] **`CLAUDE.md` role count updated to 9** — **FAIL** (line 49 still reads "The 8 `TASK_*_ROLE.md`"). See Blocker 1.
- [x] `packages/taskflow/README.md`: install summary row, `agents.extend` example, slash-command table updated, `Valid agent names` lines updated — pass.
- [x] `insight-flow init --force` writes `.claude/commands/task-analyze.md` + `.claude/roles/TASK_ANALYZER_ROLE.md` — pass (smoke test in /tmp/if-smoke).
- [x] `pnpm build` passes — pass.
- [x] `pnpm test` passes — pass (10 suites).
- [x] `sync-roles` idempotent — pass.
- [x] No regressions on `create` without `--with-analysis` — pass.
- [~] Conversational drills (refuses on vague brief, refuses fully-external, asks before auto-following inline URLs, surfaces injection verbatim) — **deferred to human review**; not assertable in the test suite.

## Blockers

1. **`CLAUDE.md:49` — role count still says "The 8".**
   - **Why:** CHECKLIST done-criterion requires the count be updated to 9 (or restated without a count). The slash-command table row was added at line 134, but the prose at line 49 was not updated. A future reader is now told there are 8 role files while the table lists 10 slash commands.
   - **Fix:** edit `CLAUDE.md:49` — change `The 8 \`TASK_*_ROLE.md\`` → `The 9 \`TASK_*_ROLE.md\``, and prepend `/task-analyze` to the inline command list in the same sentence. Suggested replacement:
     ```
     **Agent roles:** The 9 `TASK_*_ROLE.md` / `TASKMASTER_*_ROLE.md` files at repo root drive Claude Code slash commands (`/task-analyze`, `/taskmaster`, `/task-implement`, `/task-review`, `/task-review-fix`, `/task-human-review`, `/task-request-changes`, `/task-incident`, `/taskmaster-change`, `/task-git`). `/task-analyze` runs **before** `/taskmaster` — it challenges weak briefs, surfaces alternatives, and only after the human confirms a path hands off to `/taskmaster` and writes an `ANALYSIS.md` audit trail into the new task folder.
     ```

## Non-blocking

1. **Skill-stub vs role-file duplication risk** — `SKILL_TASK_ANALYZE` in `init/index.ts:362` inlines a short version of the Phase 1/Phase 2 / security rules; the canonical version lives in `TASK_ANALYZER_ROLE.md`. The two will drift over time. This matches the pattern of the other built-in skills (e.g. `SKILL_TASKMASTER`), so it's not unique to this task — but consider, in a future cleanup, a strategy that loads the role file content into the skill at init time (the same way `agents.extend` already mutates role files in place). Not for this PR.
2. **`opts["with-analysis"]` bracket lookup** — `create.ts:120` reads both `opts["with-analysis"]` and `opts.withAnalysis`. The CLI only ever writes the first form (per `parseArgs` in `cli.ts:46`); the second is dead-code defensive. Either drop the `withAnalysis` half or comment why both exist. Cosmetic.
3. **README slash-commands table column widths** — the table at `README.md:390` widened the `Purpose` column for the new `task-analyze` row, so the existing rows now have trailing whitespace that's wider than needed. Renders fine in GFM; only matters if a contributor runs a Markdown formatter. Cosmetic.

## Security & edge cases

- The role file's Security guardrails section is comprehensive: untrusted-content rule, no auto-fetch of URLs discovered inside fetched docs, mandatory `EXTERNAL CONTENT — INFORMATIONAL ONLY` marker, refuse-on-fully-external-brief, Phase-1 high-risk action gate, optional `agents.analyze.allowedDomains` allowlist convention, anomaly-response loop. Inherits `@AGENT_SECURITY.md` via `@AGENT_ENFORCEMENT.md`, so prompt-injection / exfiltration / persona-override rules also apply.
- The mandatory `## Sources` section in `ANALYSIS.md.tpl` gives downstream agents (taskmaster, implementer, reviewer) a provenance audit trail — concrete provenance + trust level + fetched-at date. Good defensive design.
- The runtime drills (injection / fully-external / inline-URL auto-follow) are not assertable in the Node test suite — they test prompt-following behavior. Human reviewer should do at least one drill before merge.

## Notes

- This task is part of the pipeline reshape: `task-analyze → taskmaster → task-implement → task-review → …`. Strictly upstream of taskmaster; never invoked mid-lifecycle.
- Related: N12 (`agents.extend` mechanism that this agent inherits).
- Working tree carries unrelated changes from N67/N70/N71/N72 (events.json, overview.ts, REVIEW.md side files). When `/task-git` runs for N73, only the 10 in-scope files plus the `workTasks/N73-…/` folder and the auto-managed `master.json` / `tasks-N70-N79.json` mutations should be staged. The N67/N70/N71/N72 changes belong to those tasks' branches, not this one.

## Fix round 1 — applied 2026-05-29

- **Blocker 1 (CLAUDE.md:49 role count)** — fixed. Changed `The 8 \`TASK_*_ROLE.md\`` → `The 9 \`TASK_*_ROLE.md\`` and prepended `/task-analyze` to the inline command list; appended a one-sentence note explaining `/task-analyze`'s pipeline position. Verified via `grep -n "The 9 \`TASK"` → line 49.
- Non-blocking items 1–3: not addressed (per scope guard — only blockers are fixed in this round).
- Gates re-run: `pnpm --dir packages/taskflow build` ✓; `pnpm --dir packages/taskflow test` ✓ (10 suites, no failures).
- Files changed in this fix round: `CLAUDE.md` only.


---

## Round 2 — approved

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-29
**Verdict:** approved

### Summary

One-line fix to `CLAUDE.md:49` resolves the only blocker from round 1. Working-tree diff for that file is now `+2 -1` (count 8→9 plus a new pipeline-position sentence). Gates re-ran clean (`pnpm build` ✓, `pnpm test` ✓ — 10 suites). No code-path changes in this round, so no new regression surface. Approved for `/task-git`.

### Checklist verification

- [x] **`CLAUDE.md` role count updated to 9** — pass. `grep -n "The 9 \`TASK"` → line 49. Sentence now also lists `/task-analyze` first in the inline command list and explains the pipeline position in one extra sentence.
- [x] All previously-passing items remain passing — no other files in the working tree were touched by the fix round.
- [x] `pnpm build` passes — pass.
- [x] `pnpm test` passes — pass (10 suites, 0 failures).
- [~] Conversational drills (refuses on vague brief, refuses fully-external, asks before auto-following inline URLs, surfaces injection verbatim) — **still deferred to human review**; not assertable in the test suite.

### Blockers

None.

### Non-blocking

Carried over from round 1, **not addressed this round** (per scope guard — fixer only touches blockers):

1. **Skill-stub vs role-file duplication risk** (`init/index.ts:362`). Defer to a follow-up task.
2. **`opts["with-analysis"]` dual lookup** (`create.ts:120`). Trivial one-liner; do in a follow-up only if a contributor is in the file anyway.
3. **README slash-commands table column widths** (`README.md:390`). Cosmetic; renders fine.

### Security & edge cases

No security-relevant changes in this round (single doc-prose edit). All guardrails from round 1 still apply.

### Notes

- Next step: `/task-git` to branch (`feat/N73-task-analyze-...`), stage only N73-scoped files (10 source/doc files + the `workTasks/N73-…/` folder + auto-managed `master.json` / `tasks-N70-N79.json` mutations), commit, push, and open the PR. The N67/N70/N71/N72 working-tree drift belongs to those branches and must not be swept in.
- The conversational drills should be the first thing the human does on the new branch — they are the only way to validate that the role file's instructions are actually being followed by the runtime.
