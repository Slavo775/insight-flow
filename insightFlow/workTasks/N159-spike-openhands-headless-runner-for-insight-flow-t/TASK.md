# N159 — SPIKE: OpenHands headless runner for insight-flow tasks

**Type:** chore
**Priority:** low
**Created:** 2026-06-18

## Problem

- **RESEARCH SPIKE — no production code.** insight-flow's agents run in *interactive editors* (Claude Code, Cursor). OpenHands is an autonomous dev-agent platform (Agent Server REST API; sandboxed execution; runs third-party agents incl. Claude Code via the **Agent-Client Protocol / ACP**; webhook + CI automations). This spike evaluates using OpenHands as a **headless runner** to execute insight-flow tasks (e.g. `/task-implement Nxx`) unattended in a sandbox/CI, with status flowing back via `/log/events`.

## Goal

1. A feasibility doc on driving OpenHands' Agent Server to run one insight-flow task autonomously.
2. The recommended integration shape — notably whether **OpenHands-runs-Claude-Code (ACP)** is the cleanest path (reuse the agent insight-flow already targets, just sandboxed).
3. A go/no-go + a minimal PoC outline.

## Scope

### In scope (research only — findings into a decision doc; do NOT ship code)

- How insight-flow would hand a task to OpenHands: emit the composed role prompt + task spec (TASK.md/CHECKLIST.md) to the Agent Server REST API / ACP; which endpoints; sandbox + auth + repo-mount model.
- Status callback: how the autonomous run reports progress back into insight-flow via the existing `/log/events` endpoint (the same hook events Claude Code emits) so the dashboard/tracker stays in sync.
- The "OpenHands runs Claude Code via ACP" path vs the native OpenHands agent — which better preserves insight-flow's role prompts.
- Where an `runner`/`openhands` opt-in config + a thin `insight-flow run --runner openhands --id Nxx` command would live IF built (design only).

### Out of scope

- No production runner, no OpenHands dependency, no server orchestration code. (Follow-up if "go".)
- No change to existing behavior. Depends conceptually on N158 (MCP) as a possible cleaner alternative to bespoke REST.

## Research plan

1. **Map** the OpenHands Agent Server surface (REST/ACP), sandbox model, and how external systems drive runs (webhooks/CI).
2. **Sketch** the task-handoff (prompt+spec → run) and the status-callback (run → `/log/events`).
3. **Compare** ACP-runs-Claude-Code vs native agent for preserving insight-flow roles.
4. **Decide**: feasibility, minimal PoC shape, effort, and go/no-go (incl. "not now").

## Verification

- Deliverable: a feasibility/decision doc in this folder (Agent Server surface, handoff + callback design, ACP vs native, PoC shape, go/no-go).
- No source/test changes committed.

## Notes

- Source: /task-analyze evaluation of github.com/OpenHands/OpenHands (Agent Server REST; sandbox; ACP third-party agents incl. Claude Code; CI automations). Strongest *runner* candidate of the two runtimes. Larger effort; gated on a real autonomous/CI need.
