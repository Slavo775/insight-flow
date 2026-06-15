# ANALYSIS — N117

Part of **Round 1 "Guide": flows become a real, correctable, visible task property (N116–N118)**.
The full strategist analysis (problem framing, options, decisions, open questions, sources) lives in
[`N116-*/ANALYSIS.md`](../N116-flow-binding-task-flowid-type-flow-map-taskmaster-/ANALYSIS.md).

Key decisions binding this task: a task is bound to a flow at creation via Task.flowId (shared
taskmaster picks by type→flow config map); a wrong pick is correctable only while status is `ready`
(locked after — no mid-lifecycle reconciliation); this round only GUIDES (surface the next agent via
N105's engine; human invokes) — DRIVE (pickers/prompts read the flow, agent stage-vs-utility kinds)
is the deferred Round 2.
