# N230 — Frontend Flow (custom composer flow) — Review

**Reviewer:** Composer Reviewer (ai)
**Date:** 2026-07-13
**PR:** (no PR yet)
**Verdict:** approved (AI pass — no blockers)

## Summary

The custom flow `custom:frontend` and all 25 authored definitions (1 mcp-server, 4 subagents,
9 sections, 5 handovers, 4 agents, 1 flow) were reviewed by the four per-kind reviewer
subagents (module / agent / flow / relationship). Everything is schema-valid, every referenced
id resolves, and no built-in or locked-tier definition was modified. All new ids use `custom:`.
Risk: low (nothing installed yet). No blockers, no non-blockers.

## Checklist verification

- [x] `custom:mcp-lovable` — pass (kind mcp-server, name "lovable", config exactly `{type:"http", url:"https://mcp.lovable.dev"}`, NO `${VAR}` / NO `inputs` — OAuth, correct)
- [x] 4 subagents — pass (readonly, sensible tools, clear FE-specific content)
- [x] 9 sections — pass (analyze-role cites the Lovable project id + both subagents; plan-role sets `ready` + create/change; implement-role sets implementing→implemented + FIX mode + tick all boxes; fe-quality covers perf/WCAG/focus/semantic HTML/CSS/reuse; review-role: AI→ai-approved self-loop, human→approved/fix-needed, approved only via human)
- [x] 5 handovers — pass (analyze→plan gated; plan→implement gated; implement→review auto; review→implement gated back-edge; review→review gated self-loop)
- [x] 4 agents — pass (baseline order; handovers before `actions`; plan has `template-copy`, NOT `authoring-spec-structure`; implement reuses `minimal-diff`+`scope-guard`; review reuses `recorder-discipline`+`task-review/critique-style`)
- [x] Flow — pass (7 edges; `done` terminal; entryAgents ⊆ agents; install `["activity","custom:mcp-lovable"]`)
- [x] Human gate — pass (**no `review→done on ai-approved` edge**; `done` reachable only via `approved`, set only by the human pass)
- [x] No built-in / locked tier modified — pass

## Blockers

None.

## Non-blocking

None. (Optional: the spec allowed a public `auth.CLIENT_ID` on `custom:mcp-lovable` for Cursor;
it was omitted, which is fine — OAuth works without it.)

## Security & edge cases

- Lovable MCP is remote OAuth; the first tool call opens a browser login. No secret stored. The
  analyzer/implementer role prompts treat Lovable/MCP output as data (prompt-injection safe).
- All 4 subagents are read-only; only the implementer writes code.

## Notes

- AI pass approved with no blockers. Next: `ai-approved` → loops back for the human review pass;
  install is gated and comes only after human approval.
- Belongs on the `insight-flow-flows` branch (PR #148), alongside the Release Manager flow.


---

## Round 2 — Human review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-13
**Verdict:** approved

### Summary

Human decision: "Approve → install." All 25 definitions accepted with no changes. Proceed to
the gated install step.

### Blockers

None.

### Notes

- Approved for install (Composer Installer): 4 commands + 4 subagents + activity hooks + the
  Lovable MCP entry, for Claude and Cursor.

