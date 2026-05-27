# N51 — init calls prompt-build to keep enforcement block in sync with config — Review

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-27
**Verdict:** Approved

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

Approved.


---

## Round 2 — AI Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-27
**Verdict:** Approved

### Summary

Extracts `applyEnforcement` from `cmdPromptBuild`, exports it, and wires it into `initProject` at step 4e (after role copy and agent extensions). Fresh init now always produces `AGENT_ENFORCEMENT.md`; re-runs report "Created" vs "Updated". Risk: low — patching is idempotent, write path unchanged.

### Checklist verification

- [x] `insight-flow init` generates `AGENT_ENFORCEMENT.md` without requiring a separate `prompt-build --apply` call — **pass**. `applyEnforcement(config, cwd)` called at `init/index.ts:166`.
- [x] Re-running `init` regenerates enforcement block from current config (idempotent) — **pass**. `applyEnforcement` always writes the file; `patchRoleFileWithRef` skips files that already contain `@AGENT_ENFORCEMENT.md`.
- [x] Console output distinguishes "Created" vs "Updated" — **pass**. `enforcementResult.created` drives the log at `init/index.ts:167–169`.
- [x] `applyEnforcement` exported from `prompt-build.ts` and reused by both callers — **pass**. Exported at `prompt-build.ts:118`, called by `cmdPromptBuild` at line 194 and `initProject` at line 166.
- [x] Enforcement step runs after role file copy and agent extension application — **pass**. Step 4e placed after step 3 (copy at lines 83–112) and step 4b (`applyAgentExtensions` at line 152).
- [x] `pnpm --dir packages/taskflow run build` passes — **pass** (confirmed).
- [x] N50 merged before implementation — **pass**.

### Blockers

None.

### Non-blocking

1. **Dry-run path in `cmdPromptBuild` duplicates raw-git-perms reading** (`prompt-build.ts:167–184` mirrors `applyEnforcement:120–137`). Since `buildEnforcementBlock` is private and `applyEnforcement` writes to disk, the dry-run can't reuse it. A private `readRawGitPerms(cwd)` helper would collapse both. Cosmetic — no correctness impact.

2. **`cmdPromptBuild` JSON output lost `patched`/`skipped` fields** (previously `{"patched":[...],"skipped":[]}`). No known consumers of this output, so low risk. Worth noting if diagnostic tooling ever parses it.

3. **`cmdPromptBuild --apply` now also patches `config.rolesDir` files** (new behaviour via `applyEnforcement`). Previously only root `ROLE_FILES` were patched. The expansion is desirable and idempotent — flagged for awareness only.

### Security & edge cases

None identified. Patching operates on local files with no external input paths; `config.rolesDir` is project-controlled.

### Notes

All three non-blocking items are cosmetic or additive. No follow-up tasks required.
