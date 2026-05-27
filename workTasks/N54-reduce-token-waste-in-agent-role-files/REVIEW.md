# N54 — reduce token waste in agent role files — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-27
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Extracts the identical 18-line EVENTS block from all 8 agent role files into a single `AGENT_EVENTS.md`, replaces each inline copy with `@AGENT_EVENTS.md`, removes three redundant sections from `AGENT_PROTOCOL.md` (GIT RULE, TOKEN EFFICIENCY, EXTENDING WITH PROJECT-SPECIFIC COMMANDS), updates `stripPhaseMarkers` in `init/index.ts` to blank the new file instead of patching 8 role files, and adds `AGENT_EVENTS.md` to the sync list. All quality gates pass. Risk is low — pure restructuring with no behavioural changes; `AGENT_ENFORCEMENT.md` retains the authoritative GIT RULE and TOKEN EFFICIENCY content.

## Checklist verification

- [x] `AGENT_EVENTS.md` created at repo root with extracted EVENTS block — **pass**. Content preserved verbatim including phase-marker comments.
- [x] All 8 role files reference `@AGENT_EVENTS.md`; zero inline phase-marker blocks remain — **pass**. Verified per-file (each shows @AGENT_EVENTS=1, phase-markers=0).
- [x] `stripPhaseMarkers` in `init/index.ts` blanks `AGENT_EVENTS.md` instead of patching 8 role files — **pass**. Old constants and loop removed; new function is 4 lines.
- [x] `AGENT_PROTOCOL.md` has no GIT RULE, TOKEN EFFICIENCY, or EXTENDING WITH PROJECT-SPECIFIC COMMANDS sections — **pass**. grep confirms all three absent.
- [x] EXTENDING WITH PROJECT-SPECIFIC COMMANDS replaced by one-sentence stub — **pass**. Stub present at end of file.
- [x] `sync-role-templates.mjs` includes `AGENT_EVENTS.md` — **pass**. Added with updated comment.
- [x] `TASK_GIT_ROLE.md` presence confirmed — **pass** (no restoration needed). Task-git agent behavior is embedded in `.claude/commands/task-git.md` + `@AGENT_NOTIFY.md`; there was never a separate `TASK_GIT_ROLE.md` root file or template. Investigation complete.
- [x] `pnpm --dir packages/taskflow run build` passes — **pass**. No TypeScript errors.
- [x] `sync-roles` script completes without error — **pass**. All 10 files copied, 0 missing.
- [x] `wc -w` total is lower — **pass**. Total 2503 words across 8 role files + AGENT_PROTOCOL.md; each role file lost ~120 words of inline EVENTS, AGENT_PROTOCOL.md shed ~120 words from three removed sections.
- [x] Each role file contains exactly one `@AGENT_EVENTS.md` reference — **pass**.

## Non-blocking

1. **Stale cross-reference in `AGENT_CONFIG.md:8`** — Line 8 reads: `See \`AGENT_PROTOCOL.md\` — "EXTENDING WITH PROJECT-SPECIFIC COMMANDS" for that model.` That section was removed by this task. AGENT_CONFIG.md is loaded by the task-git agent via `@AGENT_CONFIG.md`; an agent following this reference will find only the one-sentence stub (no section heading). Fix: update line 8 to `See \`CLAUDE.md\` for examples.` (matches the stub wording). Out of scope for N54 but a quick follow-up.

2. **One-sentence stub placement in `AGENT_PROTOCOL.md:50`** — The stub appears directly after the enforcement agreement paragraph without a `---` separator. The removed section had its own separator. Cosmetically fine; add `---` before the stub line if desired.

## Security & edge cases

None. Changes are documentation restructuring only; no input handling, auth, or data paths affected.

## Notes

- `stripPhaseMarkers` is now simpler and correct: the old loop that patched 8 files was O(n) and fragile to marker drift; the new version is O(1) and marker-agnostic.
- The removed constants `PHASE_MARKERS_START` / `PHASE_MARKERS_END` were cleaned up correctly alongside the function rewrite.
- `AGENT_ENFORCEMENT.md` retains authoritative GIT RULE and TOKEN EFFICIENCY content — no gap created by AGENT_PROTOCOL.md removal.
- Follow-up: fix stale `AGENT_CONFIG.md` reference (see Non-blocking #1) — could be done as a chore commit on this branch before merge.
