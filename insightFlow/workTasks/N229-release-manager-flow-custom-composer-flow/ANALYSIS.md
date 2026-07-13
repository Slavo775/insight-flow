# N229 — Release Manager Flow (custom composer flow) — Analysis

**Created:** 2026-07-13
**Author:** authoring-analyze

## Problem framing

- The real goal is a **repeatable, guided release process** for insight-flow, not a one-off script. Today release readiness (tests green, intent known, docs in sync) is not enforced, and after publish the new version is not spread to the machine or to the other projects that use it.
- Symptom: manual, error-prone releases + version drift in bulk-registered projects. Cause: no owned lifecycle for "check → fix → publish → roll out" with the right stops on irreversible steps.
- This is a **flow** customization (project layer), built with the composer — 5 agents joined by edges, with subagent fan-out for the parallel checks and per-project installs.

## Goal

1. Custom flow `custom:release-manager` (5 `task-release-*` agents) that checks readiness, creates a release-prep task, fixes gaps, publishes behind one human gate, and rolls out globally + to every bulk-registered project.
2. Two terminators: `done` (released + rolled out) and `not-able-to-release` (wider work → default flow).
3. Live dashboard status (activity engine, tokenless) for Claude + Cursor.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — 5-agent flow: check → plan → fix → ship → rollout (chosen) | Clear single-token lifecycle; each concern isolated; rollout separated from publish; mirrors built-in `composer-authoring` shape | More agents/modules to author | Medium |
| B — 4-agent flow, fold rollout into the publisher (`ship`) | Fewer agents | One heavy agent doing publish + global install + per-project bump; harder to gate/report separately | Medium-low |
| C — Global install only after release (no per-project bump) | Safest, simplest | Does not meet the explicit "install into all bulk-registered projects" requirement | Low |

Sub-decisions:
- **Publish control:** one human "go" before merge+publish (edge 3 gated) — user chose over fully unattended.
- **After fixes:** re-run the checker (edge 4, gated cycle back-edge) rather than straight to publish — user chose the safer re-check loop.
- **Rollout scope:** global install + **force-bump every** bulk-registered project's local dep (user chose over "safe bumps only").
- **Rollout control:** auto, best-effort, per-project report at end.
- **Rollout structure:** dedicated 5th agent `task-release-rollout` with a `project-installer` subagent.

## Decision

- **Chosen option: A** — the 5-agent flow with a dedicated rollout agent.
- Rationale: keeps each concern small (reuse-first + minimal-module rules), isolates the irreversible publish behind one gate and the risky per-project rollout behind its own best-effort agent, and re-uses the proven `composer-authoring` structural patterns (subagent fan-out, guarded taskmaster, terminal-status edges). Registry was found **built-in only** (0 custom defs), so nothing can be edited in place — everything new is authored under `custom:` ids; locked tier (`security`/`enforcement`/`protocol`, built-in handovers) is only referenced.

## Open questions

- `[non-blocking]` Force-bumping `debugger-pro-plus-3000` from `insight-flow@0.5.0` to `2.4.x` is a major jump that may need the layout migration (`workTasks/` → `insightFlow/`). Best-effort + report keeps it non-fatal; that project may need a manual follow-up.
- `[non-blocking]` `koktejl-new` has no local `insight-flow` dep → rollout reports "nothing to bump" (do not add a new dep automatically).
- `[non-blocking]` Publisher self-approves the GitHub Actions deploy via `gh api pending_deployments` after the human gate; confirm the token/permissions during implementation.
- `[non-blocking]` `custom:test` is a stray scratch flow in the registry — candidate for cleanup, out of scope here.

## Sources

- Registry inventory via composer MCP (built-in only; 128 modules, flows `default` / `composer-authoring` / `custom:test`) — provenance: analyzer-discovered, trust: high, fetched: 2026-07-13.
- `~/.insight-flow/hub.json` (5 bulk-registered projects) and consumer `package.json` deps (`debugger-pro-plus-3000` 0.5.0, `ithinktoday-widget` ^0.7.1, `koktejl-new` none; global `insight-flow@2.4.1`) — provenance: analyzer-discovered, trust: high, fetched: 2026-07-13.
- `packages/taskflow/src/master/registry.ts` (how projects register/persist) — provenance: analyzer-discovered, trust: high, fetched: 2026-07-13.

## Handoff brief

- **Title:** Release Manager Flow (custom composer flow) · **Type:** feat · **Priority:** high · **Tags:** composer, flow, release, authoring.
- **Scope:** Author a custom composer flow `custom:release-manager` with 5 `task-release-*` agents — a checker (entry, 3 subagents: test-runner, release-intent-detector, docs-auditor) that auto-hands to a guarded taskmaster; the taskmaster refuses to create a task without a prior check and sets `ready-to-release` / `changes-needed`; an implementer (2 subagents: documentation-expert, root-cause test-fixer) that stops to terminal `not-able-to-release` on wider rework; a publisher that (after one human gate) merges to master and runs the npm release; and a rollout agent that installs the new version globally and force-bumps every bulk-registered project's local dep (best-effort + report). Reuse built-in `security`/`enforcement`/`protocol`/`actions`/`template-copy`/`task-git*`/`activity`/`testing`; author everything else as `custom:`. Harness Claude + Cursor; add the `activity` bundle to the flow install; no MCP.
