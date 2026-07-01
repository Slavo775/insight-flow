# N195 — Authoring flow agents — analyze/create/implement/review/fix/human-review/test/install — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-26
**PR:** (no PR yet — working tree on `feat/authoring-flow`)
**Verdict:** approved

## Summary

The 8 authoring agents, baseline-composed with `when`-intent handovers, the gated
`create→analyze` analyze-first branch, the activity-engine opt-in (analyze), and
subagents wired (analyst/author/reviewer). All compose cleanly and follow house
conventions. **Approved.**

## Checklist verification

- [x] 8 composed agents registered (analyze…install) — pass
- [x] Baseline on each: security/enforcement/protocol (+ actions; + recorder-discipline on human-review) — pass (verified by the N98 baseline test)
- [x] Handovers with `when`; gated create→analyze; install after approval — pass (composes with the `## Handover` `when` lines)
- [x] `<agent>/identity` convention + namespacing — pass (conformed; drift guard + namespacing tests pass)
- [x] `command:{install:true}` so the flow emits all 8 as slash commands — pass (8 commands emitted on flow install)
- [x] `subagents` wired (analyze→analyst, implement/fix→author, review→reviewer) — pass

## Blockers

None.

## Non-blocking

None of N195's own. (The MCP-description nit is recorded under N194.)

## Security & edge cases

- Agent prompts are prose; no injection surface. Baseline guardrails present on every agent.

## Notes

See N194's REVIEW for the consolidated batch review. The `command:{install:true}`
addition was applied during N197's install verification (folded in there).
