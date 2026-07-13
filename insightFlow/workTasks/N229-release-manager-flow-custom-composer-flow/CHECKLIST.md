# N229 — Release Manager Flow (custom composer flow) — Checklist

> Note: custom ids cannot contain `/` — section ids were created in hyphen form
> (e.g. `custom:task-release-check-identity`). All references use the hyphen form.

## Implementer subtasks (build in order)

### 1. Subagent modules

- [x] Create `custom:test-runner` (subagent): run the test suite, report pass/fail + failing tests. tools: Bash, Read; readonly.
- [x] Create `custom:release-intent-detector` (subagent): classify changes as bugfix / feature / breaking + justify. tools: Bash, Read, Grep; readonly.
- [x] Create `custom:docs-auditor` (subagent): diff changes vs Docusaurus + README + CHANGELOG; report gaps. tools: Read, Grep, Glob, Bash; readonly.
- [x] Create `custom:documentation-expert` (subagent): edit docs to close gaps. tools: Read, Edit, Write, Grep.
- [x] Create `custom:test-fixer` (subagent): fix failing tests by root cause, never rewrite to pass. tools: Read, Edit, Bash, Grep.
- [x] Create `custom:project-installer` (subagent): for one project, detect package manager, bump local `insight-flow` dep, run install, report. tools: Bash, Read, Edit.

### 2. Section modules — identities + roles

- [x] Create `custom:task-release-check-identity` + `custom:task-release-check-role` (run 3 checks, set `release-checked`).
- [x] Create `custom:task-release-plan-identity`, `custom:task-release-plan-guard` (refuse without prior check), `custom:task-release-plan-role` (set `ready-to-release` / `changes-needed`).
- [x] Create `custom:task-release-fix-identity` + `custom:task-release-fix-role` (fix docs/tests; STOP → `not-able-to-release` on wider rework).
- [x] Create `custom:task-release-ship-identity` + `custom:task-release-ship-publish` (npm publish + tag + CHANGELOG; self-approve GH deploy after gate).
- [x] Create `custom:task-release-rollout-identity` + `custom:task-release-rollout-install` (global install + per-project bump from `hub.json`; best-effort + report).

### 3. Handover modules (5)

- [x] Create `custom:handover-check-to-plan` — to plan, on `release-checked`, **auto**.
- [x] Create `custom:handover-plan-to-fix` — to fix, on `changes-needed`, **auto**.
- [x] Create `custom:handover-plan-to-ship` — to ship, on `ready-to-release`, **gated**.
- [x] Create `custom:handover-fix-to-check` — to check, on `release-fixed`, **gated** (cycle back-edge; never auto).
- [x] Create `custom:handover-ship-to-rollout` — to rollout, on `published`, **auto**.

### 4. Agents (5) — baseline order, subagents attached, command.install true

- [x] Create agent `custom:task-release-check` (entry) with its 3 subagents.
- [x] Create agent `custom:task-release-plan` (composes `template-copy`; NOT `authoring-spec-structure`).
- [x] Create agent `custom:task-release-fix` (reuses `minimal-diff` + `scope-guard`; 2 subagents).
- [x] Create agent `custom:task-release-ship` (reuses `task-git/*` sections + publish section).
- [x] Create agent `custom:task-release-rollout` (install section; `project-installer` subagent; terminal `done`).

### 5. Flow

- [x] Create flow `custom:release-manager`: 5 agents; entry `custom:task-release-check`; statuses incl. terminals `not-able-to-release` + `done`; edges 1–7 as specified; `install: ["activity"]`.

### 6. Install + verify

- [ ] Install the flow; confirm 5 slash commands + activity hooks emit for BOTH Claude and Cursor. — **deferred: install is the gated Composer Installer step, not done during build.**

## Quality gates

- [x] Every new definition composes/validates (all referenced module/subagent/agent ids resolve — re-`get` confirmed clean).
- [x] No built-in modified; all new ids use `custom:`; locked tier untouched.
- [x] Flow validates: `entryAgents ⊆ agents`, both terminals declared, cycle back-edge (fix→check) is gated (no auto cycle back-edge).

## Verification

- [ ] Smoke: `/task-release-check` runs, fans out to 3 subagents, reaches `release-checked`. — **needs install first (post-install / installer step).**
- [ ] Guard: `/task-release-plan` with no prior check refuses and tells the user to run `/task-release-check` first. — **needs install first (post-install / installer step).**
- [x] No real npm release or other-project mutation performed during build.
