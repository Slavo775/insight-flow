# N164 — Review

**Verdict:** approved
**Reviewer:** task-review (ai)
**Date:** 2026-06-22
**PR:** https://github.com/Slavo775/insight-flow/pull/112
**Round:** 1

## Summary

Makes the `emit.ts` skill (`applySkills`) and command (`applyCommands`) ownership checks idempotent: a second flow re-claiming a name now throws **only** when the on-disk definition genuinely differs; an identical re-claim falls through and is reported `unchanged`. This unblocks reusing one agent across several flows (the react/js/ts/vue news case). The `mcp-server` path was already content-aware, so it's untouched. Scope is tight and matches the TASK.md goal.

## Checklist verification

CHECKLIST.md holds only template placeholders (task scaffolded via `insight-flow create`), so verification is against TASK.md Goal/Verification:

- ✅ **Identical re-install is idempotent** — both checks compare incoming (newline-normalized) body against the on-disk file and skip the throw when equal. Covered by `emit.test.mjs` (skill) and `agent-command.test.mjs` (command, asserts `unchanged`).
- ✅ **Same agent across flows, no collision** — identical re-claim proceeds and records the claim in the second agent's bucket; symmetric content check keeps subsequent applies stable.
- ✅ **Differing definitions still conflict** — throw retained; the existing collision test was updated to use a genuinely different body and asserts the new "with a different definition" message.
- ✅ **Quality gates** — `tsc --noEmit` passes (pre-commit hook), full suite 271/271 green. (No workspace lint configured per CLAUDE.md; typecheck is the gate.)

## Non-blocking

1. **Shared-ownership removal is still single-owner (latent bug).** Once two flows share an identical command/skill, both buckets claim it — but the removal loops in `applyCommands`/`applySkills` `rmSync` the file when *one* agent is re-applied without it, deleting an artifact the other flow still claims. Out of this task's install scope, but the feature makes the scenario reachable. Suggested hardening: before deletion, consult `collectOtherClaims` and skip the `rmSync` if another agent still owns the name. Track as a follow-up (or fold into N165).
2. **Misleading message on desynced state.** If the manifest claims a name but the on-disk file is missing (`onDisk === null`), the code throws "with a different definition," which misreports a missing/desynced file as a content conflict. Minor; consider a distinct message.

## Security & edge cases

- Comparison is exact-string equality on the rendered body after trailing-newline normalization — the same normalization used when writing the file, so no false "unchanged"/"different" results. Appropriate here because command/skill bodies are deterministic generated artifacts (`composeAgent`), not hand-authored JSON; the ANALYSIS "byte vs normalized deep-equal" question is effectively resolved as byte-equal-on-rendered-output, which is correct for generated content.
- No new path traversal / injection surface; skill names remain schema-restricted to safe path segments (existing guard).

## Notes

- Pairs with N165 (overwrite-with-diff for the differing case); the throw left here is intentionally N165's hook point.
- CHECKLIST.md was never populated (template placeholders) — not a code issue, but the task's done-criteria live in TASK.md.
