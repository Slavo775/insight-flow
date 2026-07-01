# N199 — Analysis (pre-taskmaster strategist trail)

## Problem framing

The owner is not a native English speaker and often can't follow the agents'
replies (too complex). Many users share this. There's no built-in way to ask an
agent to write in simple, plain English.

## Goal

A built-in `section` module that tells an agent to write plainly, composed into
the `task-analyze` agent (the one the owner converses with), and available
opt-in for any other agent.

## Options considered

- **Scope of application:** (a) force simple English on every agent always ·
  (b) opt-in, added where wanted · (c) built-in module composed into a chosen
  agent + opt-in elsewhere. → owner chose **(c)**: built-in, composed into at
  least `task-analyze`, opt-in for the rest. (Forcing it on all agents would hurt
  users who want dense/technical output.)
- **Built-in vs custom:** → **built-in** (owner wants others to use it too).
- **Authoring-flow opt-in question** ("want simple English?") → **declined**.
- **Chat vs flow:** a module only affects the *flow* agents on install — it does
  NOT change how the assistant talks in normal chat. The owner's immediate chat
  pain is handled by a personal preference memory (`use-simple-english`); this
  task is the *flow-agent* half.

## Decision

Ship a built-in `plain-language` `section` module; compose it into `task-analyze`
(regenerate its role file for the drift guard); keep it opt-in for other agents;
add a short doc entry. Type feat, priority medium. No source-behaviour risk
(prompt content + registration).

## Open questions

- Which other agents (if any) the owner later wants it on (e.g. task-review,
  human-review) — left opt-in for now.
- Exact module id (`plain-language` vs `simple-english`) — settle in implementation.

## Sources

- This session's conversation (the owner asked for simpler English; I switched and
  saved the `use-simple-english` memory). The composer model + drift-guard
  mechanics (compose.test, prompt-build --compose, sync-role-templates).

## Handoff brief

Create a built-in `plain-language` section module (plain English: short sentences,
common words, no idioms, define jargon, lists/steps); register it; compose it into
`task-analyze` and regenerate `TASK_ANALYZER_ROLE.md` (drift guard); keep it
opt-in for other agents; short doc in `built-ins/default-modules.md`. Out: forcing
it on all agents, chat-assistant behaviour, authoring-flow question, translation.

**Branch note:** created on `feat/authoring-flow` (nextId 199) but NOT in PR #137 —
implement on its own branch off `main`, ideally after the authoring PR merges.
