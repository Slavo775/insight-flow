# N157 — Langfuse observability exporter (opt-in OTEL)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-18

## Problem

- insight-flow tracks rich agent-run signal (lifecycle events via `/log/events`, `statusHistory`, review verdicts, `Task.tokensUsed`) but has no way to view it as **traces / cost / evals** over time or across projects. Langfuse (open-source LLM observability; OTEL-native TypeScript SDK v4; self-host via Docker/k8s or cloud) is the natural sink. This adds an **opt-in** exporter — insight-flow ships no LLM/host assumptions, so it must be config-gated and a no-op when disabled.

## Goal

1. When enabled, each Task is exported to Langfuse as a **trace**; each agent phase (implement/review/fix/change) as a **span/generation**; `tokensUsed` → token/cost; review verdicts → **scores**.
2. Gated behind a new optional `observability.langfuse` config block; **disabled = zero behavior change and the dependency is not loaded**.
3. Credentials come from env/config (never committed); the Langfuse SDK is an **optional/lazy** dependency so non-users don't pay for it.
4. Failures in the exporter never break the lifecycle (fail-open + a single warning, like N131/N152).

## Scope

### In scope

- `packages/taskflow/src/core/types.ts` — add `observability?: { langfuse?: { enabled: boolean; host?: string; publicKey?: string; secretKey?: string } }` to `TaskflowConfig`.
- A new module `packages/taskflow/src/agents/observability/langfuse.ts` (or `core/observability.ts`) — lazy-imports the Langfuse OTEL SDK only when enabled; maps lifecycle → traces/spans/scores; reads keys from config/env.
- Wire from the existing telemetry path: the `/log/events` ingestion (`dashboard/server/index.ts`) and/or the ActivityEngine, plus the lifecycle CLI commands (implement-end/review-end/etc.) — emit a Langfuse observation alongside the existing event. Reuse `Task.tokensUsed` + `statusHistory`.
- `package.json` — add the Langfuse SDK as an **optional** dependency (and lazy-`import()` so it's not required at load).
- README/CLAUDE.md — document the opt-in config (as user-supplied content, per the tech-agnostic policy).

### Out of scope

- No always-on / default-on behavior; no hard dependency for users who don't enable it.
- No Langfuse prompt-management / playground / dataset features this iteration — observability/tracing + cost + verdict-scores only.
- No change to the existing event/activity schema; this is an additional sink.
- The MCP/OpenHands/hermes spikes (N158–N160) are separate.

## Implementation plan

1. **Config.** Add the `observability.langfuse` block to `TaskflowConfig` + its Zod schema; default disabled.
2. **Lazy client.** In the new module, `if (!cfg.observability?.langfuse?.enabled) return noop;` then `await import("@langfuse/...")`/OTEL SDK; construct from host+keys (env fallback). Cache the client.
3. **Mapping.** Task → trace (id = task id, name = title, metadata = type/priority/flow); phase events/statusHistory → spans/generations (timestamps from event ts; tokens from `tokensUsed`); review-end verdict → a `score`. Define the minimal mapping that's useful without overreach.
4. **Wire-in.** Call the exporter from `/log/events` ingestion + the lifecycle-end commands, behind the enabled flag; wrap in try/catch → warn-and-continue (never block).
5. **Docs + a light test** (mapping unit test with the SDK mocked/disabled-path).

## Verification

- `pnpm --dir packages/taskflow run typecheck` + `lint` + `format:check` clean; `test` passes.
- Disabled (default): no Langfuse import loaded, zero behavior change, existing tests unaffected.
- Enabled (manual, against a local self-hosted Langfuse or cloud test project): running a task lifecycle produces a trace with phase spans, token/cost, and a verdict score.

## Notes

- Source: /task-analyze evaluation of langfuse.com (OTEL-native TS SDK v4; self-host Docker/k8s; token/cost + scoring). The committed goal of the round (observability).
- Mirror the opt-in pattern of `activityEngine`/`notifications`/`master`. Keep the dependency lazy. Independent of N158–N160.
