# N192 — Analysis (pre-taskmaster strategist trail)

> Part of the subagents/handovers initiative (N189–N192). Full shared trail: **N190's ANALYSIS.md**.

## Problem framing

The user wanted built-in lifecycle agents to delegate to subagents. Once N190 (emission) + N191 (orchestrator) land, a *shipped* showcase proves the pattern and gives consumers a working example. Rewiring is **selective** — `task-git`'s prompt literally says "No subagents. Direct tool calls only," so only fan-out-friendly agents qualify.

## Goal

Rewire **one** built-in agent (recommended `task-review`) to fan out to specialized subagents and synthesize, cross-harness, with graceful degradation.

## Options considered & decisions

- **Which agent:** `task-review` (parallel specialized reviewers → one verdict) recommended; `task-analyze` (formalize its existing Explore fan-out) as alternative. **Not** all agents; **not** `task-git`.
- **Placement:** registry-only (opt-in) vs default-flow `install` list. → decide in-task; default to *not* changing the shipped lifecycle unless subagents install with the flow.
- **Degradation:** **non-negotiable** — must still complete with zero subagents (Cursor or none).
- Earlier the user said "rewire built-ins"; de-risked to a single showcase after Cursor support removed the editor-agnosticism blocker.

## Open questions

- Exact set of review subagents (correctness/security/perf?) and how their verdicts synthesize into the single recorded verdict.
- Whether the drift guard (`sync-role-templates.mjs`) cleanly absorbs a delegation-bearing prompt.

## Sources

- `src/agents/composed/*.json`, `*_ROLE.md` + `scripts/sync-role-templates.mjs` (drift guard), `task-git.json` (the explicit opt-out).
- Shared thread: N190's ANALYSIS.md. Depends on N190 + N191.

## Handoff brief

In TASK.md/CHECKLIST.md: pick `task-review`; author built-in review subagents; declare via `subagents`; rewrite the canonical prompt + re-sync role files; decide placement; verify cross-harness + zero-subagent fallback. Depends on N190 + N191.
