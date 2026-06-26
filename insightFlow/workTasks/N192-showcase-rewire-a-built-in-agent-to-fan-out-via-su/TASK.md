# N192 — Showcase: rewire a built-in agent to fan out via subagents

**Type:** feat
**Priority:** low
**Created:** 2026-06-25

## Problem

After N190 (subagent emission) and N191 (orchestrator pattern), no *shipped* lifecycle agent actually uses them. We need one real, built-in showcase that proves the pattern end-to-end and gives consumers a working example — without making subagents mandatory.

## Goal

1. Rewire **one** built-in agent to fan out to specialized subagents and synthesize.
2. Keep it **cross-harness** (Claude + Cursor) and **gracefully degrading** — the lifecycle must still complete with zero subagents.
3. Update the canonical role prompt through the drift guard so docs/templates stay in sync.

## Scope

### In scope

- **Pick one agent.** Recommended: **`task-review`** fanning out to parallel specialized reviewers (e.g. `review-correctness`, `review-security`, `review-perf`) → synthesize one verdict. Alternative: `task-analyze` formalizing the Explore fan-out it already does ad hoc.
- Author the built-in **subagent modules** (N190 kind) for the chosen agent.
- Declare them on the agent via `subagents` (N191) and update its composed definition (`src/agents/composed/<agent>.json`) + the canonical role prompt; run `scripts/sync-role-templates.mjs` so `*_ROLE.md` + templates stay in sync (drift guard).
- Decide placement: ship the subagents **registry-only** (opt-in) vs in the default flow's `install` list — default to keeping the lifecycle unchanged unless the subagents install with the flow.
- Docs: a short "fan-out review" note in the relevant docs section.

### Out of scope

- Rewiring more than one agent (follow-ups).
- `task-git` (its prompt explicitly opts out of subagents) and any agent where fan-out adds no value.
- Flow-level joins / engine.

## Implementation plan

1. **Choose** the agent (recommend `task-review`) and define the specialized subagents.
2. **Author** the built-in subagent modules.
3. **Wire** them onto the agent (`subagents`) + rewrite the composed prompt to delegate + synthesize, behind graceful degradation.
4. **Sync** the role files (`sync-role-templates.mjs`) and update the published docs.
5. **Verify** cross-harness + zero-subagent fallback; tests.

## Verification

- Installing the default flow emits the review subagents (per placement decision); `task-review`'s prompt instructs fan-out + synthesis.
- Works on Claude and Cursor; with no subagents present, `task-review` still produces a verdict.
- Role-file drift guard passes; `pnpm --dir packages/taskflow test`, `tsc`, `lint`, `pnpm build` green.

## Notes

- Depends on **N190** + **N191**.
- Cross-harness is safe: Cursor has native subagents too (`.cursor/agents`, reads `.claude/agents`).
- Keep it a *showcase*, not a mandate — degrade gracefully so non-subagent users/harnesses are unaffected.
- Decision trail: this folder's `ANALYSIS.md` + N190's fuller thread.
