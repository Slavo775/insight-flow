# N157 — Langfuse observability exporter (opt-in OTEL) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-19
**PR:** (no PR yet)
**Verdict:** APPROVED

## Summary

Adds an opt-in Langfuse exporter that re-maps insight-flow's existing lifecycle data (no new signal) to traces/spans/scores. Clean separation: a pure `buildLangfusePayload` (Task→trace, phases→spans, verdicts→scores, deterministic ids for upsert) behind a single lazy SDK adapter. Disabled is the default and a genuine no-op — verified the SDK is never imported when off (264 tests green with `langfuse` installed). Risk: **low** — additive, gated, fail-open; the only files in the lifecycle hot path gain one guarded call each. The enabled path was smoke-tested against the **real** `langfuse@3.38.20` SDK (adapter API shape confirmed; network failure swallowed = fail-open holds).

## Checklist verification

- [x] `observability.langfuse` config block on `TaskflowConfig` + Zod schema (default disabled) — pass (`types.ts`; `schema/index.ts` `LangfuseConfigSchema`/`ObservabilityConfigSchema`, `enabled` defaults false)
- [x] Exporter maps Task→trace, phase→span, tokensUsed→metadata, verdict→score — pass (`core/observability/langfuse.ts` `buildLangfusePayload`; unit-tested)
- [x] SDK optional + lazy-imported; disabled = not loaded, zero behavior change — pass (optional peer dep; non-literal dynamic `import("langfuse")`; gate returns before import — re-ran suite with the package present to confirm no eager load)
- [x] Keys via config/env (never committed); failures fail-open + warn — pass (`resolveLangfuseCreds` config→env; `warnOnce`; `track` swallows errors; verified no throw on unreachable host)
- [x] Wired from `/log/events` ingestion + lifecycle-end commands — pass (`server/index.ts` `recordHookEvent`; `implement/review/fix/change/push` + `cli.ts` `flushObservability`)
- [x] typecheck / lint / format:check / test — pass (264 tests; lint 0 errors)
- [x] Disabled default verified — pass
- [~] Enabled (manual, live Langfuse) — partially: validated against the real SDK with an unreachable host (adapter calls + fail-open). End-to-end against a live Langfuse instance still pending the owner.

## Blockers

None.

## Non-blocking

1. **SDK is noisy on flush failure.** When enabled with an unreachable/misconfigured host, `langfuse-core` logs its own retry stack to stderr on every flush (our code stays fail-open, but the output is loud). Worth a README line: "a misconfigured host produces SDK retry logs; fix `host`/keys to silence." Optional: pass a quieter log level to the SDK constructor if it supports one.
2. **`recordHookEvent` chattiness.** Fires per non-duplicate `/log/events` carrying a `taskId`; relies on the SDK's background batching. Fine for opt-in, but high-traffic projects may want a server-side flush on shutdown (see #3).
3. **No explicit server flush on shutdown.** The long-running server never calls `flushObservability()`, so events in-flight at process exit may be lost (best-effort). Acceptable for observability; a SIGTERM/SIGINT flush hook would tighten it.
4. **`warnOnce` is a single global latch.** After the first warning (e.g. missing package) it suppresses *distinct* later warnings (e.g. a real export failure) in the same process. Minor; could key the latch by message if it ever masks something useful.
5. **"Cost" is surfaced as token metadata, not derived cost.** insight-flow stores a single `tokensUsed` with no model or input/output split, so true per-model cost can't be computed. Honest given the data; a future task could attach a model name to enable Langfuse cost.

## Security & edge cases

- **Credentials**: resolved config-first then env; never logged (`warnOnce` messages carry no secrets). Docs steer users to env vars. Good.
- **Data egress**: `recordHookEvent` forwards the raw hook `payload` to an external service as observation metadata. This is opt-in and user-controlled, but it is the one place arbitrary event content leaves the machine — the README should call this out so users don't unknowingly ship sensitive hook payloads to a third party.
- **Fail-open**: malformed `observability` block → treated as disabled (defensive `safeParse`); missing keys → warn + skip; unreachable host → caught. Verified end-to-end. The lifecycle is never blocked.
- **Determinism**: span/score ids are deterministic, so re-export at each boundary upserts one trace rather than duplicating — confirmed by test.

## Notes

- `pnpm i` pulled `langfuse@3.38.20` into the **monorepo** `node_modules`/lockfile via pnpm's default `auto-install-peers`. This is a dev-only artifact: the published `package.json` declares it as an **optional peer**, so `npm install insight-flow` consumers do not get it (the "non-users pay nothing" guarantee holds). The lockfile change is expected and safe to commit.
- tsup keeps the dynamic import external (non-literal specifier), so the published bundle never contains langfuse code.
- Public surface gained the observability exports in `index.ts` (superset-tolerant surface test still green).
