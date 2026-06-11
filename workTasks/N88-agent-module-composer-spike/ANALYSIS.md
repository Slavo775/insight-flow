# ANALYSIS — N88 Agent-module composer spike

## Problem framing

The user proposed a modular-agent architecture: agents composed from registered **modules** (safety, notification, action, handover, jira, figma, chrome, testing, …), assembled in a dashboard "agent creator," then `compose` → a prompt-builder emits the MD + skill + MCP servers + hooks. Composed agents stored as JSON. Later: custom states / ticket-transition editing in the dashboard.

The proposal is ambitious and valuable in direction, but as described it starts with the most expensive, riskiest pieces (dashboard UI + a compose-everything builder) while leaving the load-bearing design questions unanswered. A codebase audit also showed insight-flow already has the *bones* of this:

- The named modules map almost 1:1 onto existing `@AGENT_*.md` files pulled in via Claude Code `@includes`: safety → `AGENT_SECURITY.md` + `AGENT_ENFORCEMENT.md`; notification → `AGENT_NOTIFY.md`; handover → `AGENT_PROTOCOL.md`; events → `AGENT_EVENTS.md`. Every `TASK_*_ROLE.md` is already "core identity + `@`-included shared modules + role overrides + a user-extension seam (`agents.extend`)."
- The genuinely *new*, high-value part is **integration modules** (jira / figma / chrome / testing), which are heterogeneous (prompt fragment + MCP config + hooks + creds), not just text.

## Goal

Prove (or kill) the core hypothesis — **"agent = core + stacked modules" can reproduce a coherent prompt** — on the smallest slice that tests reuse, before investing in a registry, file-type emission (MCP/hook/skill), a UI, or role migration.

## Options considered

| Option | What | Pros | Cons / risk | Effort |
|---|---|---|---|---|
| Dashboard-first (original) | Build UI + full composer that emits MD/skill/MCP/hooks | Matches end vision | Builds hardest pieces first; schema designed from imagination; huge blast radius | XL |
| Lightweight `@include` cleanup | Extract duplicated role text into more shared partials | Cheap, immediate | **Audit showed ~5 lines of true duplication** — almost nothing to relieve | S (low yield) |
| **Composer spike (chosen)** | Schemas + 2 shared modules + 2 agent-defs that reuse them + minimal MD composer + diff vs hand-written roles | Tests the only thing that matters (reuse / dedup / ordering / override-merge); greenlight-or-kill; output is foundation not throwaway | Touches no shipped behavior; still requires schema design | M |
| One integration module wedge | Ship one real jira/testing module end-to-end first | Learns module shape from a real example | Doesn't validate the generic composition model; bigger surface (MCP+hooks+creds) | M–L |

## Decision

**Composer spike (N88).** Define `module` + `composed-agent` Zod schemas; author `minimal-diff` and `scope-guard` as the first two modules (the audit's two cross-role themes); express `task-implement` and `task-review-fix` as composed definitions that **both** reference those modules (so the spike actually exercises reuse + dedup + override-merge, which a single-role reproduction would not); add a text-only composer path to `prompt-build`; success = emitted MD **semantically** reproduces the two hand-written roles, validated in the playground.

Supporting decisions from the discussion:
- **Audience:** the user first, insight-flow consumers later → design schemas cleanly enough to *allow* custom modules, but build no registration/sandboxing UX now.
- **Source of truth:** JSON canonical (module registry + composed-agent defs), MD/skill/MCP/hooks become generated artifacts — accept the build-step + drift cost (precedent: `sync-role-templates.mjs`). This spike does **not** migrate shipped roles; hand-written roles stay canonical as the reproduction target.
- **States:** custom states / transition editing explicitly **deferred** (bigger than the composer — touches `types.ts`, Zod schemas, storage, every CLI command, the dashboard).
- **Audit result that reshaped the plan:** the originally-planned "lightweight `@include` cleanup" task was dropped — true verbatim cross-role duplication is ~5 lines (not worth `@include` indirection). The only meaningful shared content is conceptual themes that need *normalization* (a prompt rewrite with behavioral risk), so that work was folded into this spike + the later migrate round to avoid editing the same working prompts twice.

## Open questions

- Does concatenating core + shared `@includes` + modules + overrides produce a coherent prompt, or mush? (This is what the spike answers.)
- Module ordering/precedence + conflict handling (e.g. a module says "no subagents" while another spawns them) — does the 2-module slice surface this, or is it too small?
- Byte-for-byte vs semantic reproduction — where is exact reproduction impossible, and is that acceptable?
- How heterogeneous is a real `module` record once MCP/hook/skill contributions enter (round 2+)? The schema should not over-fit to text-only.
- Behavioral validation has no unit test — it needs playground/eval judgement. How rigorous a check is "good enough" to greenlight?

## Sources

None external — discussion was self-contained. Analyzer-discovered internal codebase references (provenance: read directly from the repo during analysis, trusted):
- `packages/taskflow/src/cli/commands/prompt-build.ts` — current `prompt-build` is an enforcement-block patcher + `agents.extend` injector, not a composer.
- `packages/taskflow/src/agents/agents.ts` — `applyAgentExtensions` (marked-block string injection) + `AGENT_ROLE_FILE_MAP`.
- The 9 role files (`TASKMASTER_ROLE.md`, `TASKMASTER_CHANGE_ROLE.md`, `TASK_IMPLEMENTER_ROLE.md`, `TASK_REVIEWER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`, `TASK_HUMAN_REVIEW_ROLE.md`, `TASK_INCIDENT_ROLE.md`, `TASK_REQUEST_CHANGES_ROLE.md`, `TASK_ANALYZER_ROLE.md`) — audited for duplication.
- `AGENT_ENFORCEMENT.md`, `AGENT_PROTOCOL.md`, `AGENT_EVENTS.md`, `AGENT_CONFIG.md` — the existing shared `@include` partials.

## Handoff brief

> Title: Agent-module composer spike · Type: feat · Priority: medium · Tags: agents, composer, schema.
> Prove the "agent = core + stacked modules" model on a 2-role vertical slice before any registry/UI/migration. Define `module` + `composed-agent` Zod schemas (core/schema/); author `minimal-diff` + `scope-guard` modules as data; express `task-implement` + `task-review-fix` as composed definitions that both reference those modules; add a text-only composer path to `prompt-build` that emits role MD. Success = emitted MD semantically reproduces the hand-written `TASK_IMPLEMENTER_ROLE.md` + `TASK_REVIEW_FIXER_ROLE.md` (playground-validated). No MCP/hook/skill emission, no registry, no UI, no state changes, no shipped-role migration.

## What's next (roadmap beyond N88)

Each round is **gated on the previous** — deliberately not pre-created as tasks, because their specs depend on what N88 learns (avoiding "design from imagination"). Spin them up in order once the prior round lands.

1. **Round 2 — Module registry + remaining text modules.** Only if N88 greenlights. Add `recorder-discipline` (+ any other text themes), build a real **module registry** cataloguing the existing `@AGENT_*.md` partials as modules, and generalize the composer to consume the registry. Still text-only.
2. **Round 3 — Migrate the 9 shipped roles to generated.** JSON definitions become canonical; MD is emitted by the composer; wire distribution (`sync-role-templates.mjs` + `insight-flow init` so `@includes` resolve in consumer projects). This is where the boilerplate relief actually lands. Highest behavioral risk — gate on a green N88 + Round 2.
3. **Round 4 — Heterogeneous (integration) modules.** Extend the `module` schema beyond `prompt` to declare MCP-server, hook, and skill contributions; teach the composer to emit those file types with per-kind merge rules (MCP dedup by name, hook registration, skill files). Pilot with ONE real integration module (jira *or* testing) end-to-end.
4. **Round 5 — Dashboard agent-creator UI.** A thin editor over the composed-agent JSON the CLI already consumes; `compose` button calls the same composer. Built last, on a proven model — cheapest step, not the first.
5. **Round 6 (separate track) — Custom states / transition editing.** Explicitly deferred throughout; re-scope as its own analysis when the agent-composer line is stable, since it touches `types.ts`, schemas, storage, every CLI command, and the dashboard.

**Through-line:** N88's modules → Round 2's registered modules → Round 3's migration inputs → Round 4's heterogeneous extension → Round 5's UI surface. Each round's output is the next round's foundation.
