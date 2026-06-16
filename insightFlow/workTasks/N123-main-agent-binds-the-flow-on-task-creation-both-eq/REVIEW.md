# N123 — Main-agent binds the flow on create — REVIEW

**Verdict:** APPROVED
**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/99

## Summary

`resolveFlowId(config, type, explicit?, agent?)` reverse-looks-up flows by
`entryAgents`; precedence is `explicit ?? byAgent ?? byType ?? defaultFlow`. An
agent that's a main of zero flows errors; multiple flows → disambiguation error.
Coexists with the N116 type-map. Precedence + ambiguity are well-tested.

## Checklist verification

- [x] `create --agent <id>` binds the agent's flow — `flow-binding.test.mjs`.
- [x] Explicit `--flow` wins; type-map still applies; ambiguity + no-flow rejected with clear errors.

## Blockers

None.

## Non-blocking

- The reverse lookup scans all flows per create; negligible (creation is rare and flows are few).

## Security & edge cases

- Deterministic precedence; ambiguous main agent fails loudly rather than picking arbitrarily — correct.

## Notes

"Both-equal" with the type-map is satisfied; explicit override preserved.
