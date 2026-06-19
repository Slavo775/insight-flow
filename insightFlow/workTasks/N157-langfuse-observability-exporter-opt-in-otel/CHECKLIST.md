# N157 — Langfuse observability exporter (opt-in OTEL) — Checklist

## Done criteria

- [x] `observability.langfuse` config block on `TaskflowConfig` + Zod schema (default disabled)
- [x] Exporter maps Task→trace, phase→span/generation, tokensUsed→cost, verdict→score
- [x] Langfuse SDK is optional + lazy-imported; disabled = not loaded, zero behavior change
- [x] Keys via config/env (never committed); exporter failures fail-open + warn (never block lifecycle)
- [x] Wired from `/log/events` ingestion + lifecycle-end commands

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes
- [x] `pnpm --dir packages/taskflow lint` + `format:check` pass
- [x] `pnpm --dir packages/taskflow test` passes (disabled-path unaffected) — 264 pass

## Verification

- [x] Disabled default: no Langfuse import, existing tests green (264 pass; disabled-path unit test asserts no-op + clean flush)
- [ ] Enabled (manual, local/cloud Langfuse): a task lifecycle yields a trace with phase spans + cost + verdict score — NOT run here (requires a live Langfuse + `npm i langfuse`; manual step for the owner)
