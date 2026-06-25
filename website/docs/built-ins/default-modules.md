---
title: Default modules
sidebar_label: Default modules
sidebar_position: 2
description: Every module insight-flow ships by default, grouped by kind — id, kind, locked status, and what it does.
---

# Default modules

Every agent is a list of module ids. This page enumerates the modules that ship
in the box, grouped by what they are. Each entry lives as a JSON registry under
`packages/taskflow/src/agents/modules/`. For the conceptual model — what a
module _is_ and how `kind` works — see
[Concepts → Everything is a module](../concepts/modules.md).

A module's `kind` is one of: `include` (a pointer to a canonical `.md` file),
`section` (inline prompt text), `hook` (a Claude Code lifecycle hook), `skill`
(a slash command / skill file), `handover` (a hand-off rule between agents), or
`bundle` (a named group of other module ids).

---

## Cross-cutting baseline (LOCKED)

These three `include` modules are read-only and can never be ejected. The set is
the single source of truth in `packages/taskflow/src/core/locked.ts`
(`LOCKED_MODULE_IDS`). Every composed agent inherits all three. Files live at
`modules/security.json`, `modules/enforcement.json`, `modules/protocol.json`.

| id            | kind    | locked? | What it does                                                                                                                                                                             |
| ------------- | ------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `security`    | include | **yes** | Prompt-injection guardrails — untrusted content is data, exfiltration / hijacking / persona-override prevention, anomaly response, high-risk action gate. Points at `AGENT_SECURITY.md`. |
| `enforcement` | include | **yes** | Strict task-file mutation rules every role inherits. Points at `AGENT_ENFORCEMENT.md`.                                                                                                   |
| `protocol`    | include | **yes** | The shared lifecycle workflow all roles follow. Points at `AGENT_PROTOCOL.md`.                                                                                                           |

---

## Global singletons

Shared, single-instance modules reused across many agents. Files live directly
under `modules/`.

| id                    | kind    | locked? | What it does                                                                                                                                                  |
| --------------------- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config`              | include | no      | Runtime config-reading protocol (e.g. `agents.git.permissions` gates for `task-git`). Points at `AGENT_CONFIG.md`.                                            |
| `notify`              | include | no      | The notification contract — notifications are hook-driven; agents never call `notify` directly. Points at `AGENT_NOTIFY.md`.                                  |
| `actions`             | section | no      | Model-initiated phase reporting: the agent calls `insight-flow log-event` at phase boundaries. Wrapped in `taskflow:phase-markers` so consumers can strip it. |
| `minimal-diff`        | section | no      | Discipline: never touch unrelated code, never refactor beyond the request.                                                                                    |
| `scope-guard`         | section | no      | Discipline: stop and ask before leaving the declared scope; ask on ambiguity.                                                                                 |
| `recorder-discipline` | section | no      | Discipline for recorder roles: preserve exact wording, invent nothing, never decide for the human.                                                            |

---

## Activity integration (telemetry)

Lives in `modules/integrations/activity.json`. Six harness-observed lifecycle
hooks plus a `bundle` that references all six. The default flow installs this
bundle (`install: ["activity"]`). No model involvement — these are Claude Code
hook scripts.

| id                       | kind   | event               | What it does                                                              |
| ------------------------ | ------ | ------------------- | ------------------------------------------------------------------------- |
| `activity/session-start` | hook   | `SessionStart`      | Emits `session-start` when a Claude Code session begins.                  |
| `activity/agent-active`  | hook   | `UserPromptSubmit`  | Emits `agent-active` when an insight-flow skill prompt is submitted.      |
| `activity/agent-idle`    | hook   | `Stop`              | Emits `agent-idle` (and notifies) when the agent stops.                   |
| `activity/pre-tool`      | hook   | `PreToolUse`        | Emits `tool-requested` before each tool call while active.                |
| `activity/post-tool`     | hook   | `PostToolUse`       | Emits `file-written` / `file-edited` / `tool-approved` after tool calls.  |
| `activity/permission`    | hook   | `PermissionRequest` | Emits `approval-required` (+ bell + notification) on permission requests. |
| `activity`               | bundle | —                   | Bundles the six hooks above as one installable reference.                 |

---

## Testing integration

Lives in `modules/integrations/testing.json`. A discipline prompt, a post-edit
reminder hook, a run-tests skill, and a `bundle` of all three. insight-flow
ships **no** default test command — the skill reads the project's configured
command.

| id               | kind    | What it does                                                                                             |
| ---------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `testing/prompt` | section | Discipline: run the suite after changes, report failures verbatim, never mark complete with a red suite. |
| `testing/hook`   | hook    | `PostToolUse` (matcher `Edit\|Write`) reminder that nudges to run tests after an edit.                   |
| `testing/skill`  | skill   | `taskflow-run-tests` — runs the project's configured test command and reports results verbatim.          |
| `testing`        | bundle  | Bundles the three testing modules above.                                                                 |

---

## Langfuse integration

Lives in `modules/integrations/langfuse.json`. A single opt-in pointer skill —
it does not fork upstream Langfuse content.

| id                     | kind  | What it does                                                                                                                                                                        |
| ---------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `langfuse/setup-skill` | skill | `langfuse-setup` — pointer skill: how to install the official Langfuse plugin (instruments your app's LLM calls) and how to enable insight-flow's built-in N157 lifecycle exporter. |

---

## Role-specific modules

Per-agent prompt sections, one registry file per role under `modules/roles/`.
Each is a list of `section` modules (identity, contracts, overrides, etc.).
These are the modules an agent composes _in addition to_ the baseline,
singletons, and its handover(s).

| Role file                         | Module ids                                                                                                                                                                                                                                                                                                                         | Notable kinds                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `roles/taskmaster.json`           | `taskmaster/identity`, `taskmaster/input-contract`, `taskmaster/output-contract`, `taskmaster/role-specific-overrides`, `taskmaster/writing-style`                                                                                                                                                                                 | section ×5                                                             |
| `roles/task-analyze.json`         | `task-analyze/identity`, `task-analyze/input-contract`, `task-analyze/output-contract`, `task-analyze/role-specific-overrides`, `task-analyze/never`                                                                                                                                                                               | section ×5                                                             |
| `roles/task-implement.json`       | `task-implement/identity`, `task-implement/input-contract`, `task-implement/output-contract`, `task-implement/role-specific-overrides`, `task-implement/never`, `task-implement/scope-guard`                                                                                                                                       | section ×6                                                             |
| `roles/task-review.json`          | `task-review/identity`, `task-review/input-contract`, `task-review/output-contract`, `task-review/role-specific-overrides`, `task-review/critique-style`                                                                                                                                                                           | section ×5                                                             |
| `roles/task-review-fix.json`      | `task-review-fix/identity`, `task-review-fix/input-contract`, `task-review-fix/output-contract`, `task-review-fix/role-specific-overrides`, `task-review-fix/never`, `task-review-fix/scope-guard`                                                                                                                                 | section ×6                                                             |
| `roles/task-human-review.json`    | `task-human-review/identity`, `task-human-review/input-contract`, `task-human-review/output-contract`, `task-human-review/role-specific-overrides`, `task-human-review/never`                                                                                                                                                      | section ×5                                                             |
| `roles/task-git.json`             | `task-git/identity`, `task-git/input-contract`, `task-git/conventions`, `task-git/permission-gates`, `task-git/git-permissions`, `task-git/workflow-push`, `task-git/workflow-create-pull-request`, `task-git/workflow-merge`, `task-git/edge-cases`, `task-git/safety`, `task-git/token-efficiency`, `task-git/examples-appendix` | section ×11 + include ×1 (`task-git/git-permissions` → `AGENT_GIT.md`) |
| `roles/task-incident.json`        | `task-incident/identity`, `task-incident/input-contract`, `task-incident/output-contract`, `task-incident/role-specific-workflow`, `task-incident/incident-statuses`, `task-incident/never`                                                                                                                                        | section ×6                                                             |
| `roles/task-request-changes.json` | `task-request-changes/identity`, `task-request-changes/input-contract`, `task-request-changes/output-contract`, `task-request-changes/role-specific-overrides`, `task-request-changes/never`                                                                                                                                       | section ×5                                                             |
| `roles/taskmaster-change.json`    | `taskmaster-change/identity`, `taskmaster-change/input-contract`, `taskmaster-change/output-contract`, `taskmaster-change/role-specific-overrides`, `taskmaster-change/never`                                                                                                                                                      | section ×5                                                             |

---

## Handover modules

Lives in `modules/handovers.json`. Thirteen `handover` modules — the canonical
hand-off rules wired into composed agents. Each carries a `to` agent, an
optional `on` status trigger, and a `mode` (`gated` = waits for human go-ahead;
`auto` = fires on the status). See
[Concepts → Handover](../concepts/handover.md) for the model.

| id                                           | to                     | on                    | mode  |
| -------------------------------------------- | ---------------------- | --------------------- | ----- |
| `task-analyze/handover-taskmaster`           | `taskmaster`           | —                     | gated |
| `taskmaster/handover-implement`              | `task-implement`       | `ready`               | gated |
| `taskmaster-change/handover-implement`       | `task-implement`       | `ready`               | gated |
| `task-implement/handover-git-implemented`    | `task-git`             | `implemented`         | auto  |
| `task-implement/handover-git-changes`        | `task-git`             | `changes-implemented` | auto  |
| `task-git/handover-review`                   | `task-review`          | `pushed`              | gated |
| `task-review/handover-human-review`          | `task-human-review`    | `approved`            | gated |
| `task-review/handover-review-fix`            | `task-review-fix`      | `fix-needed`          | gated |
| `task-review-fix/handover-review`            | `task-review`          | `fixed`               | gated |
| `task-human-review/handover-review-fix`      | `task-review-fix`      | `fix-needed`          | gated |
| `task-human-review/handover-git`             | `task-git`             | `approved`            | auto  |
| `task-human-review/handover-request-changes` | `task-request-changes` | `done`                | gated |
| `task-request-changes/handover-implement`    | `task-implement`       | `changes-requested`   | gated |

---

## Counts at a glance

| Group                           | Count                                          |
| ------------------------------- | ---------------------------------------------- |
| Cross-cutting baseline (locked) | 3                                              |
| Global singletons               | 6                                              |
| Activity integration            | 6 hooks + 1 bundle                             |
| Testing integration             | 3 modules + 1 bundle                           |
| Langfuse integration            | 1 skill                                        |
| Role-specific modules           | 59 sections + 1 include (across 10 role files) |
| Handover modules                | 13                                             |
