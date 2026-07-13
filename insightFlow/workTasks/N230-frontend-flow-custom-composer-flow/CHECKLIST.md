# N230 — Frontend Flow (custom composer flow) — Checklist

> Note: custom ids cannot contain `/` — use hyphen form (e.g. `custom:task-fe-analyze-identity`).

## Implementer subtasks (build in order)

### 1. MCP + subagent modules

- [x] Create `custom:mcp-lovable` (mcp-server): config `{ "type": "http", "url": "https://mcp.lovable.dev" }`; OAuth, NO `${VAR}` secret.
- [x] Create `custom:fe-surface-resolver` (subagent): master-UI vs dashboard-UI + new/rework; point to the code area. tools: Read, Grep, Glob, Bash; readonly.
- [x] Create `custom:fe-component-scout` (subagent): find components to reuse/rework + what to make reusable. tools: Read, Grep, Glob; readonly.
- [x] Create `custom:fe-a11y-reviewer` (subagent): WCAG/a11y, focus, semantic HTML. tools: Read, Grep, Glob; readonly.
- [x] Create `custom:fe-ui-reviewer` (subagent): correctness, performance, component reuse, CSS hygiene. tools: Read, Grep, Glob; readonly.

### 2. Section modules

- [x] Create `custom:task-fe-analyze-identity` + `custom:task-fe-analyze-role` (resolve surface + new/rework, inspect Lovable, propose reuse approach).
- [x] Create `custom:task-fe-plan-identity` + `custom:task-fe-plan-role` (create + change spec, split + checklist, set `ready`).
- [x] Create `custom:task-fe-implement-identity` + `custom:task-fe-implement-role` (build in surface, tick all boxes, `implementing`→`implemented`, FIX mode).
- [x] Create `custom:fe-quality` (performance, WCAG/a11y, focus, no needless `!important`, semantic HTML button/aside/select).
- [x] Create `custom:task-fe-review-identity` + `custom:task-fe-review-role` (dual AI→human; `ai-approved` self-loop; REVIEW.md round-N scaffolding).

### 3. Handover modules (5)

- [x] Create `custom:fe-handover-analyze-plan` — to plan, **gated** (no `on`).
- [x] Create `custom:fe-handover-plan-implement` — to implement, on `ready`, **gated**.
- [x] Create `custom:fe-handover-implement-review` — to review, on `implemented`/`fixed`, **auto**.
- [x] Create `custom:fe-handover-review-implement` — to implement, on `fix-needed`, **gated** (cycle back-edge).
- [x] Create `custom:fe-handover-review-selfloop` — to review, on `ai-approved`, **gated** (self-loop to human pass).

### 4. Agents (4) — baseline order, subagents attached, command.install true

- [x] Create agent `custom:task-fe-analyze` (entry) with 2 subagents + analyze→plan handover.
- [x] Create agent `custom:task-fe-plan` (composes `template-copy`; NOT `authoring-spec-structure`) + plan→implement handover.
- [x] Create agent `custom:task-fe-implement` (reuse `minimal-diff` + `scope-guard` + `custom:fe-quality`) + implement→review handover.
- [x] Create agent `custom:task-fe-review` (compose `recorder-discipline` + `task-review/critique-style`; 2 subagents) + review→implement + review self-loop handovers.

### 5. Flow

- [x] Create flow `custom:frontend`: 4 agents; entry `custom:task-fe-analyze`; statuses incl. terminal `done`; edges 1–7 as specified; `install: ["activity", "custom:mcp-lovable"]`.

### 6. Install + verify

- [x] Install the flow; confirm 4 commands + 4 subagents + activity hooks + the Lovable MCP entry emit for BOTH Claude and Cursor. — installed: 4 .claude/commands + 4 .claude/agents + .mcp.json lovable entry + 4 .cursor/skills.

## Quality gates

- [x] Every new definition composes/validates (all referenced module/subagent/agent ids resolve).
- [x] No built-in modified; all new ids use `custom:`; locked tier untouched.
- [x] Flow validates: `entryAgents ⊆ agents`; `done` terminal; edges 5 + 6 gated (no auto cycle/self-loop); NO `review→done on ai-approved` edge (human gate intact).
- [x] `custom:mcp-lovable` config is `{type:"http", url:"https://mcp.lovable.dev"}` with no `${VAR}` secret.

## Verification

- [x] Smoke: `/task-fe-analyze` runs and fans out to its 2 subagents. — 4 skills available this session; subagents registered as agent types.
- [x] Guard: reviewer `ai-approved` self-loops to the human pass and cannot reach `done`; only `approved` reaches `done`.
- [x] No real UI feature built and no real Lovable calls during build.
