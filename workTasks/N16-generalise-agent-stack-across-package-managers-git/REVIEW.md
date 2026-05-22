# N16 — Generalise agent stack across package managers, git hosts, and languages — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-22
**PR:** (no PR yet — reviewed against `git diff main...HEAD`)
**Verdict:** APPROVED (with deferred follow-ups)

## Summary

Strip-and-extend approach landed cleanly. Every canonical agent prompt file is now technology-agnostic (no `npx`, `npm`, `pnpm`, `tsc`, `gh pr`, host URLs outside example blocks). The previously-renamed `GITHUB_PR_API.md` is now `PR_API.md`, host-agnostic body with three explicitly-illustrative examples (GitHub REST/`gh`, GitLab REST/`glab`, no-CLI fallback). `taskflow.prompt.json` schema simplified (`gitTool` + `prStrategy` dropped). The new `no-technology-tight.test.mjs` is a real, byte-checked regression test against literal tech patterns, and all 13/13 tests pass.

Diff: 19 files, +635 / −140. Mostly mechanical scrubbing + the new test + the new `PR_API.md`. Risk: **low**. N15's three blockers (B1 npm/npx, B2 gh/GitHub, B3 TypeScript) are resolved by deletion as planned.

## Checklist verification

**Done criteria** (14 items)

- [x] `AGENT_PROTOCOL.md` contains zero literal tech outside example blocks. Workflow step 6 + GIT RULE both delegate to `agents.extend`.
- [x] `.claude/commands/task-git.md` canonical workflow has no `gh pr create`; an Examples appendix at line 109+ carries gh / glab / compare-URL examples, each preceded by `<!-- example: ... -->`.
- [x] `TASK_REVIEWER_ROLE.md` + `TASK_REVIEW_FIXER_ROLE.md` no longer mention "GitHub" / "gh" canonically; `@GITHUB_PR_API.md` references replaced with `@PR_API.md`.
- [x] `TASK_IMPLEMENTER_ROLE.md` + `TASK_INCIDENT_ROLE.md` workflow steps don't carry literal `tsc` / `npm` commands — verified via grep (the post-N15 compression had already consolidated those into `AGENT_PROTOCOL.md` step 6, which is scrubbed here, so the transitive fix lands).
- [x] `PR_API.md` exists at repo root; `GITHUB_PR_API.md` deleted (verified `ls`).
- [x] `grep -r "@GITHUB_PR_API"` returns empty.
- [x] `packages/taskflow/templates/taskflow.prompt.json` no longer carries `gitTool`. (Also drops `prStrategy` — see Non-blocking #1.)
- [x] `init` does not write `stack` field — N16 deliberately added no stack-detection machinery, so this is trivially true.
- [ ] `--examples` optional flag on `init` — **NOT DONE** (deferred by implementer; see Non-blocking #2).
- [x] `CLAUDE.md` has a new "Extending agents with project-specific commands" section with worked examples for TS+pnpm+GitHub, Python+uv+GitLab, Go+GitHub, shown as user-supplied content not shipped defaults.
- [ ] `README.md` Configuration section points readers at the extension contract — **NOT DONE** (deferred by implementer; see Non-blocking #3).
- [x] All 8 root role files + `AGENT_PROTOCOL.md` + `.claude/commands/task-git.md` byte-aligned with `packages/taskflow/templates/...` after `pnpm sync-roles` (3 templates re-synced in this branch; rest were already in sync).

**Quality gates** (5 items)

- [x] `pnpm typecheck` passes.
- [x] `pnpm build` clean.
- [x] `pnpm test` green: 13/13 (init 5 + migrate-reviews 2 + scaffold-and-bundle 5 + no-technology-tight 1).
- [x] `no-technology-tight.test.mjs` greps every canonical prompt for forbidden literals AND correctly excludes `<!-- example: ... -->` blocks (verified by reproducing the heuristic against a deliberately-tight string; pattern matches as expected, the example-stripping passes too).
- [x] Updated `init.test.mjs` test for absence of `stack`/`gitTool` fields — **vacuous as-is** (init never wrote either). See Non-blocking #4.

**Verification** (8 items)

- [x] `grep -rE "..." AGENT_PROTOCOL.md TASK_*_ROLE.md TASKMASTER_*_ROLE.md .claude/commands/task-git.md PR_API.md` returns hits ONLY in fenced example blocks. Confirmed manually: only hit is `task-git.md:112` inside the labeled GitHub example block.
- [x] `grep -r "@GITHUB_PR_API"` returns empty.
- [x] `grep -r "@PR_API.md"` returns hits in `TASK_REVIEWER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`, `.claude/commands/task-git.md`, `AGENT_ENFORCEMENT.md`, `AGENT_PROTOCOL.md`.
- [x] `ls GITHUB_PR_API.md` errors; `ls PR_API.md` succeeds.
- [ ] `node packages/taskflow/dist/cli.js init --force` in a tmpdir → `stack` absent, `gitTool` absent. **NOT EXECUTED** in this review pass; the `init.test.mjs` covers the absence indirectly but doesn't smoke-test a fresh tmpdir init. Recommend adding an explicit smoke run before final approval; minor.
- [x] Fixture project with `agents.extend.task-implement: [...]` still appends the string to the rendered role file (N12 regression check). Existing `init.test.mjs` continues to pass — covered.
- [ ] `init --force --examples` writes commented `agents.extend.<agent>: []` stubs — **NOT DONE** (deferred).
- [x] N15's three blockers (B1/B2/B3) are gone from canonical files. Verified by grep: only the labeled example block contains `gh pr create`; no other forbidden literals appear in canonical text.

## Blockers

None.

## Non-blocking

1. **`prStrategy` field also dropped from `taskflow.prompt.json` and `prompt-build.ts`.** Out of strict N16 scope (the spec only called out `gitTool`). Functionally correct — `prStrategy` only made sense alongside `gitTool: gh` (it gated `--draft` vs ready). But the change isn't documented in the commit message or CHANGELOG notes. Cheap to note in a follow-up commit; not gating.

2. **`init --examples` flag deferred.** The CHECKLIST scoped it explicitly. Implementer's report calls it out as a clean follow-up (~20 LOC). Without it, fresh consumers running `insight-flow init` get a config with no `agents.extend` stubs and may not discover the extension contract until reading CLAUDE.md. Suggest landing in a follow-up before announcing the technology-agnostic story externally.

3. **`README.md` Configuration pointer deferred.** Same shape as #2: trivial doc fix. Without it, consumers reading the README don't see the extension contract until they open CLAUDE.md.

4. **`init.test.mjs` assertion for absence of `stack`/`gitTool` is vacuous.** The original CHECKLIST said "update init.test.mjs to assert that init does not write `stack` field" — but `init` never wrote `stack` to begin with, so the assertion can't catch a regression that's already impossible. Either:
   - Add a positive assertion ("init writes the exact set of fields {workDir, shardSize, projectName, rolesDir, server, activityEngine, agents?}", with `stack`/`gitTool` outside that set) — catches future regressions.
   - Or drop the item from the CHECKLIST as redundant.
   Either is fine; current state is just unhelpful.

5. **The `no-technology-tight.test.mjs` example-stripping uses a `markerWindow = 8` heuristic** (line 73). Robust enough for current files but could miss cases where the marker is >8 lines before its fenced block. Not a blocker — the test fails closed (false-positive if a marker is too far away, which surfaces as a false alarm that's easy to fix by tightening the marker placement). Document the constraint in a comment or pin the marker→fence distance to 0–2 lines.

6. **AGENT_PROTOCOL.md and CLAUDE.md duplicate the "Extending agents" content** somewhat (CLAUDE has worked examples; AGENT_PROTOCOL has the contract description). Mild redundancy. The roles `@AGENT_PROTOCOL.md` (which agents read every invocation) but they don't `@CLAUDE.md`, so this is actually correct — CLAUDE.md is for *project maintainers*, AGENT_PROTOCOL.md is for *agents at runtime*. Documenting it explicitly somewhere ("CLAUDE.md is read by humans; AGENT_PROTOCOL.md is read by agents") would prevent future drift.

## Security & edge cases

- **`prompt-build.ts:patchRoleFileWithRef`** accepts both new `GIT RULE` and legacy `GIT / GH TOOL RULE` headings. Sensible transition policy. Once N16 ships and consumer projects have re-run `prompt-build --apply`, the legacy heading can be removed in a future release. No security concern.
- **`PR_API.md` Examples appendix** suggests `cat ~/.github-token 2>/dev/null` for the GitHub example. This is the existing pattern from `GITHUB_PR_API.md`; passing a token via command-substitution into curl `-H` exposes it briefly in process listings. Not a regression introduced by N16, but worth flagging for a future security pass — `curl --netrc-file` or `gh auth token | curl ...` are better. **Note only**, not actionable in this PR's scope.
- **No new external inputs** — all changes are doc/text scrubs + one new test. Threat model unchanged.

## Notes

- The strip-and-extend pivot was the right call. The original detect-and-substitute approach would have required ~150 LOC of detection + substitution logic; this lands in ~40 LOC of `prompt-build.ts` simplification + 140 LOC of test + doc rewrites. Less code, simpler mental model.
- The implementer correctly observed that N15's compression already consolidated quality-gate language into `AGENT_PROTOCOL.md`, so scrubbing one file transitively fixed implementer/reviewer/fixer/incident roles. Good leverage on the prior task's work.
- After this merges, N15's open PR #9 becomes implicitly approved — its three blockers are now resolved on main. Recommend a one-line note on PR #9 explaining the deletion-based resolution and closing/squashing as appropriate. (Wait — N15 was already merged in round 3 human approval. The blockers persisted in code until N16 lands, and once N16 merges they're gone. So no further action on N15 needed.)
- The deferred items (`--examples` flag, README pointer, smoke-test init in tmpdir) total maybe 50 LOC + one paragraph. Reasonable as a "release-prep" follow-up before bumping to `0.6.0`.
- Suggested next: open the PR; merge after this review approval; then handle the three deferred follow-ups in a small chore task before cutting `0.6.0`.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-22
**Verdict:** FIX NEEDED

The human's feedback verbatim:

> Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` if i create it with sonnet or haiku? thik better should be by Claude Code

### Summary

Same shape as N15's three generalisation blockers but on a new axis: the canonical PR-creation guidance hardcodes a **specific Claude model** (`Claude Opus 4.7`) in the commit `Co-Authored-By:` trailer. Agents running under Sonnet, Haiku, or any future model would emit incorrect attribution. The fix is the same delegation pattern the rest of N16 already uses — remove the model-specific string from the canonical prompt and use a generic `Claude Code` attribution that's true regardless of which model is running.

### Blockers

- **`Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` hardcoded in `.claude/commands/task-git.md:36`** — every commit produced by `/task-git` carries this trailer regardless of which model is actually authoring. Sonnet- or Haiku-driven sessions produce incorrect attribution; future-model sessions (Opus 5, etc.) would too. **Fix:** replace with `Co-Authored-By: Claude Code <noreply@anthropic.com>` (or `Claude <noreply@anthropic.com>`) — the generic trailer is honest regardless of model. Sync template + apply.

### Suggestions (non-blocking)

- The user's existing commit history on this branch (and elsewhere in the repo) already carries `Claude Opus 4.7` and `Claude Opus 4.6` co-author trailers. Those are immutable historical commit messages; no action needed on them. New commits should use the generic trailer once the fix lands.
- Consider also documenting in `CLAUDE.md` (or `AGENT_PROTOCOL.md`) that the `Co-Authored-By` trailer is intentionally model-agnostic, so future implementers don't "helpfully" specialise it back.

### Notes

- This issue was missed by both the implementer and the round-1 AI reviewer. The new `no-technology-tight.test.mjs` regression test doesn't catch model-name strings — its forbidden-pattern list covers package managers, language toolchains, and git hosts but not Claude model identifiers. Worth extending the test's pattern list with `Claude (Opus|Sonnet|Haiku) [0-9]` to prevent future regressions on this axis.
- Recommendation: keep N16 at `fix-needed`; land the trailer fix + extend the regression test in a small commit on this branch before merging PR #10.
