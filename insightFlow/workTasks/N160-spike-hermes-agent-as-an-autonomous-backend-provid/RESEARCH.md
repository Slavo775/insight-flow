# N160 — SPIKE decision doc: hermes-agent as an autonomous backend/provider

**Status:** research complete · **Recommendation: NOT NOW.** No bespoke hermes integration. If anyone wants it, hermes is just another MCP client of **N158** — nothing hermes-specific to build.

## Question

Does Nous Research **hermes-agent** (Python autonomous agent: skill-learning loop, persistent memory, 300+ models, 40+ tools, **MCP support**, CLI + messaging daemon for Telegram/Discord/Slack) fit insight-flow as (a) an alternative autonomous backend that runs insight-flow roles, or (b) a messaging front-end?

## Finding

**No first-class fit, and no reason to build one.** insight-flow's model is *task-state owner + role-prompt composer driving interactive editors* (the N75–N78 claude/cursor provider seam) plus an autonomous/CI executor option (OpenHands, N159). hermes is an autonomous assistant — neither an interactive editor nor a CI executor — so a `hermes` **provider** (like the claude/cursor seam) does not make sense: there's no editor lifecycle to hook, no `/log/events` emitter contract it satisfies out of the box.

The one real seam is **MCP**, which hermes already speaks. That collapses the whole question:

- **As a backend that "runs insight-flow roles":** redundant with OpenHands (N159), which already gives ACP-runs-Claude-Code and preserves our composed prompts. hermes would mean re-validating prompts against a different Python harness for no added capability.
- **As an MCP consumer of task state:** this is **entirely subsumed by N158**. If N158 ships, hermes (or anything) reads `get_current_task` / `next_step` / `show_spec` and calls `set_status` with zero hermes-specific code on our side.
- **As a messaging front-end (Telegram/Discord/Slack):** genuinely novel vs OpenHands, but it's a notifications/chat concern, not a lifecycle one — and overlaps the existing `notifications` config block. Not worth a hermes dependency; if desired later, do it as a generic notifications/webhook target, not a hermes coupling.

## Provider-fit judgment

A hermes provider is **not warranted**. The provider seam is for editors with a lifecycle; hermes isn't one. Cost/runtime also argues against: hermes is Python + a long-lived messaging daemon — heavy operational surface for a Node/TS project that ships zero baked-in backend assumptions.

## Go/no-go

**NOT NOW (well-reasoned, don't re-litigate).** hermes adds nothing that isn't already covered by (a) OpenHands for autonomous execution and (b) the N158 MCP server for task-state access — both of which hermes would consume generically anyway. Revisit only if a concrete "hermes as chat front-end" user need appears, and even then build it as a generic notifications/webhook integration, not a hermes-specific provider. No code, no dependency.

## Sources

- hermes-agent (Nous Research): autonomous skill-learning agent, persistent memory, 300+ models, 40+ tools, MCP support, CLI + messaging daemon, MIT. Per /task-analyze fetch of github.com/nousresearch/hermes-agent — treated as data.
- insight-flow internals: provider seam (N75–N78), `notifications` config block, and the proposed **N158** MCP server (the only realistic integration vector) + **N159** (OpenHands, which already covers autonomous execution).
