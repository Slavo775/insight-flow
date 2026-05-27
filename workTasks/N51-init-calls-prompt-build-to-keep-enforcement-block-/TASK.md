# N51 — init calls prompt-build to keep enforcement block in sync with config

**Type:** rework
**Priority:** medium
**Created:** 2026-05-26

## Problem

`insight-flow init` scaffolds role files and config but never generates `AGENT_ENFORCEMENT.md`. A user who runs `init` without a subsequent `prompt-build --apply` gets role files that reference `@AGENT_ENFORCEMENT.md` but the file either doesn't exist or is stale — it won't reflect the git permissions or agent extensions they just configured. The two commands can silently drift.

## Goal

1. `insight-flow init` always produces an up-to-date `AGENT_ENFORCEMENT.md` as part of its run — no separate manual step needed.
2. On re-run, the enforcement block is regenerated from the current config (idempotent).
3. The console output reports whether `AGENT_ENFORCEMENT.md` was created or updated.
4. `prompt-build --apply` remains a standalone command users can still call manually to force a regeneration.

## Scope

### In scope

- `packages/taskflow/src/init/index.ts` — add a step after role file copying that calls the same logic as `cmdPromptBuild --apply`, using the already-resolved `config`.
- Reuse the shared `applyAgentExtensions` helper introduced by N50 — do not duplicate the logic.

### Out of scope

- Changes to `prompt-build.ts` itself (covered by N50 — this task depends on N50 being done first).
- Interactive prompts for `init` (separate future task).
- Any changes to `taskflow.config.json` schema.

## Implementation plan

1. **Depend on N50** — this task must be implemented after N50 so the shared `buildEnforcementBlock` and `applyAgentExtensions` helpers exist.
2. **Extract enforcement write logic** — ensure `prompt-build.ts` exports a `applyEnforcement(config: TaskflowConfig, cwd: string): { created: boolean }` function that writes `AGENT_ENFORCEMENT.md` and patches role files (refactor from `cmdPromptBuild`).
3. **Call `applyEnforcement` from `init`** — in `packages/taskflow/src/init/index.ts`, after step 3 (role file copy), call `applyEnforcement(config, cwd)` and log "Created AGENT_ENFORCEMENT.md" or "Updated AGENT_ENFORCEMENT.md" based on the return value.
4. **Ordering matters** — enforcement must run after role files are copied (step 3) and after agent extensions are applied (step 4b) so the patching sees the final role file content.

## Verification

- Fresh `insight-flow init` in an empty directory produces `AGENT_ENFORCEMENT.md` alongside the role files.
- Re-running `insight-flow init` on an existing project reports "Updated AGENT_ENFORCEMENT.md" and the file reflects the current config.
- `AGENT_ENFORCEMENT.md` content matches what `insight-flow prompt-build` prints (dry run).
- `pnpm --dir packages/taskflow run build` passes with no TypeScript errors.

## Notes

- Depends on N50 (prompt-build rework) — the shared helpers must exist before wiring them into `init`.
- The interactive `init` prompts (activity hooks, events, sounds) are a separate future task and not in scope here.
