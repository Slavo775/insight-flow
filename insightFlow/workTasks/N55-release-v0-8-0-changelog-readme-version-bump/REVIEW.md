# N55 — release-v0.8.0-changelog-readme-version-bump — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-27
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

N55 is a release-prep chore covering three deliverables: CHANGELOG entry, README "What's new" update, and version bump. The version bump (0.7.1 → 0.8.0) and CHANGELOG are complete and accurate. The README "What's new" section was not updated — it still reads `## What's new in 0.7.0` with 0.7.0 content. This is the only gap; once fixed the release is ready to merge. Risk level: low (docs-only change).

## Checklist verification

TASK.md and CHECKLIST.md are empty (0B) — no spec items to verify against. Review is based on the task title ("changelog + readme + version bump") and the branch diff.

- [x] `packages/taskflow/package.json` version bumped `0.7.1` → `0.8.0` — **pass**
- [x] `packages/taskflow/CHANGELOG.md` — `## [0.8.0]` section added with entries for N46, N49, N50, N51, N52, N53, N54 — **pass**
- [x] Changelog entries are accurate, concise, and follow the established `**Nxx** — description` style — **pass**
- [x] Prior `## [Unreleased]` stub left in place above 0.8.0 — **pass** (correct convention)
- [ ] `packages/taskflow/README.md` `## What's new` section updated to 0.8.0 — **FAIL** (still reads 0.7.0)

## Blockers

1. **README `## What's new` not updated** — `packages/taskflow/README.md` line 7 still reads `## What's new in 0.7.0` with the four 0.7.0 bullets. For a release task titled "changelog-readme-version-bump" this is a required deliverable.
   - **Fix:** Replace the `## What's new in 0.7.0` heading and body with `## What's new in 0.8.0` summarising the key 0.8.0 highlights (interactive init prompts, prompt-build from config, agent-done browser notification, token-reduced role files, config dashboard page). Keep it to 4–5 bullets matching the 0.7.0 style. Update the `See [CHANGELOG.md]` link text if needed.

## Non-blocking

- The CHANGELOG `## [Unreleased]` stub above `## [0.8.0]` is correct but empty — consider leaving a note that N56 (batch-ui) will be the first 0.9.0 candidate.

## Security & edge cases

None — docs-only release prep.

## Notes

- N56 (batch-ui, also on this branch) is implemented and pushed separately; it is **not** in the 0.8.0 changelog, which is correct — it was created after the 0.8.0 spec.
- Once the README blocker is fixed, this branch is ready for merge and npm publish.
