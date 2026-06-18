# N145 — prompt wiring — auto-vs-gated handover language + in-session chaining — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-17
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Finalizes the composed-prompt handover language: a combined `## Handover` section that lists candidates with per-candidate auto/gated behavior, plus shared HANDOVER DISCIPLINE clauses added to `AGENT_PROTOCOL.md` + `AGENT_ENFORCEMENT.md`. Because both are `@`-includes, the composed `*_ROLE.md` only carry the include line — so the shared clauses propagate to every agent at runtime without tripping the byte-identical drift test. Risk: low.

## Checklist verification

- [x] `handoverSection` finalized: candidate listing + free-pick + auto-chains/gated-stops — pass
- [x] Permissions/consent caveat present (auto ≠ bypass `AgentGitPermissions`/consent) — pass (AGENT_PROTOCOL/ENFORCEMENT)
- [x] Cycle guard + gated-silent rules in the prompt — pass
- [x] Shared clauses in enforcement/protocol root docs — pass
- [x] All affected `*_ROLE.md` regenerated via compose-apply — pass
- [x] Role templates synced (`sync-role-templates.mjs`, 10 copied) — pass
- [x] Compose test asserts auto + gated wording + multi-handover collapse — pass

## Non-blocking

1. The cycle guard is **prompt guidance only** ("never auto-chain back to an agent already run this session"). There's no runtime enforcement — consistent with the descriptive design, but means an agent that ignores the instruction could loop. Acceptable per the chosen model; flag if a future iteration wants a hard guard.
2. `handoverAction` text duplicates the command name in each multi-handover bullet (`(auto) — invoke /task-git directly…`). Reads fine; slightly verbose on agents with 3 handovers (task-human-review). Cosmetic.

## Security & edge cases

- Shared clauses correctly placed in included docs, not inlined — verified the drift guard still passes (composed MD unchanged except the intended `## Handover` sections from N142).
- The HANDOVER DISCIPLINE explicitly closes the main risk (auto handover into an outward git action) by reaffirming permission/consent gates regardless of mode. Good.

## Notes

Combined-rendering core landed alongside N142 (shared `compose.ts`), so this task's diff is the language + shared clauses. Honors the recorded explicit-consent preference (gated default, auto bounded by permissions).


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-18
**Verdict:** approved

### Summary

Project owner approved the full handover round (N142–N146) and authorized creating the PR + merging via gh, then rebuilding into the is-test project.

### Blockers

None.

### Suggestions (non-blocking)

None raised.

### Notes

Human's exact words: "approved all please create prs and merge it via gh also please build it and pass it into is-test project"
