# N192 — Showcase: rewire a built-in agent to fan out via subagents — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-26
**PR:** (no PR yet — working tree on `feat/composer-mcp`)
**Verdict:** approved

## Summary

`task-review` now declares the built-in `review-correctness` + `review-security`
subagents and gains a permissive `## Subagents` fan-out section; the canonical
`TASK_REVIEWER_ROLE.md` was regenerated via `prompt-build --compose --apply`
(drift guard green) and templates synced. This very review dogfooded the pattern
(fan-out to parallel correctness + security reviewers), which found the N190
blockers — strong evidence the showcase works.

## Checklist verification

- [x] One built-in agent rewired (`task-review`) + review subagents authored — pass
- [x] Declared via `subagents`; composed JSON updated — pass
- [x] Canonical role regenerated + templates synced (drift guard passes) — pass
- [x] Graceful degradation: delegation is permissive; reviewer still produces a verdict alone — pass
- [x] Docs note added (orchestrator section) — pass

## Blockers

None of N192's own. Inherits the **N190** blockers (the subagents it ships are
emitted by the N190 emitter, so B1's frontmatter hardening applies to
`review-correctness`/`review-security` too once fixed).

## Non-blocking

1. The hand-maintained built-in inventory (`built-ins/default-modules.md` /
   `default-agents.md`) doesn't yet list the new review subagents or `mcp-composer`.
   Refresh as a small follow-up (the manual inventory is pre-existing drift).

## Security & edge cases

- Review subagents are `readonly: true` with a read-only `tools` set
  (`Read`/`Grep`/`Glob`) — appropriate for reviewers. (Note: those `tools`
  values flow through the N190 B1-vulnerable emitter, but the shipped values are
  safe; the fix hardens against malicious custom values.)
- Blast radius: this changes the shipped reviewer for all consumers and installs
  two subagent files with the default flow — intended ("rewire built-ins"),
  bounded by graceful degradation.

## Notes

See N190's REVIEW.md for the consolidated initiative review.
