# N79 — Analysis (pre-taskmaster strategist audit trail)

_Produced by `/task-analyze` on 2026-06-02, before handoff to `/taskmaster`._

## Problem framing

insight-flow browser/OS notifications work for **Claude** (including “Permission required”) and for **Cursor** on **Done** (agent turn end), but Cursor never reliably fires “Permission required.” The human confirmed: notification stack is fine; only the permission trigger is missing/broken on Cursor.

Root cause is architectural asymmetry, not broken Web Notifications:

- **Done (Cursor works):** `insight-flow-stop.sh` POSTs `/api/agent-done` → dashboard `sock.on('agent-done')` → `fireDesktopNotif()` — **bypasses** `/log/events` / EventStore.
- **Permission (Cursor broken):** Only `insight-flow-approval.sh` on `beforeShellExecution` when command matches a tiny pattern list (`git push`, `rm -rf`, …) → `hook approval-required` → `/log/events` → status `→ awaiting-permission` → WebSocket `status` → `fireStatusDesktopNotif`. No direct HTTP shortcut; no hook on Cursor’s common approval surfaces (MCP, network, Smart Mode, most shell).
- **Claude (works):** Real `PermissionRequest` → `lifecycle-permission.sh` → `log-event approval-required` + `notify` on every approval ask.

Cursor has **no observe-only `PermissionRequest` event** (documented in N75/N77). 100% Claude parity without Cursor product changes is impossible; we can get much closer with Option C.

## Goal

1. Cursor permission prompts reliably fire the same browser notification label as Claude: `<project>: Permission required` (plus existing sound path).
2. Coverage extends beyond sensitive-shell `beforeShellExecution` to the hooks Cursor actually uses when pausing the agent (`preToolUse`, `beforeMCPExecution`, conservative matchers).
3. Permission notifications do not depend solely on EventStore status transitions (mirror Done’s reliability).
4. Claude behavior unchanged; existing tests stay green.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| **A — Parity shortcut** | Add `POST /api/agent-permission` + curl from approval gate (mirrors `/api/agent-done`); fixes reliability when gate fires | Does not fire if gate never runs | Small |
| **B — Hook coverage** | Wire `preToolUse` / `beforeMCPExecution` with `ask` + `approval-required` for real Cursor pause points | Matcher policy; may over-prompt; still no native PermissionRequest | Medium |
| **C — A + B (chosen)** | Reliable toast when we detect approval + broader triggers | Matcher tuning + docs on residual gaps | Medium |

## Decision

- **Chosen: Option C** — implement `/api/agent-permission` (or equivalent socket event) **and** extend Cursor hooks for `preToolUse` / `beforeMCPExecution` (plus keep/refine `beforeShellExecution` gate).
- **Rationale:** Human validated Done works on Cursor (proves browser permission + dashboard path). Permission fails because trigger + pipeline differ from Done; A fixes pipeline, B fixes trigger coverage.
- **Out of scope:** Cursor cloud-agent lifecycle gaps; observe-only permission events Cursor does not expose.

## Open questions

- `[non-blocking]` Exact matcher set for `preToolUse` / `beforeMCPExecution` — start conservative (same family as shell gate: destructive/network/MCP patterns); consider `taskflow.config.json` later.
- `[non-blocking]` Should `statusFromEvent` also accept raw `PermissionRequest` on `/log/events` for consistency with Claude POST shape (`type: PermissionRequest`)?
- `[non-blocking]` Re-run `insight-flow init --editor cursor --force` vs document manual hook regen for consumers with stale `.cursor/hooks/`.
- `[non-blocking]` N69 stateful `awaiting-permission` (abandoned) — only revisit if status churn still eats notifications after Option A.

## Sources

- Repo: `packages/taskflow/src/cursor-hooks.ts`, `.cursor/hooks/insight-flow-{approval,stop}.sh`, `packages/taskflow/src/server/dashboard.ts` (`fireDesktopNotif`, `fireStatusDesktopNotif`), `packages/taskflow/src/server/index.ts` (`/api/agent-done`), `packages/taskflow/src/activity-hook.ts` (`lifecycle-permission.sh`), `packages/taskflow/src/server/event-stream.ts`.
- Prior analysis: N75 `ANALYSIS.md` (Phase-2 approval design), N77 TASK.md (Cursor hooks shipped).
- Discussion: human-supplied — Claude permission works, Cursor Done works, Cursor Permission required does not.

## Handoff brief

> **Title:** Cursor permission-required notifications parity with Claude Done shortcut plus hook coverage · **Type:** fix · **Priority:** medium · **Tags:** cursor, notifications, hooks
>
> Fix Cursor “Permission required” browser notifications: add a Done-style direct endpoint/socket path from the approval gate, and extend Cursor hooks (`preToolUse`, `beforeMCPExecution`, refined `beforeShellExecution`) to emit `approval-required` + notify when the agent needs approval. Claude unchanged. Document residual gaps (no native PermissionRequest).
