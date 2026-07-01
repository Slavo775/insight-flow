# N198 — Authoring flow documentation — overview, walkthrough, agents & subagents reference — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-30
**PR:** (no PR yet — working tree on `feat/authoring-flow`)
**Verdict:** approved

## Summary

New `website/docs/authoring/` section (Overview · Walkthrough · Agents &
subagents reference) documenting the `composer-authoring` flow. Additive,
docs-only, low risk. Drift-resistant by design (tables + live links, no prompt
transcription). Tables verified against the shipped registry.

## Checklist verification

- [x] `authoring/` section + `_category_.json` + sidebar placement (autogen, position 5.6) — pass
- [x] Overview page (purpose, what you get, flow-vs-dashboard/MCP, lifecycle, install) — pass
- [x] Walkthrough page + worked example (author a `custom:coding-standards` module end-to-end) — pass
- [x] Agents & subagents reference — 8-agent table (purpose · does · doesn't) + 4×3 matrix + reuse-first rule — pass
- [x] Points to dashboard composition map + `describe` for live detail; no prompt transcription — pass
- [x] Cross-links to `composer-mcp/`, `subagents/`, `concepts/` + pointer added from `composer-mcp/index.md` — pass
- [x] Tables match the registry — pass (8 commands `task-authoring-*` ↔ 8 agents; all 12 subagent names present)
- [x] `pnpm --dir website build` passes, no broken links — pass

## Blockers

None.

## Non-blocking

- Bonus: the stale broad-subagent reference in `composer-mcp/index.md` was
  corrected to the per-kind set during this work.

## Security & edge cases

None — documentation only.

## Notes

Documents the N194–N197 initiative. Drift-resistance (tables + `describe`/dashboard
links) is the core constraint and is honored. website build ✅.
