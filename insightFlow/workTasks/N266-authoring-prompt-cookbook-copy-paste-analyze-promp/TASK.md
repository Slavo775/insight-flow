# N266 — Authoring prompt cookbook — copy-paste analyze prompts for flow/agent/module

**Type:** feat
**Priority:** medium
**Created:** 2026-07-30

## Problem

The composer authoring flow (`/task-authoring-analyze`) is powerful, but new
users don't know **how to phrase a good request**. The current docs
(`website/docs/authoring/index.md`, `walkthrough.md`) explain the flow well but
only show **one-line** analyze prompts. There is no copy-paste **prompt
cookbook** — a fill-in-the-blank template + worked example for defining a
**flow**, an **agent**, and a **module**. Without it, users under-specify the
request, so the analyzer has to ask more questions and the resulting flows are
weaker than they could be. A good template pre-answers what the analyzer's
method needs, so users get better flows on the first pass.

## Goal

1. Add one new docs page — a "Prompt cookbook" — with copy-paste templates.
2. For each of **module, agent, flow (+ handover)**: a blank fill-in template
   **and** one generic worked example.
3. Map the template fields to the analyzer's fixed method
   (**intent → goal → design → reuse → impact → MCP discovery**) plus the two
   opt-ins it always asks (**activity engine**, **harness** Claude/Cursor/both),
   so users know *why* each field matters.
4. Make it discoverable: add to the authoring sidebar and link from the
   authoring index + walkthrough.

## Scope

### In scope

- New file **`website/docs/authoring/prompt-templates.md`** with front-matter
  (`title`, `sidebar_label`, `sidebar_position`) — place it after
  `walkthrough.md` (position 2) and before `agents-and-subagents.md`; renumber
  the following pages' `sidebar_position` if they collide.
- Page structure:
  1. **Intro — "what a good prompt includes"**: a short checklist that maps each
     template field to the analyzer method + the two opt-ins. State the balance:
     give **intent + goal + constraints**, do **not** dictate the JSON — let the
     analyzer challenge and dedup (link
     [reuse-first rule](./agents-and-subagents.md#the-reuse-first-rule)).
  2. **Module** — blank multi-line template + one generic example.
  3. **Agent** — blank multi-line template + one generic example.
  4. **Flow (+ handover)** — blank multi-line template with a handover/edge block
     (each edge = `on <status> → <next agent>`, `auto`/`gated`) + one generic
     example.
  5. **Copy-paste tips** — 3–4 lines (paste the block straight after
     `/task-authoring-analyze "..."`; state intent, not JSON; answer the two
     opt-ins; expect the analyzer to push back).
- **Prompt format = multi-line labelled blocks** (not one-liners): labelled
  skeleton `Intent:` / `Goal:` / `Design:` / `Handovers:` (flow only) /
  `Reuse:` / `Opt-ins:` — each shown inside a ```text fence so it copies clean,
  with a note that it pastes after the slash command.
- **Examples = generic / neutral** (abstract "do X" placeholders, no specific
  product domain).
- Wire-up: link the new page from `website/docs/authoring/index.md` and
  `website/docs/authoring/walkthrough.md` (a "see the prompt cookbook" pointer).

### Out of scope

- No change to the authoring flow itself, its agents, or the composer MCP.
- No new CLI command or in-product prompt generator (docs only).
- Do **not** rewrite the existing index/walkthrough prose — only add links.
- No screenshots.

## Implementation plan

1. **Read the analyzer method** — skim `.claude/commands/task-authoring-analyze.md`
   (and `authoring/index.md` "clear design method" + walkthrough step 1) to quote
   the method steps + the two opt-ins accurately in the intro checklist.
2. **Create the page** — `website/docs/authoring/prompt-templates.md` with
   front-matter and the 5 sections above.
3. **Write the templates** — for module / agent / flow, a ```text block with the
   labelled fields. Keep flow's `Handovers:` block explicit (`on X → agent (auto|gated)`).
4. **Write one generic example each** — filled versions of the same block,
   neutral domain, showing realistic intent/goal/handovers/opt-ins.
5. **Sidebar order** — set `sidebar_position` so the page slots after the
   walkthrough; bump `agents-and-subagents.md` (and any later authoring page) if
   its position now collides.
6. **Cross-link** — add a short pointer to the cookbook from `authoring/index.md`
   and from `walkthrough.md` step 1.
7. **Build the docs** — run the Docusaurus build to confirm no broken links /
   front-matter errors.

## Verification

- `website/docs/authoring/prompt-templates.md` exists with all 5 sections; each
  of module/agent/flow has a blank template **and** a worked example; flow has an
  explicit handover block.
- The intro checklist names every analyzer-method step + both opt-ins.
- Sidebar shows the new page in the right order; no `sidebar_position` collision.
- `authoring/index.md` and `walkthrough.md` link to the new page.
- Docusaurus build passes (no broken-link or MDX errors).

## Notes

- Analyzer method + opt-ins come from the authoring docs already in the repo
  (`authoring/index.md`, `walkthrough.md`) — keep wording consistent with them.
- Related: the authoring flow shipped earlier; `guides/custom-flow|agent|module`
  cover the **direct/MCP** path (JSON/bash) — this page is the **prompt** path, so
  link but don't duplicate them.
- Docs-only → normal flow (`/task-implement`), not the composer authoring flow.
