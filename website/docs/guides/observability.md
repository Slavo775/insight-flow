---
title: Set up observability (Langfuse)
sidebar_label: Observability
sidebar_position: 12
---

# Set up observability (Langfuse)

insight-flow can export each task's lifecycle to [Langfuse](https://langfuse.com)
as a trace, so you can inspect agent phases, durations, token usage, and review
verdicts alongside the rest of your LLM observability. It's **opt-in and
disabled by default** — non-users pay nothing.

> Langfuse is the only observability sink insight-flow ships. There is no
> standalone OpenTelemetry / OTLP integration: the exporter uses the classic
> `langfuse` Node SDK (construct → emit → flush), which fits insight-flow's
> short-lived lifecycle commands better than a long-running streaming provider.

## 1. Enable it

Turn the exporter on in `taskflow.config.json`:

```jsonc
// taskflow.config.json
{
  "observability": {
    "langfuse": {
      "enabled": true,
    },
  },
}
```

## 2. Provide credentials

Credentials resolve **config-first, then environment** — read from config if
present, otherwise from environment variables:

| Config key                         | Environment fallback                     |
| ---------------------------------- | ---------------------------------------- |
| `observability.langfuse.publicKey` | `LANGFUSE_PUBLIC_KEY`                    |
| `observability.langfuse.secretKey` | `LANGFUSE_SECRET_KEY`                    |
| `observability.langfuse.host`      | `LANGFUSE_HOST`, then `LANGFUSE_BASEURL` |

**Keep secrets in the environment, not in committed config.** Set the keys via
your shell or secret manager and leave the config block at just `enabled: true`:

```bash
export LANGFUSE_PUBLIC_KEY="pk-lf-…"
export LANGFUSE_SECRET_KEY="sk-lf-…"
export LANGFUSE_HOST="https://cloud.langfuse.com"   # optional; omit for the SDK default
```

If neither config nor environment supplies **both** a public and a secret key,
the exporter stays inert (it warns once and no-ops) — enabling it without
credentials never breaks a command.

## What gets traced

The exporter maps signal insight-flow already keeps on disk — it gathers no new
data:

- **Each task → one trace**, tagged with the task's tags and carrying metadata
  (type, priority, status, flow id, tokens used, total duration).
- **Each agent phase → a span:** `implement`, `review:<ai|human>`, `fix`, and
  post-implementation `change` phases, with their start/end times and per-phase
  metadata (files changed, verdict, status).
- **Each review verdict → a score** (`approved` → `1`, anything else → `0`).
- **Hook lifecycle events** that carry a task id are recorded as events on that
  task's trace.

Span and trace ids are deterministic, so re-exporting at each lifecycle boundary
**upserts** the same trace instead of duplicating it.

## When disabled or absent

With `observability.langfuse.enabled` unset or `false`, every entry point returns
immediately and the `langfuse` SDK is **never imported**. The package is an
optional peer dependency: if you enable the exporter but haven't installed
`langfuse`, it warns once (`npm i langfuse`) and no-ops rather than failing. Any
exporter error is caught and downgraded to a single warning — it can never break
a lifecycle command or the event endpoint.

## See also

- [Configuration → `observability.langfuse`](../configuration.md) — the full key
  reference and credential resolution rules.
- [CLI → Events & hooks](../cli/events-and-hooks.md) — the lifecycle events that
  feed the traces.
- [Concepts](../concepts/index.md)
- [Troubleshooting](./troubleshooting.md)
