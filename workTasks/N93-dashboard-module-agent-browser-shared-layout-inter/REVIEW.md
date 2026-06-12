# N93 — Dashboard module & agent browser — shared layout + interactive composition maps — Review

## Request Changes

**Requested by:** Human (Project Owner)
**Date:** 2026-06-11

Human's exact comment:

> okay but click to module its so annoying can we create a modal with information about module in agent and also if we have md so text in md also about all information about section also please the small description will be fine to each agent and module also add it into json registry

### Changes requested

1. **Refinement (UX)** — Agent composition map: clicking a module node must NOT navigate away ("click to module its so annoying"). Open a **modal with the module's information** directly on the agent page instead. The modal shows everything the module detail shows for that module (kind-specific panels — all information about section content included).
2. **Improvement (rendering)** — Where module content is markdown ("if we have md so text in md"), render it as formatted markdown rather than plain preformatted text (module section bodies, skill SKILL.md content; `react-markdown` is already a dependency).
3. **Addition (registry + UI)** — Add a **small `description` field to each agent and each module in the JSON registry** (schema + all `modules/*.json`, `modules/roles/*.json`, `modules/integrations/*.json`, `composed/*.json`), and surface it in the UI (sidebar/detail/modal headers). Must not change the generated role MD (drift suite stays green — the composer ignores `description`).

### Notes

- Round 1 change requests after manual testing of the N93 implementation (PR #69).
- A link to the full module page can remain available from inside the modal — the complaint is about the forced navigation, not the page's existence.
- `/task-implement` picks this up in change mode (`changes-requested`).


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-11
**Verdict:** fix-needed

### Summary

Manual testing of the R1 changes (agent map module modal). The human clicked an **include-module node** (screenshot: the `@AGENT_ENFORCEMENT.md` node in the composition map) and wants it to open the modal with the referenced markdown file's content rendered. Human's exact comment:

> reference as this [screenshot: @AGENT_ENFORCEMENT.md node] should also open the modal and show the md file in preview mode like formatted i mean

### Blockers

1. **Include-module nodes must open the modal with the referenced MD rendered.** Clicking an include node (e.g. `@AGENT_ENFORCEMENT.md`) in the agent composition map should open the same module info modal, and the modal (and module detail page) should show the **content of the referenced `.md` file rendered as formatted markdown** ("preview mode"), not just the bare `@ref` line. Implies a server endpoint that reads the include target — restricted to refs registered in `MODULE_REGISTRY` (no arbitrary file reads).

### Suggestions (non-blocking)

None this round.

### Notes

- `/task-review-fix` picks this up.


---

## Fix — Round 2 blocker resolved

**By:** task-review-fix · **Date:** 2026-06-11

- **Include preview** ✅ — new `GET /api/include-doc?ref=…`, strictly whitelisted to refs registered as include modules in `MODULE_REGISTRY` (traversal attempts and unregistered `.md` names return 404 — live-verified). Resolution order: project root, then `config.rolesDir` (consumer projects). The include panels (shared by the module page **and** the agent-map modal) now show the `@ref` line plus the referenced file rendered as formatted markdown, with loading and file-not-found states.
- **Clickable reference nodes** ✅ — the facet node from the screenshot (`@AGENT_ENFORCEMENT.md` on the module map) now opens the module info modal; include module nodes in the agent map already opened it and now show the rendered preview inside.
- **Gates:** build ✅ · 112/112 ✅ · lint at baseline · live check: `AGENT_PROTOCOL.md` served + rendered path verified in playground; files absent from a project degrade to "File not found in this project".


---

## Round 3 — AI Re-review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-12
**Verdict:** approved

### Summary

Re-review of the R2 fix (include nodes → modal with rendered MD preview, commit `373107b`). The blocker is resolved as specified and the security posture re-checked: `/api/include-doc` is whitelisted to refs registered as include modules (traversal `../package.json` and unregistered names were live-tested → 404), resolution is project-root-then-rolesDir, and the UI degrades gracefully when a partial is absent from a project. Facet/reference nodes open the modal; the include panels are shared by page and modal so both render the preview. Verdict: **approved** — full task (browser + R1 changes + R2 fix) ready for the human gate on PR #69.

### Checklist verification

- R2 blocker (include modal + formatted preview): fixed and live-verified (`AGENT_PROTOCOL.md` served + rendered in playground).
- Original checklist + R1 changes: unchanged since the prior rounds; suite green (122/122 on the current stack tip, which includes N93).

### Blockers

None — approved.

### Non-blocking

1. The whitelist is built per-request from `MODULE_REGISTRY` — trivial cost at this scale; if the registry ever becomes project-extensible, hoist it once at server start.

### Security & edge cases

- Whitelist-before-path-resolution confirmed in code order; no user-controlled path segments reach `readFileSync`.

### Notes

- Note for the human: the playground's `.claude/roles/` is missing a couple of partials (removed in earlier test cleanup), so "File not found in this project" appears there for those — correct behavior, not a regression.
