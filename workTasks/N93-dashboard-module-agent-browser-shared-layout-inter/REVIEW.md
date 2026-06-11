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
