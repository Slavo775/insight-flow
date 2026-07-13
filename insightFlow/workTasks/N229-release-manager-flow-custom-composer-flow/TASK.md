# N229 — Release Manager Flow (custom composer flow)

**Type:** feat
**Priority:** high
**Created:** 2026-07-13

## Problem

- Releasing insight-flow today is manual and easy to get wrong: nobody enforces that tests pass, that the release intent (bugfix / feature / breaking) is known, or that docs (Docusaurus + README + CHANGELOG) match the changes before publish.
- After a successful npm release there is no step that spreads the new version to the machine and to the other projects that use insight-flow, so bulk-registered projects drift behind.
- We want one guided flow that checks readiness, fixes gaps, publishes, and rolls out — with clear stops for the risky steps.

## Goal

1. A new custom composer flow `custom:release-manager` with 5 agents named `task-release-*`.
2. The flow checks release readiness (tests, intent, docs), creates a release-prep task, fixes doc/test gaps, publishes to npm behind one human gate, then rolls the new version out globally and to every bulk-registered project.
3. Two clear end points: `done` (released + rolled out) and `not-able-to-release` (needs wider work → switch to the default flow).
4. Live agent status shown in the dashboard (activity engine, tokenless), emitted for both Claude and Cursor.

## Scope

### In scope

- Author (all `custom:` ids) via the composer MCP:
  - 1 flow: `custom:release-manager`.
  - 5 agents: `custom:task-release-check`, `custom:task-release-plan`, `custom:task-release-fix`, `custom:task-release-ship`, `custom:task-release-rollout`.
  - 5 role identities + role sections (one set per agent).
  - 6 subagent modules: `test-runner`, `release-intent-detector`, `docs-auditor`, `documentation-expert`, `test-fixer`, `project-installer`.
  - 2 new `section` modules: a publish section (npm publish + tag + changelog) and a rollout/install section.
  - 5 handover modules (one per non-terminal flow edge; built-in handovers are locked, so these are new).
- Flow statuses + edges defined in the flow itself.
- Add the built-in `activity` bundle to the flow's `install`.
- Target both Claude and Cursor harnesses.
- Install + smoke-test the flow.

### Out of scope

- Do NOT edit or override any built-in module (especially locked `security` / `enforcement` / `protocol` and any built-in `handover` / `status-transition`).
- Do NOT add `authoring-spec-structure` to the taskmaster (`task-release-plan` writes a normal release-prep task, not a composer build spec).
- No MCP server module (publish/rollout use plain shell: `gh`, `npm`).
- No `status-transition` modules (statuses live inline in the flow).
- Do NOT actually run a real npm release or mutate other projects while building — only author + smoke-test the flow.

## Inventory — everything to build or change

Reuse-first note: the registry is **built-in only** today (0 custom defs). Nothing can be edited in place; every item below is either **reuse-as-is (reference only)** or **new custom**.

### Reuse as-is (reference, author nothing)

- `security`, `enforcement`, `protocol` (locked — reference in baseline), `actions`.
- `template-copy` (for the taskmaster).
- `minimal-diff`, `scope-guard` (for the implementer).
- `task-git/*` workflow sections for the publisher: `task-git/conventions`, `task-git/permission-gates`, `task-git/git-permissions`, `task-git/workflow-merge`, `task-git/safety` (add others from the set only if needed).
- `activity` bundle (added to the flow's `install`).
- `testing` bundle (`testing/skill`, `testing/hook`) — adjacent test tooling reused by the checker / implementer where useful.

### Modules — new custom `section`s

| id | kind | holds | verdict |
|---|---|---|---|
| `custom:task-release-check/identity` | section | Checker role identity + purpose. | new |
| `custom:task-release-check/role` | section | What to release, which branch, run the 3 checks, produce a readiness verdict, set status `release-checked`. | new |
| `custom:task-release-plan/identity` | section | Taskmaster role identity. | new |
| `custom:task-release-plan/role` | section | Create the release-prep task; set `ready-to-release` or `changes-needed`. | new |
| `custom:task-release-plan/guard` | section | GUARD precondition: refuse to create a task unless a prior release-check ran; stop and tell the user to run `/task-release-check` first. | new |
| `custom:task-release-fix/identity` | section | Implementer role identity. | new |
| `custom:task-release-fix/role` | section | Fix docs + tests via the 2 subagents; on wider rework STOP and go terminal `not-able-to-release` (propose a normal task on the default flow). | new |
| `custom:task-release-ship/identity` | section | Publisher role identity. | new |
| `custom:task-release-ship/publish` | section | npm publish + tag + CHANGELOG; after the human gate, self-approve the GitHub Actions deploy (`gh api pending_deployments`). | new |
| `custom:task-release-rollout/identity` | section | Rollout role identity. | new |
| `custom:task-release-rollout/install` | section | Poll `npm view insight-flow@X.Y.Z` until available, then `npm i -g`; read `~/.insight-flow/hub.json`; for every `bulkRegistered` project with a local `insight-flow` dep, detect the package manager, bump to the new version, run install; best-effort, print a per-project result table. | new |

### Subagents — new custom `subagent` modules

| name | purpose | tools | readonly | of agent |
|---|---|---|---|---|
| `custom:test-runner` | Run the project test suite; report pass/fail + failing tests. | Bash, Read | yes | check |
| `custom:release-intent-detector` | Read the changes/diff; classify intent bugfix / feature / breaking; write a short justification. | Bash, Read, Grep | yes | check |
| `custom:docs-auditor` | Diff changes vs Docusaurus docs + README + CHANGELOG; report what is undocumented or stale. | Read, Grep, Glob, Bash | yes | check |
| `custom:documentation-expert` | Edit the docs to close the gaps the auditor found. | Read, Edit, Write, Grep | no | fix |
| `custom:test-fixer` | Understand WHY a test fails and fix the root cause — do NOT rewrite the test to pass. | Read, Edit, Bash, Grep | no | fix |
| `custom:project-installer` | For one registered project: detect the package manager, bump the local `insight-flow` dep, run install; report result. | Bash, Read, Edit | no | rollout |

### Agents — ordered `modules` (baseline: identity → security → enforcement → protocol → [role] → [handovers] → actions)

1. **`custom:task-release-check`** (ENTRY)
   - modules: `custom:task-release-check/identity`, `security`, `enforcement`, `protocol`, `custom:task-release-check/role`, `custom:handover-check-to-plan`, `actions`
   - subagents: `custom:test-runner`, `custom:release-intent-detector`, `custom:docs-auditor`
   - command.install: true
2. **`custom:task-release-plan`** (Taskmaster)
   - modules: `custom:task-release-plan/identity`, `template-copy`, `security`, `enforcement`, `protocol`, `custom:task-release-plan/guard`, `custom:task-release-plan/role`, `custom:handover-plan-to-fix`, `custom:handover-plan-to-ship`, `actions`
   - command.install: true
3. **`custom:task-release-fix`** (Implementer)
   - modules: `custom:task-release-fix/identity`, `security`, `enforcement`, `protocol`, `minimal-diff`, `scope-guard`, `custom:task-release-fix/role`, `custom:handover-fix-to-check`, `actions`
   - subagents: `custom:documentation-expert`, `custom:test-fixer`
   - terminal outcome `not-able-to-release` handled in `role` (no agent handover)
   - command.install: true
4. **`custom:task-release-ship`** (Publisher)
   - modules: `custom:task-release-ship/identity`, `security`, `enforcement`, `protocol`, `task-git/conventions`, `task-git/permission-gates`, `task-git/git-permissions`, `task-git/workflow-merge`, `task-git/safety`, `custom:task-release-ship/publish`, `custom:handover-ship-to-rollout`, `actions`
   - command.install: true
5. **`custom:task-release-rollout`** (Rollout)
   - modules: `custom:task-release-rollout/identity`, `security`, `enforcement`, `protocol`, `custom:task-release-rollout/install`, `actions` (terminal `done` — no agent handover)
   - subagents: `custom:project-installer`
   - command.install: true

### Flow — `custom:release-manager`

- agents: `custom:task-release-check`, `custom:task-release-plan`, `custom:task-release-fix`, `custom:task-release-ship`, `custom:task-release-rollout`
- entryAgents: `custom:task-release-check`
- statuses (declared inline): `release-checked`, `ready-to-release`, `changes-needed`, `fixing`, `release-fixed`, `publishing`, `published`, `not-able-to-release` (terminal), `done` (terminal — reuse standard id)
- install: `["activity"]`
- harness targets: Claude + Cursor

### Relationships — edges + handovers (single task token)

| # | from → to | on | mode | when (reason) |
|---|---|---|---|---|
| 1 | check → plan | `release-checked` | **auto** | Checks passed and readiness is known; checker is read-only so chaining is safe. |
| 2 | plan → fix | `changes-needed` | **auto** | Docs/tests need work; edits are reversible. |
| 3 | plan → ship | `ready-to-release` | **gated** | Next step merges + publishes (irreversible) — needs one explicit human go-ahead. |
| 4 | fix → check | `release-fixed` | **gated** | Cycle back-edge; re-run all checks before shipping. Never auto (cycle guard). |
| 5 | fix → `not-able-to-release` (terminal) | `not-able-to-release` | terminator | Fix needs wider rework; stop and propose a normal task on the default flow. |
| 6 | ship → rollout | `published` | **auto** | Publish done; spread the version. No new irreversible decision. |
| 7 | rollout → `done` (terminal) | `done` | terminator | Released and rolled out. |

- **Guard** (plan refuses without a prior check) is a **role-section precondition** in `custom:task-release-plan/guard`, NOT an edge.
- Handover modules to author: `custom:handover-check-to-plan` (auto), `custom:handover-plan-to-fix` (auto), `custom:handover-plan-to-ship` (gated), `custom:handover-fix-to-check` (gated), `custom:handover-ship-to-rollout` (auto). Edges 5 and 7 are terminators (no handover module — the role section decides the terminal status).

## Verification

- **Composes / renders:** each new agent composes without error (composer `get`/build validates every referenced module id resolves; baseline order correct).
- **Flow valid:** `custom:release-manager` validates — every edge endpoint resolves, `entryAgents ⊆ agents`, both terminal statuses declared, no auto back-edge on the cycle (edge 4 is gated).
- **Install dry-run:** installing the flow emits 5 slash commands + the `activity` hooks for BOTH Claude and Cursor; no built-in was modified.
- **Smoke run:** `/task-release-check` starts, fans out to its 3 subagents, and reaches `release-checked`; `/task-release-plan` refuses when invoked with no prior check (guard works).
- **No real release side effects** during build: publish + rollout are authored and reviewed but not executed against npm or other projects.

## Notes

- **Known risk (record, do not fix here):** the rollout force-bumps every bulk-registered project with a local dep. `debugger-pro-plus-3000` pins `insight-flow@0.5.0`; jumping to `2.4.x` is a major leap that may need the layout migration (`workTasks/` → `insightFlow/`). Best-effort + per-project report keeps it non-fatal, but that project may need a manual follow-up. `koktejl-new` has no local dep → reported as "nothing to bump".
- Bulk-registered projects come from `~/.insight-flow/hub.json` (`bulkRegistered: true`), with `path` + `port` per entry.
- Opt-ins recorded: activity engine = YES; harness = Claude + Cursor; MCP = none.
- Reuse-first, custom-only, locked-tier rules from the authoring conventions apply throughout.
- Related: analyst brief captured in `ANALYSIS.md` (this folder).
