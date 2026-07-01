# N199 — Plain-language module — built-in simple-English section, composed into task-analyze

**Type:** feat
**Priority:** medium
**Created:** 2026-06-30
**Tags:** composer, module, accessibility

## Problem

Not every user is a strong English speaker. The agents' replies can be too
complex to follow (long sentences, rare words, idioms, unexplained jargon). There
is no built-in way to ask agents to write in simple, plain English.

## Goal

Ship a built-in `section` module that tells an agent to write in simple, plain
English, and compose it into the `task-analyze` agent so the analyst conversation
is easy to read. Keep it available (opt-in) for any other agent.

## Scope

### In scope

- **New built-in `section` module** (e.g. id `plain-language`, in a sensible
  module file under `packages/taskflow/src/agents/modules/`). Content: write in
  plain English — short sentences, common words, no idioms; define any technical
  term in simple words; prefer short lists and clear steps. Register it in
  `MODULE_REGISTRY` (`compose.ts`).
- **Compose it into the `task-analyze` agent** (the "analyze"/analyst agent). This
  changes a shipped agent, so **regenerate `TASK_ANALYZER_ROLE.md`** via
  `prompt-build --compose --apply` + `scripts/sync-role-templates.mjs` so the
  drift-guard test (`compose.test`) stays green.
- **Keep it opt-in for other agents** — registered and documented so users can add
  it to any agent via the composer; not forced onto the rest of the baseline.
- **Short docs** — a brief entry in `website/docs/built-ins/default-modules.md`
  (what it does, how to add it to an agent). Light touch.

### Out of scope

- Forcing simple English on **all** agents by default (deliberately opt-in for the
  rest — some users want detailed/technical writing).
- Changing how the assistant talks in normal chat (that is a personal preference /
  memory, not a shipped module).
- The authoring-flow opt-in question ("do you want simple English?") — explicitly
  declined by the owner.
- Translation / non-English output — this is *simpler English*, not other
  languages.

## Implementation plan

1. Author the `plain-language` section module + register it in `compose.ts`.
2. Add it to the `task-analyze` composed agent's modules.
3. Regenerate `TASK_ANALYZER_ROLE.md` (compose --apply + sync-role-templates) so
   the drift guard passes; verify `composeAgentById("task-analyze")` contains the
   plain-language section.
4. Doc entry in `built-ins/default-modules.md`.
5. Gates: `tsc`, `eslint`, `pnpm --dir packages/taskflow test` (incl. drift guard),
   `pnpm --dir website build`.

## Verification

- `plain-language` is registered as a `section` module and appears in the
  dashboard Modules browser.
- `task-analyze` composes it (visible in its prompt / the dashboard); drift guard
  green after re-sync.
- Other agents can add it via the composer (opt-in), and the doc explains how.
- All gates pass.

## Notes

- Decision trail: this folder's `ANALYSIS.md`.
- **Branch note:** created on `feat/authoring-flow` (nextId was 199) but **not**
  part of PR #137. Implement on its **own branch off `main`**, ideally **after**
  the authoring PR merges (so the tracker `nextId` lines up and this stays
  independent of the authoring work).
- "task-analyze" is the agent the owner talks to during analysis, so composing the
  module there directly improves the conversation they read.
