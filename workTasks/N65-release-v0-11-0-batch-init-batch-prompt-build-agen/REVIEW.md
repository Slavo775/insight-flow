# N65 — release v0.11.0 — batch-init, batch-prompt-build, AGENT_ENFORCEMENT in rolesDir — Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-28
**PR:** https://github.com/Slavo775/insight-flow/pull/44
**Verdict:** fix-needed

## Summary

Release spec for v0.11.0. Human reviewer flagged that the README needs to fully document all new features shipping in this release, not just a brief mention.

## Blockers

1. **README missing `--init` and `--prompt-build` documentation** (`packages/taskflow/README.md`)  
   The current batch-ui section ends after the `--no-open` / CI-mode examples. Both new commands must be documented with: purpose, flags, example output, and when to use them. The post-release workflow (`batch-ui --prompt-build` after upgrading) is the primary use case and must be spelled out clearly.

## Suggestions (non-blocking)

None.

## Notes

- "please also check readme and document all things in 0.11.0" — user's exact wording.
- The implementation step already mentions README updates but the spec doesn't prescribe the exact section content. Implementer should add a `### Batch operations` subsection (or equivalent) to the Multi-project launcher section covering both new commands with full examples.
