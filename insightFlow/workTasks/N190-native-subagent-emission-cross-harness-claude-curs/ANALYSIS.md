# N190 — Analysis (pre-taskmaster strategist trail)

> Shared decision trail for the subagents/handovers initiative (**N189–N192**). The
> other tasks reference this document.

## Problem framing

The user wanted "subagents" so a big agent could be split into smaller ones. Analysis untangled two conflated ideas and a four-cardinality handover model.

**Two meanings of "subagent":**
1. Pipeline decomposition (split a big agent into staged agents) — **already exists** as flows + edges + handovers.
2. Native delegation (a running agent spawns specialized helpers in their own context) — **the real gap**. insight-flow emits skills/commands/hooks/mcp-servers but **not** `.claude/agents` / `.cursor/agents`. (It already *observes* subagents via `subagent-start`/`subagent-done` events — it just can't *produce* them.)

**Cross-harness, not Claude-only.** Initial premise (subagents = Claude-only) was corrected by the user with the Cursor docs: Cursor has native subagents (`.cursor/agents/*.md`, and reads `.claude/agents/` + `.codex/agents/` for compat). So a subagent is a **cross-harness primitive** — fits insight-flow's agnostic model like skills. Frontmatter dialects differ: Claude `tools[]` allowlist; Cursor `readonly` + `is_background`; model namespaces differ (`inherit` portable).

**The four handover cardinalities** (1→1, 1→N, N→1, N→N), against the single-task-token reality (a task has one status, at one producing agent; a handover moves that single token):
- **1→1** and **1→N branch (pick 1-of-N)** = token handover. Both exist; the only gap is *structured intent* for the branch pick → **N189**.
- **1→N fan-out (all)** and **N→1 join** = **subagents**: a parent spawns N subagents (fan-out) and the Task tool **waits for all and resumes** (the join is automatic — there is no "last agent who hands over"; the parent is the join point).
- **N→N** = orchestrator that fans out (B) then hands the token onward (A) — composition, not a new primitive.
- A true cross-task N→1 join (independent task-token agents converging) would require subtasks + completion state — i.e. turning insight-flow into a **workflow engine**. **Rejected** to preserve its identity as a tracker that *gates/advises*, not *executes*.

**Orchestrator?** Not as a central controller — insight-flow's flow definition already *is* the orchestrator-as-data (central view, decentralized enactment: "the agent's handovers win"). The wanted thing is "an agent that fans out and rejoins" = a normal agent using subagents. "Worker hands back to orchestrator" = subagent return, which is automatic (a subagent's only exit is returning to its caller).

## Goal

Give insight-flow the ability to **author and emit native subagents cross-harness**, as the foundation for the fan-out/rejoin orchestrator pattern — without becoming a workflow engine.

## Options considered & decisions

- **Subagent modeling:** new `subagent` **module kind** (A) vs `as:"subagent"` self-install (B) vs per-editor passthrough. → **Decision: module kind (A)**, so an orchestrator (N191) can declare/bundle a set; composable + reference-safe through existing install/uninstall.
- **Editor scope:** Claude-only vs cross-harness. → **Cross-harness** (Cursor has subagents); emit per-editor with the correct frontmatter dialect (honor `target`/editor like skills).
- **Restriction/model metadata:** minimal vs full vs passthrough. → **Vendor-neutral fields the emitter translates**: `tools[]` (Claude), `readonly`/`is_background` (Cursor), `model` default `inherit`. (Field-level dialect specifics verified at implementation.)
- **Sequencing:** **N189 (handover intent, independent)** · **N190 (subagent emission, foundation)** → **N191 (orchestrator)** → **N192 (showcase)**.
- **Explicitly out:** flow-level joins / dependency-gating / subtasks / central runtime orchestrator-controller (workflow-engine direction).

## Open questions

- Exact Cursor frontmatter semantics (`readonly` mapping, model ids) — confirm against the live docs at implementation (the dialect table came from a summarizer).
- Whether a single `.claude/agents/` file could serve both harnesses (Cursor reads it) vs per-editor emission — default to per-editor for correct dialect.
- Dashboard form ergonomics for the neutral-vs-dialect fields.

## Sources

- This session's analysis thread (handover model grounded in `core/flow-status.ts`, `agents/compose.ts` `handoverSection`, `agents/emit.ts`, `agents/flow-install.ts`).
- Cursor subagents docs (user-provided): `.cursor/agents/*.md`, frontmatter `name`/`description`/`model`/`readonly`/`is_background`, parallel Task-tool execution.
- Related: N138 (agent-as-command install), N174 (reference-safe install targets), N188 (composer MCP — would gain subagent authoring).

## Handoff brief

Built into this folder's TASK.md / CHECKLIST.md: new `subagent` module kind; cross-harness emit (`.claude/agents` + `.cursor/agents`) via `applySubagents`; reference-safe install/uninstall; composer + MCP + dashboard surfacing. Foundation for N191/N192. Out: orchestrator prompt, built-in rewiring, joins/engine.
