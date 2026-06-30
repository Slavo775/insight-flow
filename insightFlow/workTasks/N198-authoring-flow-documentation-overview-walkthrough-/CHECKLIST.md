# N198 — Authoring flow documentation — overview, walkthrough, agents & subagents reference — Checklist

## Done criteria

- [ ] `website/docs/authoring/` section created + `_category_.json` + sidebar placement
- [ ] **Overview** page — purpose, what the user gets, flow-vs-dashboard/MCP, links to `concepts/`
- [ ] **Walkthrough** page — install → analyze → lifecycle (gated analyze-first → install-after-approval) → **worked example: author a custom module**
- [ ] **Agents & subagents reference** — 8-agent table (purpose · does · doesn't) + 4×3 subagent matrix + reuse-first policy
- [ ] Reference points to the **dashboard composition map** + the **`describe` tool** for live detail (no prompt transcription)
- [ ] Cross-links to/from `composer-mcp/`, `subagents/`, `concepts/`
- [ ] Tables verified against the shipped registry (agent/subagent names, lifecycle, reuse rule)

## Quality gates

- [ ] `pnpm --dir website build` passes (no broken internal links)
- [ ] Sidebar renders the new section in a sensible position

## Verification

- [ ] A reader can go from "what is this" → "how do I use it" → "what does each agent do" without leaving the section
- [ ] No duplication of `concepts/` content (linked, not re-explained)
