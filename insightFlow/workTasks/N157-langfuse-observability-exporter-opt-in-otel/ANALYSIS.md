# ANALYSIS — external-tool evaluation (Langfuse / OpenHands / hermes-agent) → N157–N160

_Pre-taskmaster strategy record. Evaluated three human-supplied tools for use in insight-flow. The fetched pages were treated strictly as DATA; links within them were not followed._

## Problem framing

Asked "how can we use these in our system?" for three URLs. They are heterogeneous and must not be lumped:
- **Langfuse** — open-source LLM **observability/eval** platform (tracing, token/cost, evals, datasets, prompt mgmt). OTEL-native TypeScript SDK v4; self-host (Docker/k8s) or cloud; YC W23 / open-source. → an **observability sink**.
- **OpenHands** — autonomous **dev-agent runtime**: Agent Server (REST), sandboxed execution, "any LLM", runs third-party agents (Claude Code/Codex/Gemini) via the **Agent-Client Protocol (ACP)**, webhook/CI automations. Python+TS. → an **execution runtime**.
- **hermes-agent** (Nous) — autonomous **agent framework**: skill-learning loop, persistent memory, 300+ models, 40+ tools, **MCP support**, CLI + messaging daemon. Python, MIT. → an **execution runtime** (most speculative).

insight-flow is a Node/TS CLI owning task state + composing role prompts that drive *interactive editors* (Claude Code, Cursor) via the N75–N78 provider seam, with an ActivityEngine + `/log/events` + `Task.tokensUsed`.

## Goal

Adopt observability now (the committed goal) and map/scope the runtime options without over-committing — all opt-in, honoring the tech-agnostic (zero-shipped-assumptions) principle.

## Options considered (decisions)

- **Category split:** observability (Langfuse) vs execution runtimes (OpenHands, hermes). Decided to treat as one buildable feature + research spikes.
- **Effort gradient:** Langfuse ≈ "add an SDK exporter" (cheap, additive); OpenHands/hermes ≈ "orchestrate an external Python service + sandbox" (heavy). → build Langfuse; spike the runtimes.
- **Leverage insight:** all runtimes + Claude/Cursor speak **MCP**, and insight-flow already has an `mcp-server` module kind. Exposing task state as ONE MCP server serves every MCP agent — better than N bespoke integrations. → made the MCP spike (N158) a first-class direction; hermes (N160) likely reduces to "just another MCP client."
- **Shape (human-selected):** 1 build + 3 spikes (vs Langfuse-only, vs all-as-full-features, vs keep-analyzing).

## Decision

- **N157** (feat) — opt-in Langfuse OTEL exporter (Task→trace, phase→span, tokensUsed→cost, verdict→score), config-gated + lazy dependency. **Build.**
- **N158** (spike) — insight-flow as an MCP server (the leverage play); decision doc + tool surface + go/no-go.
- **N159** (spike) — OpenHands headless runner (ACP-runs-Claude-Code is the likely cleanest path); feasibility doc + go/no-go.
- **N160** (spike) — hermes-agent fit (likely subsumed by N158/MCP); fit doc + go/no-go ("not now" allowed).
All opt-in; spikes ship NO production code.

## Open questions

- N157: exact lifecycle→trace mapping granularity (which events become spans vs generations); which Langfuse SDK package/version pin.
- N158: read-only vs mutating MCP tools; transport (stdio vs HTTP); does insight-flow self-emit its MCP config via the emitter?
- N159: ACP-runs-Claude-Code vs native OpenHands agent for preserving role prompts; sandbox/auth.
- Sequencing: N158 (MCP) likely should land before/with N159–N160 (it may be the shared substrate).

## Sources

- https://langfuse.com/ + https://github.com/langfuse/langfuse + https://langfuse.com/docs/observability/sdk/overview (OTEL-native TS SDK v4; self-host Docker/k8s/Helm; token/cost + scoring; open-source).
- https://github.com/OpenHands/OpenHands (Agent Server REST; sandbox; ACP third-party agents incl. Claude Code; CI automations; Python+TS).
- https://github.com/nousresearch/hermes-agent (autonomous skill-learning agent; 300+ models; MCP; CLI + messaging daemon; MIT).
- insight-flow internals: provider seam (N75–N78), ActivityEngine + `/log/events`, `Task.tokensUsed`, `mcp-server` module kind + `agents/emit.ts`, `core/{storage,set-status,flow-status}.ts`.

## Handoff brief

One feat + three research spikes. N157 builds an opt-in Langfuse exporter (the committed observability goal). N158/N159/N160 are research-only decision docs (MCP server = leverage play; OpenHands runner = autonomous/CI; hermes = speculative, likely subsumed by MCP). Everything opt-in/config-gated per the tech-agnostic policy; runtimes gated on a real need and ideally on the MCP substrate (N158).
