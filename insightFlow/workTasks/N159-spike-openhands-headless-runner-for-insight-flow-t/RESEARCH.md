# N159 — SPIKE decision doc: OpenHands headless runner for insight-flow tasks

**Status:** research complete · **Recommendation: GO (thin, behind N158), as an opt-in `feat` — not now as core.** Build only when a real "run this task autonomously / in CI" need lands; ship nothing baked-in.

## Question

Can insight-flow drive OpenHands to execute a task autonomously (e.g. `/task-implement Nxx`) in a sandbox/CI, handing OpenHands the composed role prompt + task spec, and getting status back via `/log/events`?

## Finding

Feasible, with two viable surfaces. OpenHands exposes an **Agent Server (REST)** on one host/port and supports third-party agents (Claude Code / Codex / Gemini) via the **Agent-Client Protocol (ACP)**; it also has a **headless CLI** (`openhands --headless -t "<prompt>"`, JSON output) and a Software Agent SDK (Python + REST) that spins ephemeral Docker/k8s workspaces. So insight-flow does not need to embed OpenHands — it shells out to / calls a service it does not own.

The clean shape: insight-flow stays the **task-state owner + prompt composer**; OpenHands is a **dumb executor**.

## Integration design (PoC shape)

1. **Handoff (insight-flow → OpenHands).** Reuse `composeAgent()` to render the role prompt and read the task spec (TASK.md/CHECKLIST.md). Feed it as the run goal via either:
   - **Headless CLI** — `openhands --headless -t "<composed prompt>"` in a sandboxed checkout; simplest PoC, no long-lived server. Or
   - **Agent Server REST** — POST a run to a running server; better for CI/parallel and for **ACP-runs-Claude-Code** (preserves our exact role prompts + the Claude toolset we already target).
2. **Status callback (OpenHands → insight-flow).** OpenHands run lifecycle → POST to the existing **`/log/events`** ingestion endpoint (the same path editors use). No new server surface needed on our side; ActivityEngine + `Task.tokensUsed` already consume it. Status transitions still go through the **validated** `setStatus` path (via an `insight-flow` CLI call inside the sandbox, or a thin MCP `set_status` once **N158** ships).
3. **Sandbox/auth.** OpenHands owns the sandbox (Docker/k8s, ephemeral). LLM keys + repo creds live in OpenHands' env, never in insight-flow. insight-flow passes only prompt + spec + a callback URL/token.

## ACP-runs-Claude-Code vs native OpenHands agent

**Prefer ACP-runs-Claude-Code.** It preserves the composed role prompts and the Claude-targeted behavior we already invest in; the native OpenHands agent would mean re-validating our prompts against a different harness. Native agent is the fallback only if ACP setup proves heavy.

## Relationship to the round

- **Depends on N158 (MCP).** The cleanest status/handoff channel is the MCP server (`set_status`, `next_step`, `show_spec`) rather than shelling the CLI inside the sandbox. N158 should land first; this then reduces to "point OpenHands at our MCP server + feed the composed prompt."
- Orthogonal to N157 (Langfuse) — though an OpenHands run is exactly the kind of autonomous run worth tracing there.

## Go/no-go

**GO, but deferred + opt-in.** Technically sound and low-coupling (we orchestrate a service we don't own; zero baked-in dependency, honoring the tech-agnostic posture). Not worth building until there's a concrete autonomous/CI need. When built: opt-in `feat`, behind config, ideally on the N158 MCP substrate. Minimal PoC = headless CLI + `/log/events` callback; production path = Agent Server REST + ACP-runs-Claude-Code + MCP. Effort: medium (most of it is sandbox/auth/CI plumbing owned by OpenHands, not us).

## Sources

- OpenHands (Agent Server REST on one host/port; ACP third-party agents incl. Claude Code; headless `openhands --headless -t` with JSON output; Software Agent SDK = Python+REST, ephemeral Docker/k8s workspaces; sandboxed execution). Per /task-analyze WebSearch of github.com/OpenHands/OpenHands — treated as data.
- insight-flow internals: `agents/compose.ts` (`composeAgent`), `/log/events` ingestion + ActivityEngine, `Task.tokensUsed`, `core/set-status.ts` (`setStatus`), and the proposed **N158** MCP server.
