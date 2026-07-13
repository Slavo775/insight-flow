# N230 — Frontend Flow (custom composer flow)

**Type:** feat
**Priority:** high
**Created:** 2026-07-13

## Problem

- Frontend (UI) work in insight-flow spans two very different surfaces — the master-server UI (`src/master/`, server-rendered HTML/JS) and the project dashboard UI (`src/dashboard/client/`, React + Vite) — and there is no guided flow that decides which surface a change belongs to, reuses existing components, and enforces front-end quality (performance, accessibility, semantic HTML, CSS hygiene).
- The user also designs UIs in a Lovable app and wants a flow that reads that Lovable project (via the Lovable MCP) to understand the intended UI before building it in the real code.
- We want one flow that analyzes (code + Lovable), plans, implements with FE discipline, and reviews the UI code in a dual AI-then-human pass.

## Goal

1. A new custom composer flow `custom:frontend` with 4 agents named `task-fe-*`, cloning the `composer-authoring` topology (analyze → plan → implement ↔ review → done) minus the install stage.
2. The analyzer inspects the code and the Lovable app (via the Lovable MCP), resolves master-UI vs dashboard-UI and new-vs-rework, and proposes a reuse-maximizing approach.
3. The implementer builds in the resolved surface with strong FE quality (performance, WCAG/a11y, focus, semantic HTML, CSS hygiene) and ticks every checklist box; the reviewer runs a dual AI-then-human pass; `done` is reachable only after human approval.
4. Live dashboard status (activity engine, tokenless); emitted for both Claude and Cursor.

## Scope

### In scope

- Author (all `custom:` ids) via the composer MCP:
  - 1 flow: `custom:frontend`.
  - 4 agents: `custom:task-fe-analyze`, `custom:task-fe-plan`, `custom:task-fe-implement`, `custom:task-fe-review`.
  - 9 section modules (4 identities + 4 roles + `custom:fe-quality`).
  - 4 subagent modules: `fe-surface-resolver`, `fe-component-scout`, `fe-a11y-reviewer`, `fe-ui-reviewer`.
  - 1 mcp-server module: `custom:mcp-lovable`.
  - 5 handover modules.
- Flow statuses + edges in the flow; add the built-in `activity` bundle and `custom:mcp-lovable` to the flow's `install`.
- Target both Claude and Cursor harnesses.

### Out of scope

- Do NOT edit or override any built-in module (locked `security` / `enforcement` / `protocol`, any built-in `handover` / `status-transition`).
- Do NOT add `authoring-spec-structure` to `task-fe-plan` (it writes a normal FE task spec, not a composer build spec).
- No `${VAR}` secret for Lovable — it is OAuth (browser login on first use).
- No `status-transition` modules (statuses live in the flow).
- No separate verify/install agent — the implementer self-checks and the human review pass is the final gate before `done`.
- Do NOT build any real UI feature or call Lovable for real during this task — only author + smoke-test the flow.

## Inventory — everything to build or change

Reuse-first note: the closest built-in agents/sections are read-only templates → author `custom:` variants; reuse the shared built-in modules by reference. Custom ids cannot contain `/` (use hyphen form).

### Reuse as-is (reference, author nothing)

- `security`, `enforcement`, `protocol` (locked), `actions`, `plain-language`.
- `template-copy` (for the taskmaster).
- `minimal-diff`, `scope-guard` (for the implementer).
- `task-review/critique-style`, `recorder-discipline` (for the reviewer).
- `activity` bundle (added to the flow's `install`).
- `testing` bundle — optional adjacent test tooling for the implementer.

### Modules — new custom

**Sections (9):**

| id | kind | holds | verdict |
|---|---|---|---|
| `custom:task-fe-analyze-identity` | section | Analyzer identity (entry; reads code + Lovable; read-only). | new |
| `custom:task-fe-analyze-role` | section | Steps: resolve surface (master vs dashboard) + new/rework, inspect Lovable app (project id), propose reuse-maximizing approach, set status, gated handover to plan. | new |
| `custom:task-fe-plan-identity` | section | Taskmaster identity (create + change spec). | new |
| `custom:task-fe-plan-role` | section | Create/change spec; split into subtasks + checklist; set `ready`; re-invocable for spec changes. | new |
| `custom:task-fe-implement-identity` | section | Implementer + fixer identity. | new |
| `custom:task-fe-implement-role` | section | Build in resolved surface; tick all boxes; may use Lovable; `implementing`→`implemented`; FIX mode for review blockers. | new |
| `custom:task-fe-review-identity` | section | Dual AI+human reviewer identity (mode by intent). | new |
| `custom:task-fe-review-role` | section | AI pass → `ai-approved` (self-loop), human pass → `approved`/`fix-needed`; REVIEW.md scaffolding (round N). | new |
| `custom:fe-quality` | section | FE quality rules: performance, WCAG/a11y, focusable actions, no needless `!important`, semantic HTML (`button`/`aside`/`select`). | new |

**mcp-server (1):**

| id | kind | config | verdict |
|---|---|---|---|
| `custom:mcp-lovable` | mcp-server | `{ "type": "http", "url": "https://mcp.lovable.dev" }` — OAuth (no `${VAR}` secret). For Cursor, an optional public `auth.CLIENT_ID` may be added. | new |

### Subagents — new custom

| name | purpose | tools | readonly | of agent |
|---|---|---|---|---|
| `custom:fe-surface-resolver` | Decide master-server UI vs project dashboard UI, and new-feature vs rework; point to the right code area. | Read, Grep, Glob, Bash | yes | analyze |
| `custom:fe-component-scout` | Find existing components to reuse/rework; flag what to make reusable for the future. | Read, Grep, Glob | yes | analyze |
| `custom:fe-a11y-reviewer` | Review UI for WCAG/a11y, focus order, semantic HTML. | Read, Grep, Glob | yes | review |
| `custom:fe-ui-reviewer` | Review UI for correctness, performance, component reuse, CSS hygiene (no needless `!important`). | Read, Grep, Glob | yes | review |

### Agents — ordered `modules` (baseline: identity → security → enforcement → protocol → [role] → [handovers] → actions; `command.install: true` each)

1. **`custom:task-fe-analyze`** (ENTRY)
   - modules: `custom:task-fe-analyze-identity`, `security`, `enforcement`, `protocol`, `plain-language`, `custom:task-fe-analyze-role`, `custom:fe-handover-analyze-plan`, `actions`
   - subagents: `custom:fe-surface-resolver`, `custom:fe-component-scout`
2. **`custom:task-fe-plan`** (Taskmaster)
   - modules: `custom:task-fe-plan-identity`, `security`, `enforcement`, `protocol`, `plain-language`, `template-copy`, `custom:task-fe-plan-role`, `custom:fe-handover-plan-implement`, `actions`
3. **`custom:task-fe-implement`** (Implementer + fixer)
   - modules: `custom:task-fe-implement-identity`, `security`, `enforcement`, `protocol`, `plain-language`, `minimal-diff`, `scope-guard`, `custom:fe-quality`, `custom:task-fe-implement-role`, `custom:fe-handover-implement-review`, `actions`
4. **`custom:task-fe-review`** (Reviewer, dual AI+human)
   - modules: `custom:task-fe-review-identity`, `security`, `enforcement`, `protocol`, `plain-language`, `recorder-discipline`, `task-review/critique-style`, `custom:task-fe-review-role`, `custom:fe-handover-review-implement`, `custom:fe-handover-review-selfloop`, `actions`
   - subagents: `custom:fe-a11y-reviewer`, `custom:fe-ui-reviewer`

### Flow — `custom:frontend`

- agents: the 4 above.
- entryAgents: `custom:task-fe-analyze` (analyze-only entry).
- statuses (inline): `in-progress`, `ready`, `implementing`, `implemented`, `reviewing`, `ai-approved`, `approved`, `fix-needed`, `fixing`, `fixed`, `done` (terminal).
- install: `["activity", "custom:mcp-lovable"]`.
- harness: Claude + Cursor.

### Relationships — edges + handovers (single task token)

| # | from → to | on | mode | when |
|---|---|---|---|---|
| 1 | analyze → plan | (none) | **gated** | Analysis + approach approved by the human before a spec is written. |
| 2 | plan → implement | `ready` | **gated** | The split spec + checklist are ready and approved. |
| 3 | implement → review | `implemented` | **auto** | Build done and all boxes ticked — go straight to the AI review. |
| 4 | implement → review | `fixed` | **auto** | Fix pass done — re-review. |
| 5 | review → implement | `fix-needed` | **gated** | AI or human found blockers (cycle back-edge — never auto). |
| 6 | review → review | `ai-approved` | **gated** (self-loop) | AI pass approved — hand to the human review pass. |
| 7 | review → **done** | `approved` | terminator | Human review approved. |

- Handover modules to author: `custom:fe-handover-analyze-plan` (gated), `custom:fe-handover-plan-implement` (gated), `custom:fe-handover-implement-review` (auto), `custom:fe-handover-review-implement` (gated), `custom:fe-handover-review-selfloop` (gated). Edge 7 is a terminal flow edge (no module).
- **Guard:** the reviewer emits `ai-approved` after the AI pass and `approved` only after the human pass. There is no `review → done on ai-approved` edge, so `done` is reachable only after human approval.
- **Spec changes:** re-invoke `custom:task-fe-plan` on the task (no extra edge).

## Verification

- **Composes / renders:** each new agent composes without error (all referenced module + subagent ids resolve; baseline order correct).
- **Flow valid:** `custom:frontend` validates — every edge endpoint resolves, `entryAgents ⊆ agents`, `done` is the only terminal, edge 5 and edge 6 are gated (no auto cycle/self-loop), and there is NO `review → done on ai-approved` edge (human-gate intact).
- **MCP config sane:** `custom:mcp-lovable` writes `{ "type": "http", "url": "https://mcp.lovable.dev" }` to `.mcp.json` on install; no `${VAR}` prompt (OAuth).
- **Install dry-run:** installing the flow emits 4 slash commands + the 4 subagents + activity hooks + the Lovable MCP entry for BOTH Claude and Cursor; no built-in modified.
- **Smoke run:** `/task-fe-analyze` starts and fans out to its 2 subagents; the reviewer's `ai-approved` self-loop cannot jump to `done`.
- **No real side effects** during build: no real UI feature built, no real Lovable calls.

## Notes

- **Lovable MCP:** official remote HTTP server at `https://mcp.lovable.dev`, OAuth (browser login on first use — no API key/secret). Project id `c27ddae3-ad00-4532-9f79-924bf080ee19` is passed as an argument in the analyzer/implementer Lovable tool calls (in their role prompts, NOT the server config).
- **Two UI surfaces:** master-server UI = `src/master/` (server-rendered HTML/JS, e.g. `overview.ts`); project dashboard UI = `src/dashboard/client/` (React + Vite, styled-components, react-router, @xyflow/react). The `fe-surface-resolver` subagent picks one; the implementer role describes both.
- Opt-ins recorded: activity = YES; harness = Claude + Cursor; verify = implementer self-check + human review gate (no separate verify agent); entry = analyze-only.
- Custom ids cannot contain `/` — use hyphen form (e.g. `custom:task-fe-analyze-identity`).
- Related: analyst brief in `ANALYSIS.md` (this folder). Belongs on the `insight-flow-flows` branch (PR #148).
