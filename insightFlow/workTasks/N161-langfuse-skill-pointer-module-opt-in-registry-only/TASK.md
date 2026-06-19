# N161 — Langfuse skill pointer module (opt-in, registry-only)

**Type:** feat
**Priority:** low
**Created:** 2026-06-19

## Problem

The official Langfuse AI skill (`github.com/langfuse/skills`) is a maintained, MIT-licensed **Claude Code plugin** — 10 files (SKILL.md + 9 `references/`) whose first principle is "always fetch the latest docs." insight-flow's `skill` module kind carries a single SKILL.md, so it cannot (and should not) fork that content: inlining a frozen copy would go stale and duplicate an upstream plugin. But users still want Langfuse code-instrumentation discoverable from inside an insight-flow flow, alongside the N157 lifecycle exporter.

## Goal

1. Ship a small **pointer** module (not a copy): a `skill` module that tells the agent how to install + use the official Langfuse plugin natively.
2. Cross-link insight-flow's own N157 lifecycle tracing so the two halves are clear.
3. Put it in the built-in registry so **anyone can add it to their flow**.
4. **Never install it by default** (not added to any shipped flow) — consistent with insight-flow's zero-shipped-assumptions policy.

## Scope

### In scope

- New `packages/taskflow/src/agents/modules/integrations/langfuse.json` — one `kind: "skill"` module (mirror `testing/skill`): `name: "langfuse-setup"`, `content` = a SKILL.md that:
  - points to the official plugin: `/plugin marketplace add langfuse/skills` → `/plugin install langfuse`, then invoke the `langfuse` skill for instrumentation / trace queries;
  - states it is a pointer (defers to the upstream MIT plugin for content, which self-updates);
  - cross-links insight-flow's N157 exporter (`observability.langfuse` config) — N157 traces the task *lifecycle*; the plugin instruments your app's *LLM calls*.
- Register it in `packages/taskflow/src/agents/compose.ts` `MODULE_REGISTRY` (spread, like `testingModules`).
- A test asserting the module is registered, is `kind: "skill"`, emits its SKILL.md via the artifact path, and is in NO shipped flow.
- A short README note under the Observability section.

### Out of scope

- **Do NOT add it to `project/default.json` or any shipped flow** — registry-only, opt-in.
- Do NOT fork/inline the Langfuse skill's content or its `references/`.
- No change to N157 behavior; no new dependency.
- No multi-file skill-module-kind extension (a separate future task if ever wanted).

## Implementation plan

1. **Author** `integrations/langfuse.json` with the single pointer skill module (frontmatter + body).
2. **Register** — import + spread it into `MODULE_REGISTRY` in `compose.ts`.
3. **Confirm opt-in** — it is absent from every shipped flow (default project unchanged).
4. **Test** — registry membership + kind + emitted artifact + not-in-default-flow.
5. **Docs** — README note.

## Verification

- `pnpm --dir packages/taskflow run typecheck` + `lint` + `format:check` + `test` clean.
- The module appears in `MODULE_REGISTRY` (and thus the dashboard module browser) but in NO default flow — installing the default flow does not write `.claude/skills/langfuse-setup/`.
- Adding the module to a flow + installing writes `.claude/skills/langfuse-setup/SKILL.md` with the pointer content.

## Notes

- Source: user request to make the Langfuse skill an insight-flow module. Investigation found it's a multi-file MIT plugin designed to self-update → pointer, not fork. Decision: registry-only, opt-in. Complements N157 (lifecycle exporter).
