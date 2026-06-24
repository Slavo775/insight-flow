# N177 — Document v1 to v2 migration in README — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-24
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Docs-only change to `packages/taskflow/README.md`. Adds a consolidated "Upgrading from 1.x to 2.0" subsection with an ordered, idempotent migrate sequence; expands the "Migration / utility" command block from one to all four migrate commands; cross-links the two pre-existing scattered `migrate-layout` mentions to the new section. Zero code/behavior risk.

## Checklist verification

- [x] New "Upgrading from 1.x to 2.0" subsection under `## Upgrading insight-flow` with the ordered sequence — pass (README:788-808)
- [x] "Migration / utility" block lists `migrate-layout`, `migrate-reviews`, `migrate-hooks` + `migrate`, each commented — pass (README:205-208)
- [x] Command names/flags/descriptions match `cli.ts:139-146` — pass (verified `migrate-reviews`, `migrate-layout [--dry-run] [--fix-strays]`, `migrate-hooks [--bin <path>]`)
- [x] Existing mentions (lines 15, 147) cross-link to the new section — pass (anchor `#upgrading-from-1x-to-20` resolves; heading present exactly once)
- [x] Idempotency + back-compat shim noted — pass (intro line + bullet notes)
- [x] `grep` verification returns hits in both command block and upgrade section — pass
- [x] `init` does-not-migrate claim accurate — pass (matches `src/agents/init/index.ts:127-131`)

## Non-blocking

1. **`bulk-prompt-build` omitted from the upgrade sequence.** README:797 lists step 6 as `bulk-init` only, but the immediately-following "Refreshing role files across all projects" section pairs `bulk-init` **and** `bulk-prompt-build` as the two commands needed to fully refresh roles. A reader following only the upgrade sequence would skip the AGENT_ENFORCEMENT/agents.extend sync. Suggested fix: add `insight-flow bulk-prompt-build` as step 7, or change the step-6 comment to "→ then see [Refreshing role files](#refreshing-role-files-across-all-projects)". Not required for approval — the next section is adjacent and discoverable.

## Notes

- Docs-only: tsc/lint/test quality gates are N/A (correctly flagged by implementer).
- Follows the 2.0.0 release docs work in N176.


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-24
**Verdict:** approved

### Summary

"okej please commit push create pr and merge it"

### Blockers

None.

### Suggestions (non-blocking)

None raised.

### Notes

Approved as-is; proceeding to commit → push → PR → merge via `/task-git`.
