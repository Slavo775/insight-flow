# N161 — Langfuse skill pointer module (opt-in, registry-only) — Checklist

## Done criteria

- [x] `integrations/langfuse.json` exists: one `kind: "skill"` module, `name: "langfuse-setup"`
- [x] SKILL.md content points to the official plugin (`/plugin marketplace add langfuse/skills` → `/plugin install langfuse`) and is a pointer, not a fork
- [x] Content cross-links N157 (`observability.langfuse`) and distinguishes lifecycle-tracing vs LLM-call instrumentation
- [x] Registered in `compose.ts` `MODULE_REGISTRY`
- [x] NOT added to `project/default.json` or any shipped flow (opt-in)

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes
- [x] `pnpm --dir packages/taskflow lint` + `format:check` pass (lint 0 errors)
- [x] `pnpm --dir packages/taskflow test` passes — 269 pass

## Verification

- [x] Test: module in registry, kind `skill`, emits `.claude/skills/langfuse-setup/SKILL.md`, absent from default flow
- [x] Default-flow install does NOT write `langfuse-setup` skill (test applies all composed agents → no skill file); adding to a flow + install DOES (test asserts emit)
