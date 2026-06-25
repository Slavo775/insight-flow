---
title: Default agents
sidebar_label: Default agents
sidebar_position: 3
description: The 10 composed agents insight-flow ships — each one's role plus the exact list of module ids it composes.
---

# Default agents

A composed agent is a thin wrapper: an `id`, a `title`, a one-line
`description`, and a `modules` array of ids resolved from the registries on
[Default modules](./default-modules.md). insight-flow ships **10** composed
agents under `packages/taskflow/src/agents/composed/`. Each maps to a slash
command of the same name.

Every agent composes the three locked baseline modules (`security`,
`enforcement`, `protocol`) and ends with `actions` (phase reporting). The tables
below list the full `modules` array verbatim from each JSON file.

For each agent's prose contract see the [Agents](../agents/index.md) section;
for the model behind composition see
[Concepts → Agents](../concepts/agents.md).

:::note Artifacts
None of the 10 composed agents declare MCP servers. The artifacts they emit
(hooks, skills, commands) come from the modules they pull in — only `task-git`
pulls in `notify` + `config`; the activity hooks and testing/langfuse skills are
installed at the **flow** level, not baked into individual agents.
:::

---

## taskmaster — `/taskmaster`

Creates well-structured work items (TASK.md + CHECKLIST.md) with unique Nxx ids.

Modules: `taskmaster/identity`, `security`, `enforcement`, `protocol`,
`taskmaster/input-contract`, `taskmaster/output-contract`,
`taskmaster/role-specific-overrides`, `taskmaster/writing-style`,
`taskmaster/handover-implement`, `actions`.

---

## task-analyze — `/task-analyze`

Pre-taskmaster strategist: challenges briefs, proposes alternatives, hands off
to taskmaster.

Modules: `task-analyze/identity`, `security`, `enforcement`, `protocol`,
`task-analyze/input-contract`, `task-analyze/output-contract`,
`task-analyze/role-specific-overrides`, `task-analyze/never`,
`task-analyze/handover-taskmaster`, `actions`.

---

## task-implement — `/task-implement`

Implements a task from its spec — full mode or post-review change mode.

Modules: `task-implement/identity`, `security`, `enforcement`, `protocol`,
`task-implement/input-contract`, `task-implement/output-contract`,
`task-implement/role-specific-overrides`, `task-implement/never`,
`minimal-diff`, `task-implement/scope-guard`, `scope-guard`,
`task-implement/handover-git-implemented`,
`task-implement/handover-git-changes`, `actions`.

---

## task-review — `/task-review`

Strict AI code review of an implemented task against its spec.

Modules: `task-review/identity`, `security`, `enforcement`, `protocol`,
`task-review/input-contract`, `task-review/output-contract`,
`task-review/role-specific-overrides`, `task-review/critique-style`,
`task-review/handover-human-review`, `task-review/handover-review-fix`,
`actions`.

---

## task-review-fix — `/task-review-fix`

Fixes the blockers a review flagged, nothing more.

Modules: `task-review-fix/identity`, `security`, `enforcement`, `protocol`,
`task-review-fix/input-contract`, `task-review-fix/output-contract`,
`task-review-fix/role-specific-overrides`, `task-review-fix/never`,
`minimal-diff`, `task-review-fix/scope-guard`, `scope-guard`,
`task-review-fix/handover-review`, `actions`.

---

## task-human-review — `/task-human-review`

Records the human's review verdict verbatim into REVIEW.md and the tracker.

Modules: `task-human-review/identity`, `security`, `enforcement`, `protocol`,
`task-human-review/input-contract`, `task-human-review/output-contract`,
`task-human-review/role-specific-overrides`, `task-human-review/never`,
`recorder-discipline`, `task-human-review/handover-review-fix`,
`task-human-review/handover-git`, `task-human-review/handover-request-changes`,
`actions`.

---

## task-git — `/task-git`

Handles git operations for work tasks: branch, commit, push, PR creation, and
merge. The only agent that pulls in `notify` + `config`.

Modules: `notify`, `config`, `security`, `enforcement`, `protocol`,
`task-git/identity`, `task-git/input-contract`, `task-git/conventions`,
`task-git/permission-gates`, `task-git/git-permissions`,
`task-git/workflow-push`, `task-git/workflow-create-pull-request`,
`task-git/workflow-merge`, `task-git/edge-cases`, `task-git/safety`,
`task-git/token-efficiency`, `task-git/examples-appendix`,
`task-git/handover-review`, `actions`.

---

## task-incident — `/task-incident`

Investigates and fixes production incidents tracked against a task.

Modules: `task-incident/identity`, `security`, `enforcement`, `protocol`,
`task-incident/input-contract`, `task-incident/output-contract`,
`task-incident/role-specific-workflow`, `task-incident/incident-statuses`,
`task-incident/never`, `minimal-diff`, `actions`.

---

## task-request-changes — `/task-request-changes`

Records the human's post-testing change requests for change-mode implementation.

Modules: `task-request-changes/identity`, `security`, `enforcement`, `protocol`,
`task-request-changes/input-contract`, `task-request-changes/output-contract`,
`task-request-changes/role-specific-overrides`, `task-request-changes/never`,
`recorder-discipline`, `task-request-changes/handover-implement`, `actions`.

---

## taskmaster-change — `/taskmaster-change`

Modifies an existing task's spec documents on request.

Modules: `taskmaster-change/identity`, `security`, `enforcement`, `protocol`,
`taskmaster-change/input-contract`, `taskmaster-change/output-contract`,
`taskmaster-change/role-specific-overrides`, `taskmaster-change/never`,
`taskmaster-change/handover-implement`, `actions`.

---

## At a glance

| Agent                  | Role file                         | Handover(s)                                                        | Extra singletons              |
| ---------------------- | --------------------------------- | ------------------------------------------------------------------ | ----------------------------- |
| `taskmaster`           | `roles/taskmaster.json`           | → `task-implement` (ready)                                         | —                             |
| `task-analyze`         | `roles/task-analyze.json`         | → `taskmaster`                                                     | —                             |
| `task-implement`       | `roles/task-implement.json`       | → `task-git` (implemented / changes-implemented)                   | `minimal-diff`, `scope-guard` |
| `task-review`          | `roles/task-review.json`          | → `task-human-review` (approved), → `task-review-fix` (fix-needed) | —                             |
| `task-review-fix`      | `roles/task-review-fix.json`      | → `task-review` (fixed)                                            | `minimal-diff`, `scope-guard` |
| `task-human-review`    | `roles/task-human-review.json`    | → `task-review-fix`, → `task-git`, → `task-request-changes`        | `recorder-discipline`         |
| `task-git`             | `roles/task-git.json`             | → `task-review` (pushed)                                           | `notify`, `config`            |
| `task-incident`        | `roles/task-incident.json`        | —                                                                  | `minimal-diff`                |
| `task-request-changes` | `roles/task-request-changes.json` | → `task-implement` (changes-requested)                             | `recorder-discipline`         |
| `taskmaster-change`    | `roles/taskmaster-change.json`    | → `task-implement` (ready)                                         | —                             |
