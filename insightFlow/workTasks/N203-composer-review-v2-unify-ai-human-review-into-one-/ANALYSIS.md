# N203 — Composer review v2 — unify AI + human review into one dual-mode agent + consolidated requirements — Analysis

**Created:** 2026-07-07
**Author:** task-analyze

## Problem framing

Two separate concerns in the composer (authoring) flow:

1. **Two review agents.** `authoring-review` (AI) and `authoring-human-review` (human) are separate agents/commands. The human wants one agent that derives whether this run is an AI review or a human-feedback pass — consistent with N202, which merged the implementer + fixer into one dual-mode agent.
2. **Requirements are implicit and partly scattered.** The rules a new definition must satisfy (custom-only, reuse-first, locked-tier, secrets externalized, minimal, no name collision) mostly already live in `COMPOSER_RULES` (the `composer-authoring-conventions` module), but two are missing and some are *restated* inside individual role identities — duplication the human explicitly wants removed. The reviewer also does not check them as an explicit list.

Root cause, not symptom: the review lifecycle has two agents where one dual-mode agent fits, and the authoring rules lack a single canonical "requirements" home that the reviewer verifies against.

## Goal

1. One dual-mode `authoring-review` agent: AI-review mode and human-feedback mode, selected by intent (human feedback present → human mode; else → AI mode). Remove the separate `authoring-human-review`.
2. AI mode reviews the new module/agent/flow/relationship critically (via the 4 reviewer subagents) against an explicit requirements list, then writes/updates REVIEW.md (from `REVIEW.md.tpl`). Human mode records the human's feedback and creates/updates REVIEW.md — behaving like today's `task-review` + `task-human-review`.
3. A single canonical requirements home in the **existing** `composer-authoring-conventions` module (no new module), covering all 8 requirements, composed once and reaching analyst, taskmaster, implementer, and reviewer.
4. Remove requirement restatements that duplicate the module across the role identities.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Consolidate into existing conventions module; unify review into one dual-mode agent | No duplication (single existing home); consistent with N202; smallest surface | Must carefully split "requirements" from "how-to" wording; AI→human sequencing within one agent needs care | Medium |
| B — New separate `authoring-requirements` module + unify review | Requirements read as a crisp standalone checklist | Creates a second shared module overlapping `composer-authoring-conventions` — the exact duplication the human wants gone | Medium-High |
| C — Keep two review agents, add requirements only | Smaller change | Doesn't deliver the "one review agent" ask | Low |

## Decision

- **Chosen option: A.**
- Rationale: The requirements are ~80% already written in `COMPOSER_RULES` and that module is already composed into every authoring agent. A new module (B) would reintroduce duplication. Unifying the two review agents mirrors the just-shipped N202 pattern (implementer builds + fixes) so the flow and the mental model stay consistent. Scope is the composer flow only; the base `task-review` / `task-human-review` are the model to imitate, left unchanged.

Confirmed with the human (via clarifying questions):
- **Requirements home:** consolidate into the existing `composer-authoring-conventions` module.
- **Intent rule:** by human-feedback presence (feedback → human mode; none → AI mode).
- **Scope:** composer flow only.

## The 8 requirements (single canonical list to encode)

1. **Minimal module** — each authored definition is as small as possible (one concern per module). *(new)*
2. **Valid MCP JSON** — `mcp-server` modules use the correct config/inputs shape.
3. **Externalized secrets** — secrets go in `.insight-flow/secrets.local.json` via a `${VAR}` placeholder + `inputs: secret`, never inline in the module.
4. **No name collision** — a new `custom:` id/name must not duplicate or shadow an existing definition. *(new — make explicit)*
5. **Reuse-first** — reuse existing modules/agents/flows before authoring new.
6. **Guarded small adjustments** — edit a current definition in place only if it's your own `custom:` def, referenced nowhere, and behaviour-preserving (no hidden consequences).
7. **Read-only modules are off-limits** — never change locked/built-in read-only modules.
8. **Custom-only** — create `custom:` definitions; never edit shipped originals in place.

Coverage today: #2, #3, #5, #6, #7, #8 already in `COMPOSER_RULES`; **#1 and #4 are missing**; #6 wording to be sharpened.

## Open questions

- `[non-blocking]` AI review and human review are **sequential** (both happen), unlike N202's mutually-exclusive build/fix. The tracker reuses the `approved` status for "AI-approved awaiting human" and "human-approved awaiting test." The unified agent must not fire the `→ test` handover until the **human** pass approves; add a light guard so an empty human pass can't be mistaken for an AI review (a fresh AI review must exist before human mode). Implementer to settle the exact edges.
- `[non-blocking]` Compose-test agent-count floor for the authoring flow drops 7 → 6 after removing `authoring-human-review`.
- `[non-blocking]` Consumer projects that already installed the composer flow keep a stale `task-authoring-human-review` command artifact; a flow re-install reconciles it (out of scope, as with N202's `task-authoring-fix`).

## Sources

- None — discussion was self-contained (grounded only in this repo's source: `composer-conventions.ts`, `composed/authoring.json`, `project/authoring.json`, `modules/roles/authoring.json`, `templates/task/REVIEW.md.tpl`).

## Handoff brief

Title: *Composer review v2 — unify AI + human review into one dual-mode agent + consolidated requirements*. Type: feat. Priority: high. Tags: authoring, composer. Scope: In the composer (authoring) flow, merge `authoring-review` + `authoring-human-review` into one dual-mode `authoring-review` agent that picks AI-review vs human-feedback mode by human-feedback presence, reviews the new definitions against an explicit requirements list (AI mode) or records human feedback (human mode), and writes/updates REVIEW.md from the template. Consolidate all 8 authoring requirements into the existing `composer-authoring-conventions` module (add the 2 missing rules, sharpen one, remove duplicate restatements from the role identities), and have the reviewer verify each. Composer flow only; base `task-review`/`task-human-review` unchanged. Merge into `agents-approved`.
