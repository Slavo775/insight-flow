# N142 — handover module kind — schema + compose render + locked canonical set

**Type:** feat
**Priority:** high
**Created:** 2026-06-17

## Problem

- Agent-to-agent "handover" exists only implicitly today: a project `FlowEdge {from,to,on}` (`core/flow-status.ts`) is a *diagram* edge, and the "human go-ahead" handoff (analyze→taskmaster) is pure role-prompt convention with no data behind it. There is no first-class, agent-owned declaration of "when I finish, hand to agent X" and no notion of whether that handover is automatic or needs explicit human approval.
- The model decided in /task-analyze is **agent-centric + descriptive**: each agent declares its own handovers; the agent wins over the flow diagram and free-picks which to follow. This task lays the data + prompt foundation the other three (N143 editors, N144 diagram, N145 prompt wiring) build on.

## Goal

1. A new `handover` agent-module kind in the Zod schema, mirroring the existing `status-transition` kind (N128).
2. `compose.ts` renders a `handover` module into a "## Handover" prompt section (parallel to `transitionSection`), with auto-vs-gated language and the resolved next slash-command.
3. A canonical handover set shipped as **LOCKED** modules (not user-overridable), wired onto the relevant composed agents.
4. Shipped `*_ROLE.md` stay byte-identical unless a canonical handover is intentionally added — in which case they are regenerated via `prompt-build --compose --apply` and the compose test still passes.

## Scope

### In scope

- `packages/taskflow/src/core/schema/index.ts` — add a `handover` member to the `AgentModuleSchema` discriminated union (after the `status-transition` member, ~line 356): `{ kind: "handover", to: string(min 1), on?: string(min 1), mode: z.enum(["auto","gated"]).default("gated"), label?: string }`.
- `packages/taskflow/src/agents/compose.ts` — add a `handoverSection(m)` helper mirroring `transitionSection` (line 227); map it in `composeAgent`/`resolveModules` so a `handover` module renders as a `## Handover` section and is otherwise skipped by MD text composition like `status-transition` is. Use `deriveCommandName(m.to)` (from `core/schema/index.ts`) for the slash-command name.
- Canonical handover module JSON under `packages/taskflow/src/agents/modules/` (new file, e.g. `modules/handovers.json`), referenced in `MODULE_REGISTRY` (compose.ts) and added to the LOCKED id set in `agents/user-registry.ts` (the locked tier mergedModuleRegistry honors).
- Add the canonical handover module ids to the relevant `agents/composed/*.json` agent definitions (task-implement, task-review-fix, task-request-changes → task-git `auto`; task-analyze → taskmaster `gated`; task-review → task-human-review / task-review-fix `gated`).
- Regenerate `*_ROLE.md` via `insight-flow prompt-build --compose --apply` IF any canonical agent gains a handover module; commit both JSON + MD.

### Out of scope

- No UI/editor changes (that is N143).
- No FlowEditor/FlowMap diagram changes (N144).
- No changes to the in-session chaining *prompt language* beyond the minimal section text (the full wording + cycle/silent-user guidance is N145).
- Do **not** make the flow prescriptive; do not change `agents/transitions.ts` / `cli/commands/advance.ts` status-write behavior.

## Implementation plan

1. **Schema: add the `handover` kind.** In `AgentModuleSchema` (`core/schema/index.ts`), append a `z.object({ ...agentModuleBase, kind: z.literal("handover"), to, on?, mode, label? })` member. Mirror the `status-transition` member's `agentModuleBase` spread and comment style. `mode` defaults to `"gated"`.
2. **Compose render.** In `compose.ts`, add `handoverSection(m)` returning a `section`-kind module with `heading: "## Handover"` and a body that names the target (`deriveCommandName(m.to)`), the trigger (`on`), and mode behavior (auto = "invoke directly"; gated = "stop for explicit human go-ahead"). In `composeAgent`, extend the `.map(...)` that converts `status-transition`→`transitionSection` to also convert `handover`→`handoverSection`.
3. **Canonical locked modules.** Create `agents/modules/handovers.json` with the canonical handover modules (stable ids, `source: "builtin"`/locked). Add them to `MODULE_REGISTRY`'s `indexById([...])` import list and to the locked-id set in `user-registry.ts`.
4. **Wire onto agents.** Add the new module ids to the relevant `agents/composed/*.json` in declared order (end-of-turn, after the role body).
5. **Regenerate role MD.** Run `pnpm --dir packages/taskflow build` then `insight-flow prompt-build --compose --apply`; inspect the diff — only intentionally-handover'd agents should change.
6. **Tests.** Extend the compose test (`packages/taskflow/test/compose.test.mjs`) to assert a `handover` module renders the `## Handover` section with correct auto/gated text and command name; add a schema test asserting `mode` defaults to `"gated"`.

## Verification

- `pnpm --dir packages/taskflow run build` and `npx tsc --noEmit` pass.
- `pnpm --dir packages/taskflow test` passes, including the new handover compose + schema assertions and the existing byte-identical role-MD check.
- `node -e` / a unit test confirms `AgentModuleSchema.parse({kind:"handover",to:"task-git"})` yields `mode:"gated"`.
- `git diff` on `*_ROLE.md` shows only the agents intentionally given a canonical handover.

## Notes

- Mirror the locked, behavior-as-data pattern of `status-transition` (N128) exactly — same `agentModuleBase`, same "contributes nothing to artifacts" treatment, same locked-tier handling.
- Reference: `compose.ts:227` (`transitionSection`), `core/schema/index.ts:356` (status-transition member) / `:384` (`deriveCommandName`), `agents/user-registry.ts` (locked tier), `agents/transitions.ts` (sibling consumer pattern).
- Foundation for **N143** (editor CRUD), **N144** (diagram honesty), **N145** (prompt wiring). Sibling of N128/N131/N133.
