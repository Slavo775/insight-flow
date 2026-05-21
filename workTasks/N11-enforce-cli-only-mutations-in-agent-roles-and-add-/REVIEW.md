# N11 — Enforce CLI-only mutations in agent roles and add gh + git permissions — Review

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-21
**Verdict:** FIX NEEDED

### Blockers

- **Centralize the STRICT ENFORCEMENT block** — The same enforcement text is copy-pasted into all 8 role files. Extract it into a single shared file (e.g. `AGENT_ENFORCEMENT.md`) and have each role file reference it via `@AGENT_ENFORCEMENT.md` — or have `prompt-build --apply` always regenerate from one source of truth.

### Suggestions (non-blocking)

- None beyond the above.

### Notes

- Human asked: "maybe we can have some general STRICT ENFORCEMENTS when its all same?" — meaning: one canonical source, not N copies that can drift.

---

## AI Review — Round 1

**Reviewer:** Task Reviewer (AI)
**Branch:** `rework/N11-enforce-cli-only-agent-roles`
**Verdict:** REQUEST CHANGES

---

## Summary

17 files changed. The prompt-build command, schema, config template, and CLI registration are all correct and well-structured. The `gh *` wildcard fix is clean. The core problem is the one the human flagged: the enforcement block is copy-pasted into 8 files — any future edit requires 8 synchronized changes.
Risk: **low** (role files and a new CLI command — no data model changes, no production code touched).

## Checklist verification

- [x] All 8 role files contain `STRICT ENFORCEMENT — TASK FILE MUTATIONS` block (TASKMASTER_CHANGE_ROLE.md also patched — not in original checklist but correctly included)
- [x] All enforcement blocks include the `GIT / GH TOOL RULE` section
- [x] `packages/taskflow/schema/prompt-config.schema.json` created with all 5 fields
- [x] `packages/taskflow/templates/taskflow.prompt.json` created with defaults
- [x] `packages/taskflow/src/commands/prompt-build.ts` created
- [x] `prompt-build` registered in `packages/taskflow/src/cli.ts`
- [x] `insight-flow prompt-build` prints enforcement block from config
- [x] `insight-flow prompt-build --apply` can patch role files
- [x] Typecheck passes, build succeeds
- [ ] `settings.local.json` `gh *` — gitignored so not in diff, but confirmed applied locally

## Issues found

### Blocker 1 — Centralize enforcement block (echoes human review)

**File:** All 8 `TASK_*_ROLE.md` + `TASKMASTER*.md`
**Why:** Identical 13-line block is copy-pasted 8 times. The `prompt-build --apply` command exists to regenerate them, but it is not enforced as the update path — editors can still diverge. A single `AGENT_ENFORCEMENT.md` referenced via `@AGENT_ENFORCEMENT.md` at the top of each role file removes all duplication and is guaranteed consistent.
**Fix:**
1. Create `AGENT_ENFORCEMENT.md` containing the full enforcement block.
2. Replace the inline block in each role file with a single line: `@AGENT_ENFORCEMENT.md`.
3. Update `prompt-build --apply` to write `AGENT_ENFORCEMENT.md` only — not patch individual role files.

### Non-blocking — `patchRoleFile` insert branch adds extra blank line

**File:** `packages/taskflow/src/commands/prompt-build.ts:87`
**Why:** When inserting into a file that has no existing block, `content.slice(insertAt)` starts with `\n` (the blank line after the first `---`), and the inserted string also ends with `\n\n---\n\n`, producing a triple newline before `INPUT CONTRACT`. Minor cosmetic issue; idempotent re-apply fixes it since the replace-branch path runs on second call.
**Fix:** Trim the leading `\n` from `content.slice(insertAt)` in the insert branch, or consume it: `content.slice(insertAt).replace(/^\n/, "")`.

## Quality gate results

- TypeScript: pass
- Build: pass
- No regressions in existing commands

## Next actions

1. Create `AGENT_ENFORCEMENT.md` with the canonical block.
2. Replace inline blocks in all 8 role files with `@AGENT_ENFORCEMENT.md`.
3. Update `prompt-build --apply` to target `AGENT_ENFORCEMENT.md` only.
4. Fix the extra blank line in the insert branch of `patchRoleFile`.
5. Push fixes and re-request review.

---

## AI Review — Round 2

**Reviewer:** Task Reviewer (AI)
**Commit:** `e1b6b2a`
**Verdict:** APPROVED

---

## Summary

Fix commit `e1b6b2a` resolves both blockers cleanly. Risk: **low**.

## Checklist verification (re-review)

- [x] `AGENT_ENFORCEMENT.md` created — canonical 10-line enforcement block
- [x] All 8 role files replaced inline block with `@AGENT_ENFORCEMENT.md` (verified in diff)
- [x] `prompt-build --apply` writes `AGENT_ENFORCEMENT.md` first, then patches role files to use `@` reference
- [x] `patchRoleFileWithRef` correctly skips files already containing `@AGENT_ENFORCEMENT.md` (idempotent)
- [x] Extra blank line in insert branch fixed: `content.slice(insertAt).replace(/^\n/, "")`
- [x] `ROLE_FILES` constant extracted — no more duplication of the file list
- [x] Typecheck passes, build succeeds

## Prior blockers — resolved

- **Blocker 1 (centralization)** — ✅ Resolved. One file to edit, 8 agents updated.
- **Non-blocking (blank line)** — ✅ Fixed in `patchRoleFileWithRef` insert branch.

## Notes

- `patchRoleFileWithRef` returning `false` (skipped) for already-patched files is correct — re-running `--apply` is safe.
- No new issues found.

---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-21
**Verdict:** FIX NEEDED

### Blockers

- **GIT/GH TOOL RULE references config file — extra token cost** — `AGENT_ENFORCEMENT.md` currently says `"Use ONLY the tool configured in taskflow.prompt.json → gitTool"`, which forces agents to read a file to learn which tool to use. Bake the resolved value directly into `AGENT_ENFORCEMENT.md` so agents see a concrete rule (e.g. `"Use gh for PR creation"`) with no file lookup required. The `prompt-build --apply` command already knows the config at generation time — it should write the resolved value, not a pointer to it.

### Suggestions (non-blocking)

- None.

### Notes

- Human said: "this may cause extra token cost can we have it without AI must see into config?" — confirmed fix: write the resolved `gitTool` value directly into `AGENT_ENFORCEMENT.md`, not a reference to the config key.

---

## AI Review — Round 3

**Reviewer:** Task Reviewer (AI)
**Commit:** `7b34009`
**Verdict:** APPROVED

## Summary

Single fix commit. `AGENT_ENFORCEMENT.md` and `buildEnforcementBlock` updated to write concrete resolved prose. Agents see the exact tool, strategy, branch pattern, and checklist rule with zero file lookups. Risk: **low**.

## Prior blocker — resolved

- **Human blocker (gitTool config reference)** — ✅ `AGENT_ENFORCEMENT.md` no longer contains `taskflow.prompt.json` references. The full GIT/GH TOOL RULE section is now concrete prose resolved at generation time. All four config fields (`gitTool`, `prStrategy`, `branchPrefix`, `requireChecklist`) are correctly baked in.

## Checklist verification

- [x] `AGENT_ENFORCEMENT.md` GIT section: no `taskflow.prompt.json` mention
- [x] `buildEnforcementBlock` generates clean prose for all four config fields
- [x] `prStrategy: "draft"` path handled (`gh pr create --draft`)
- [x] `gitTool: "git"` path handled (compare URL, no gh CLI)
- [x] `branchPrefix` path handled
- [x] `requireChecklist: false` path handled
- [x] Typecheck passes, build succeeds

## Notes

- No new issues found. Ready to merge.

---

## Human Review — Round 3

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-21
**Verdict:** APPROVED

### Blockers

- None.

### Notes

- Human said: "approved!"
