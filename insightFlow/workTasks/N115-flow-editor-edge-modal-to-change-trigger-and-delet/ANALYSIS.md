# ANALYSIS — N115

Part of the round **N113–N115: flow editor — full authoring**. The full strategist analysis
(problem framing, options considered, decisions, open questions, sources) lives in
[`N113-*/ANALYSIS.md`](../N113-flow-editor-new-flow-picks-its-own-agent-set-no-de/ANALYSIS.md).

Key decisions binding this task: new flows pick their agent set up front (schema unchanged,
`agents.min(1)` holds); edit-mode interactions are click→popover (nodes) and click→modal (edges);
add is bundled with remove (shared draft-carries-agents plumbing); a custom state left unused by a
removal is harmless (N112 in-use guard covers cleanup — no extra guard logic).
