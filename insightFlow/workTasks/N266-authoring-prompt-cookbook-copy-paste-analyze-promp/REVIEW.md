# N266 — Authoring prompt cookbook — copy-paste analyze prompts for flow/agent/module — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-10-19
**PR:** (no PR yet) — branch `feat/N266-authoring-prompt-cookbook` @ `6b59d3c`
**Verdict:** fix-needed

## Summary

Docs-only change. It adds `website/docs/authoring/prompt-templates.md` (Prompt cookbook) and links it from the authoring overview and walkthrough step 1. It also moves `agents-and-subagents.md` from sidebar position 3 to 4. Structure, sidebar order, links and the build are all fine, and every done criterion is present. Risk is low, but there is one blocker: the flow template and the flow example give the **finish** edge a handover mode (`auto|gated`). The analyst's model does not have that, and if a user follows it, the result is a broken handover. This page exists to make first-pass flows better, so it must not teach a wrong pattern.

## Checklist verification

- [x] New page with front-matter (`title`, `sidebar_label`, `sidebar_position: 3`) — pass
- [x] Intro table maps fields to intent → goal → design → reuse → impact → MCP + both opt-ins — pass
- [x] Balance statement (intent + goal + constraints, no JSON) linking the reuse-first rule — pass
- [x] Module: blank template + generic example — pass
- [x] Agent: blank template + generic example — pass
- [ ] Flow: blank template with explicit handover block + generic example — **fail** (the handover block is there, but the finish line is wrong; see Blocker 1)
- [x] Copy-paste tips (4 lines) — pass
- [x] Multi-line labelled blocks in ```text fences; note that the block pastes after `/task-authoring-analyze` — pass
- [x] Examples are generic / neutral — pass
- [x] `authoring/index.md` links to the new page — pass (link only, no prose rewritten)
- [x] `walkthrough.md` step 1 links to the new page — pass (link only)
- [x] `sidebar_position` order is Overview 1 → Walkthrough 2 → Prompt cookbook 3 → Agents & subagents 4, no collision — pass
- [x] Docusaurus build passes with no broken-link or MDX warnings — pass
- [x] No regressions to other authoring pages — pass

## Blockers

1. **The finish edge gets a handover mode.** `website/docs/authoring/prompt-templates.md:139` (`Finish: on <status> → done (auto|gated)`) and `:157` (`Finish: on checked → done (gated) — when: a person approves the draft`).
   - **Why:** In the analyst's model (`.claude/commands/task-authoring-analyze.md`, "Authoring conventions"), the terminator is just an edge whose `to` is a terminal status. It has no handover. The built-in flow's finish edge also has none (`packages/taskflow/src/agents/project/authoring.json:22`). `flowHandoversByAgent` (`packages/taskflow/src/agents/flow-install.ts:44`) turns every edge that has a `handover` into a handover to `e.to`. So a `(gated)` finish produces a "hand over to `done`" instruction, and there is no agent with that name. The example also teaches the human gate in the wrong place.
   - **Fix:** Template: `- Finish: on <status> → done (or a finish agent)`. Example: put the human approval on a real gated handover. For example, let check-agent end with `checked`, add `on checked → approve-agent (gated) — when: a person approves the draft` if a third agent fits, or keep it to two agents and write `- Finish: on checked → done`. Then put "a person approves before done" under `Constraints:` and let the analyst design where the gate goes.

## Non-blocking

1. `prompt-templates.md:26` — the `Intent:` row lists "a flow, an agent, or a module". The analyst's step 1, `index.md` and `walkthrough.md` also list **a chain of flows**. Add "or a chain of flows" so the wording stays the same everywhere. The chain note under the flow example already covers how.
2. `prompt-templates.md:14-15` — "To write the JSON yourself over the composer MCP, see the guides …". The three guides show hand-written JSON files in `insightFlow/{modules,agents,projects}/`, not the MCP. Reword it, for example: "To write the JSON definitions yourself (as files, or over the [Composer MCP](../composer-mcp/index.md)), see …".
3. `prompt-templates.md:76` — "reuse or extend it if it fits; don't change the built-in one". "Extend" is unclear for a built-in. Use the same wording as the flow example: "reuse it as-is, or make a custom variant if it needs changes."
4. `prompt-templates.md:60,62,76,94,95,97,133` — the page tells users to wrap the block in double quotes, but the blocks also contain double quotes (`"none"`, `"none known"`, `"quality gates"`). Nothing breaks, because slash-command arguments are not shell-parsed, but it looks wrong to copy. Use single quotes, or no quotes, inside the blocks.

## Security & edge cases

None. This is a docs-only change with no code, no secrets, and no external input.

## Notes

- The branch is stacked on `feat/N267-flow-chains`, because N266's tracker files exist only there. Target the PR at that branch, or rebase onto `main` after PR #174 merges.
- The current docs version (`lastVersion: "current"`) is the one the site serves, so the frozen `2.0` snapshot does not need this page.
- Independent pass: the `review-correctness` subagent raised the same five items. I checked the blocker against `authoring.json` and `flow-install.ts`, and checked non-blocking 2 against the three guides.
