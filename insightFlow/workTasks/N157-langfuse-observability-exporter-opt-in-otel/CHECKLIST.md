# N157 — Langfuse observability exporter (opt-in OTEL) — Checklist

## Done criteria

- [ ] `observability.langfuse` config block on `TaskflowConfig` + Zod schema (default disabled)
- [ ] Exporter maps Task→trace, phase→span/generation, tokensUsed→cost, verdict→score
- [ ] Langfuse SDK is optional + lazy-imported; disabled = not loaded, zero behavior change
- [ ] Keys via config/env (never committed); exporter failures fail-open + warn (never block lifecycle)
- [ ] Wired from `/log/events` ingestion + lifecycle-end commands

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow lint` + `format:check` pass
- [ ] `pnpm --dir packages/taskflow test` passes (disabled-path unaffected)

## Verification

- [ ] Disabled default: no Langfuse import, existing tests green
- [ ] Enabled (manual, local/cloud Langfuse): a task lifecycle yields a trace with phase spans + cost + verdict score
