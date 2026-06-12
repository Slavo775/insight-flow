# N92 — Heterogeneous modules — MCP/hook/skill contributions + testing pilot — Analysis

**Created:** 2026-06-11
**Author:** task-analyze

## Problem framing

The original modular-agent vision (N88 ANALYSIS) named integrations — jira, figma, chrome, testing — as the genuinely new, high-value module type: heterogeneous records carrying prompt text *plus* MCP config, hooks, and skills. Rounds 1–3 deliberately deferred this to prove the text model first. That's done (N90: JSON canonical, byte-exact, drift-guarded), so the schema can now grow non-text contribution kinds without destabilizing the role pipeline — the drift suite pins the 9 shipped roles while emission is added beside them.

## Goal

- Schema + emission for `mcp-server` / `hook` / `skill` contributions with per-kind merge rules, idempotent apply, project-root-resolved targets.
- One real pilot (`testing`) validated end-to-end in the playground.
- Zero movement in the 9 shipped role files.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Testing pilot, local-only (chosen) | Validates all machinery (hook + skill + prompt) with zero external dependencies; end-to-end provable in playground | No MCP-server contribution exercised by the pilot itself (covered by unit tests only) | M |
| B — Jira pilot | Exercises the MCP kind for real; matches the original wish-list | Cannot be validated end-to-end without credentials + live endpoint; turns a schema task into an integration-ops task | M–L |
| C — Schema only, no pilot | Smallest | Repeats the "design from imagination" failure N88 was built to avoid; merge rules unproven against real files | S |

## Decision

- Chosen option: **A** (analyzer recommendation, accepted in the human's go-ahead 2026-06-11). Jira and the wider catalogue follow once the emission machinery is proven; the MCP merge rule still ships now with unit-test coverage so the jira module later is data-only.

## Open questions

- [non-blocking] **Module shape**: single-contribution modules grouped as siblings (`testing/prompt`, `testing/hook`, `testing/skill` — keeps `composeAgent` and the ordered-list model untouched) vs one multi-contribution record (matches the "one module = one integration" mental model but complicates ordering semantics). Analyzer leans sibling-modules; implementer decides in step 1 and documents.
- [non-blocking] **Hook merge representation**: `.claude/settings.json` is JSON — "marked block" likely means a reserved key (e.g. hooks entries tagged `"taskflowManaged": true`) rather than comment markers. Implementer picks the cleanest replace-on-reapply mechanism JSON allows.
- [non-blocking] **Where the pilot agent lives**: playground-only composed def (preferred — keeps shipped registry clean) vs shipped-but-unreferenced. If playground-only defs require a registry affordance (loading defs from the project), that affordance may be the actual deliverable — keep it minimal.
- [non-blocking] **MCP conflict policy**: error on same-name-different-config is specced; confirm against real-world double-apply scenarios.

## Sources

None external — discussion was self-contained. Internal references (provenance: analyzer-discovered, read from repo 2026-06-11, trust: high):
- `workTasks/N88-agent-module-composer-spike/ANALYSIS.md` — Round 4 definition: "Extend the module schema beyond prompt … per-kind merge rules (MCP dedup by name, hook registration, skill files). Pilot with ONE real integration module (jira or testing) end-to-end."
- `workTasks/N90-…/REVIEW.md` — non-blocking #5 (exercise shared modules in the Round 4 pilot); drift-suite-as-backstop rationale.
- `packages/taskflow/src/agents/compose.ts`, `src/core/schema/index.ts`, `src/cli/commands/prompt-build.ts` — the v3 model this extends.

## Handoff brief

> Title: Heterogeneous modules — MCP/hook/skill contributions + testing pilot · Type: feat · Priority: medium · Tags: agents, composer, schema, integrations.
> Extend AgentModuleSchema with mcp-server/hook/skill contribution kinds and add an idempotent emission layer with per-kind merge rules (.mcp.json dedup by name, settings hooks via managed entries, skill files). Pilot one real `testing` module (prompt + hook + skill) end-to-end in the playground — no credentials needed; jira deferred. The 9 shipped role files stay byte-stable (drift suite untouched). Implement after N91.
