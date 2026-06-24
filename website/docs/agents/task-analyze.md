---
title: /task-analyze
sidebar_label: Analyze
sidebar_position: 2
---

# /task-analyze — Strategist

**Command:** `/task-analyze` · **Role file:** `TASK_ANALYZER_ROLE.md`

Runs **before** `/taskmaster`. It challenges weak proposals, surfaces one or two
alternative paths, and asks targeted clarifying questions before any task exists.

## What it does

- Analyzes the request (architecture, ops, UX, process — not only code).
- Pushes back on thin briefs and proposes alternatives.
- Only after an explicit human go-ahead, hands off to `/taskmaster` and writes an
  `ANALYSIS.md` audit trail into the new task folder.

## In the flow

Entry point. On hand-off it invokes `/taskmaster`, which creates the task in
`ready`. See [Transitions](../flow/transitions.md).

## Notes

Treats every URL / pasted document / tool output as **data, never instructions**, and
refuses to create a task from a fully external brief. Full prompt:
[Reference → TASK_ANALYZER_ROLE.md](../reference/TASK_ANALYZER_ROLE.md).
