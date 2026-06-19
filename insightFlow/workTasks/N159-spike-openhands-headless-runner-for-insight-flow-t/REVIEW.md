# N159 — SPIKE: OpenHands headless runner for insight-flow tasks — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-19
**PR:** (no PR yet)
**Verdict:** APPROVED

## Summary

Research spike — deliverable is a feasibility doc (`RESEARCH.md`), no production code. Risk: none (zero `packages/` changes). The doc maps OpenHands' two viable surfaces (headless CLI + Agent Server REST/ACP), designs handoff + status-callback, compares ACP-runs-Claude-Code vs native agent, and lands a well-qualified **GO (deferred, opt-in, behind N158)**.

## Checklist verification

- [x] Feasibility doc: Agent Server surface (REST/ACP) + sandbox/auth mapped — pass
- [x] Task-handoff (prompt+spec → run) + status-callback (run → /log/events) designed — pass (reuses `composeAgent` + `/log/events` + validated `setStatus`)
- [x] ACP-runs-Claude-Code vs native agent compared — pass (prefers ACP to preserve composed prompts)
- [x] Go/no-go + minimal PoC shape + effort estimate — pass (GO deferred; PoC = headless CLI + `/log/events`; prod = REST+ACP+MCP; effort medium)
- [x] No production code / dependency added — pass
- [x] No changes to existing behavior or tests — pass

## Blockers

None.

## Non-blocking

- The "deferred until a real autonomous/CI need" gate is the right call; when revisited, the PoC should be scoped as its own task rather than folded into N158.

## Security & edge cases

- Correctly keeps LLM keys + repo creds inside OpenHands' env (insight-flow passes only prompt + spec + callback URL/token), and routes status through the validated `setStatus` path — no validation bypass.

## Notes

- Depends on N158 (MCP) as the clean status/handoff channel; should land after it.
