# N269 — Task detail: chain bar, chain picker, gated "Continue to next flow"

**Type:** feat
**Priority:** medium
**Created:** 2026-10-19

## Problem

- After N267 a task can carry a `chainId` and move between flows, but the dashboard shows only the current flow. The user cannot see where the task is in its chain, cannot bind a chain from the UI, and the gated handover between flows can only be approved in chat.

## Goal

1. **Chain bar** on `TaskDetailPage`: `Prepare ✓ → Implement ● → Deploy beta` — flows of the task's chain in order, past ones ticked (from `statusHistory[].flowId`), current highlighted, future dimmed.
2. **Chain picker** on task detail, next to the existing flow picker: bind/clear a chain while the task is `ready` (same lock rule as the flow picker; N117).
3. **"Continue to next flow"** button: visible only when the task sits at a terminal of its current flow with ≥1 outgoing chain link. One link → button; several → a small menu listing `to` + `when`. Click → `POST /api/work-tasks/:id/chain-advance` → task moves (N267 core fn) → show the entry command to run next.

## Scope

### In scope

- `dashboard/server/index.ts` — `POST /api/work-tasks/:id/chain` (body `{ chain: id | null }`, reuse `setTaskChain` from N267 like `setTaskFlow` at `index.ts:1346`); `POST /api/work-tasks/:id/chain-advance` (body `{ to?: flowId }`, reuse the N267 core advance fn). Both emit the SSE change so the page refreshes.
- `dashboard/client/api.ts` — `setTaskChain`, `chainAdvance`, `listChains` (if not from N268).
- `dashboard/client/TaskDetailPage.tsx` — chain bar component (`components/ChainBar.tsx`, new), chain picker (reuse the flow picker's `Select`), Continue button/menu (reuse `Button` + `Modal`/menu). After advance, show a toast/inline note: "Moved to <flow>. Run `/<entry-command>` to continue."
- `dashboard/client/flow-columns.ts` / Kanban: no change — columns stay those of the current flow (decided in N267 analysis).
- Tests: endpoint tests for the two new routes (follow `set-flow` endpoint tests); a render test for `ChainBar` deriving past/current/future from history.

### Out of scope

- Running the next agent from the dashboard (the human still invokes the slash command).
- Auto-advancing `auto` links from the UI (the CLI hint + agent handle `auto`; the button is the human gate).
- Chains page/editor — N268.

## Implementation plan

1. **Server endpoints** — `/chain` and `/chain-advance` under `/api/work-tasks/:id/`, thin wrappers over N267 core fns; same error mapping as the flow endpoint (`locked` → 409, `unknown` → 400).
2. **API client** — two fns + types.
3. **ChainBar** — pure: `(chain, task) → steps[]` with `state: done | current | next`; derive `done` from `statusHistory` entries carrying `flowId`; render with existing `Chip`/`StatusPill`.
4. **Picker** — reuse the flow picker block; disabled unless `status === "ready"`; `none` clears.
5. **Continue** — compute candidates with `chainLinksFrom` (N267 `core/chain.ts`, exported via barrel); render button or menu; call `chainAdvance`; refresh via SSE; show next command.
6. **Tests** — as listed.

## Verification

- Playground: task with `chainId` → chain bar shows correct done/current/next.
- `ready` task: picker binds/clears chain; non-ready: picker disabled with the same hint as the flow picker.
- Walk a chained task to `merged` → Continue button appears; click → task is `ready` in the next flow, bar advances, note shows `/<entry-command>`.
- Two links from the same terminal → menu with `when` text; picking one advances to that flow.
- Task without chain → no bar, no button; page identical to today.

## Notes

- Depends on N267 (core fns, `chainId`, history `flowId`) and N268 (`listChains` client, optional).
- Keep the N258–N265 facelift look (`theme.ts`, `ui.tsx`).
- Related: N117 (flow lock), N118 (next-step guide on task detail — the Continue note should sit in the same guide area), N265 (status transitions pane).
