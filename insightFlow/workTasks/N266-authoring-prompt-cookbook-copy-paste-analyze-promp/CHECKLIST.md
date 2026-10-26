# N266 — Authoring prompt cookbook — copy-paste analyze prompts for flow/agent/module — Checklist

## Done criteria

- [x] New page `website/docs/authoring/prompt-templates.md` created with front-matter (`title`, `sidebar_label`, `sidebar_position`)
- [x] Intro section: "what a good prompt includes" checklist maps each field to the analyzer method (intent → goal → design → reuse → impact → MCP) + both opt-ins (activity engine, harness)
- [x] Intro states the balance: give intent + goal + constraints, do NOT dictate JSON (links the reuse-first rule)
- [x] **Module** section: blank multi-line template + one generic worked example
- [x] **Agent** section: blank multi-line template + one generic worked example
- [x] **Flow** section: blank multi-line template WITH an explicit handover/edge block (`on X → agent (auto|gated)`) + one generic worked example
- [x] Copy-paste tips section (3–4 lines)
- [x] Prompt format is multi-line labelled blocks inside ```text fences (not one-liners); note that it pastes after `/task-authoring-analyze`
- [x] Examples are generic / neutral (no specific product domain)
- [x] `authoring/index.md` links to the new page
- [x] `authoring/walkthrough.md` (step 1) links to the new page
- [x] `sidebar_position` set so the page slots after the walkthrough; no collision with `agents-and-subagents.md` (bump it if needed)

## Quality gates

- [x] Docusaurus build passes (`pnpm --dir website build` or the project's docs build) — no broken-link / MDX errors
- [x] No regressions to other authoring pages (sidebar order still correct)

## Verification

- [x] Open the built docs (or dev server): the "Prompt cookbook" page appears in the authoring sidebar in the right order
- [x] Each of module/agent/flow shows a blank template AND a worked example; flow shows the handover block
- [x] The links from index + walkthrough resolve to the new page
