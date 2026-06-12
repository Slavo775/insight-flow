# N23 — Architecture diagrams: agents, server, notifications, activity — Checklist

## Done criteria

- [ ] Diagram 1 prompt (agent lifecycle & roles) is in TASK.md — covers all 8 agents, all status transitions, quality gate note.
- [ ] Diagram 2 prompt (server federation) is in TASK.md — covers master server, project server, lock file, iframe injection, shard hydration.
- [ ] Diagram 3 prompt (notification service) is in TASK.md — covers Stop hook, OS notifications, browser notifications, config gates.
- [ ] Diagram 4 prompt (activity / milestones / logging) is in TASK.md — covers agent phase calls, enrichment hooks, JSONL file, ActivityEngine, WebSocket, verbosity config.
- [ ] Each prompt is copy-pasteable and self-contained (no external context needed).

## Quality gates

- [ ] No source code changed.
- [ ] `pnpm build` still passes (no regressions).

## Verification

- [ ] Paste Diagram 1 prompt into Gemini or Claude — confirm a legible Mermaid flowchart is produced.
- [ ] Paste Diagram 2 prompt — confirm master/project/browser topology is correctly shown.
- [ ] Paste Diagram 3 prompt — confirm both notification channels (OS + browser) and config gates appear.
- [ ] Paste Diagram 4 prompt — confirm JSONL → ActivityEngine → WebSocket → dashboard pipeline is visible.
