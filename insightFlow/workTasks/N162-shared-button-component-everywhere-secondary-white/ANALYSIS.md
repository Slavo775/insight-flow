# N162 — Shared Button component everywhere + secondary (white-bordered) variant — Analysis

**Created:** 2026-06-22
**Author:** task-analyze

## Problem framing

- Symptom: action buttons across the dashboard authoring UI are visually inconsistent. On `/module/notify` the **Edit** action reads as a link, not a button (should look like "Edit flow"); "Back to all modules" likewise; on `/module/edit/notify` **Cancel** + **Revert to shipped** lack a shared neutral treatment.
- Cause: a shared `Button` component already exists (`packages/taskflow/src/dashboard/client/components/Button.tsx`) with variants `nav | tab | icon | close | docTab | primary | danger`, but (a) there is **no neutral "secondary / white-bordered" variant**, and (b) not every action routes through it — some call sites use raw/ad-hoc elements.

## Goal

- One Button component is the single source for all module/agent/project action buttons.
- Add a `secondary` variant: transparent background, white/neutral border (used by Cancel + Revert-to-shipped).
- "Edit" / "Back to all modules" render as real buttons via the component.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Add `secondary` variant + migrate all call sites to `Button` | Consistent, minimal new surface, leverages existing component | Touch several files | S–M |
| B — Add variant only, leave page-local styling | Tiny diff | Inconsistency persists | S |
| C — Full design-system refactor (tokens + button group) | Future-proof | Overkill for this ask | L |

## Decision

- Chosen option: **A**.
- Rationale: the component already exists with a variant pattern; the gap is one missing variant + migration of stragglers. Lowest blast radius for the consistency the user wants.

## Open questions

- `[non-blocking]` Does "Revert to shipped" stay `danger` or become `secondary`? User said white-bordered → maps to `secondary`. Confirm during implement.
- `[non-blocking]` Should "Edit flow" emphasis be `primary` or a distinct emphasis variant? Default to `primary`.

## Sources

- None — discussion was self-contained; grounded in `components/Button.tsx`, `ModuleDetail.tsx`, `ModuleForm.tsx`, `ProjectPage.tsx`.

## Handoff brief

- Title: Shared Button component everywhere + secondary (white-bordered) variant · type: feat · priority: medium. Add a neutral `secondary` variant to `Button.tsx` and route all module/agent/project action buttons (Edit, Back to all modules, Cancel, Revert to shipped, Save changes) through the shared component with variants. UI-only, no behavior change.
