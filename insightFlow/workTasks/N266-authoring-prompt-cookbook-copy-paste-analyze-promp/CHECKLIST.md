# N266 — Authoring prompt cookbook — copy-paste analyze prompts for flow/agent/module — Checklist

## Done criteria

- [ ] New page `website/docs/authoring/prompt-templates.md` created with front-matter (`title`, `sidebar_label`, `sidebar_position`)
- [ ] Intro section: "what a good prompt includes" checklist maps each field to the analyzer method (intent → goal → design → reuse → impact → MCP) + both opt-ins (activity engine, harness)
- [ ] Intro states the balance: give intent + goal + constraints, do NOT dictate JSON (links the reuse-first rule)
- [ ] **Module** section: blank multi-line template + one generic worked example
- [ ] **Agent** section: blank multi-line template + one generic worked example
- [ ] **Flow** section: blank multi-line template WITH an explicit handover/edge block (`on X → agent (auto|gated)`) + one generic worked example
- [ ] Copy-paste tips section (3–4 lines)
- [ ] Prompt format is multi-line labelled blocks inside ```text fences (not one-liners); note that it pastes after `/task-authoring-analyze`
- [ ] Examples are generic / neutral (no specific product domain)
- [ ] `authoring/index.md` links to the new page
- [ ] `authoring/walkthrough.md` (step 1) links to the new page
- [ ] `sidebar_position` set so the page slots after the walkthrough; no collision with `agents-and-subagents.md` (bump it if needed)

## Quality gates

- [ ] Docusaurus build passes (`pnpm --dir website build` or the project's docs build) — no broken-link / MDX errors
- [ ] No regressions to other authoring pages (sidebar order still correct)

## Verification

- [ ] Open the built docs (or dev server): the "Prompt cookbook" page appears in the authoring sidebar in the right order
- [ ] Each of module/agent/flow shows a blank template AND a worked example; flow shows the handover block
- [ ] The links from index + walkthrough resolve to the new page
