# N162 — Shared Button component everywhere + secondary (white-bordered) variant

**Type:** feat
**Priority:** medium
**Created:** 2026-06-22

## Problem

Buttons in the dashboard authoring UI are visually inconsistent: on `/module/notify` the "Edit" action reads like a link, "Back to all modules" likewise, and on `/module/edit/notify` "Cancel" + "Revert to shipped" have no shared neutral treatment. A shared `Button` component exists but lacks a neutral/white-bordered variant and isn't used by every action.

## Goal

1. Add a `secondary` (transparent bg, neutral/white border) variant to the `Button` component.
2. Route all module/agent/project action buttons through the shared `Button`.
3. "Edit" and "Back to all modules" render as real buttons (Edit emphasised like "Edit flow").
4. "Cancel" and "Revert to shipped" use the `secondary` variant; "Save changes" stays `primary`.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/components/Button.tsx` — add `secondary` to `ButtonVariant` + `buttonVariants`.
- Call sites: `ModuleDetail.tsx`, `ModuleForm.tsx`, `ProjectPage.tsx`, `AgentForm.tsx`, `AgentDetail.tsx` — migrate raw/ad-hoc buttons to `Button` with the right variant.

### Out of scope

- Behavioral changes to any action (UI/styling only).
- A full design-system / token refactor.

## Implementation plan

1. **Add `secondary` variant** — extend `ButtonVariant` union and the `buttonVariants` map in `Button.tsx` (transparent background, `theme.color.border` border, neutral text, accent border on hover).
2. **Audit call sites** — grep the client for raw `<button`, `styled.button`, and link-styled actions in the module/agent/project pages.
3. **Migrate** — replace each with `<Button $variant=...>`: Edit → emphasised (`primary`), Back to all modules → `nav`/`secondary`, Cancel + Revert to shipped → `secondary`, Save changes → `primary`.
4. **Visual pass** — confirm spacing/sizing parity so nothing shifts layout.

## Verification

- `pnpm --dir packages/taskflow run build` succeeds (typecheck passes for the new variant).
- Manual: `pnpm play` → visit `/module/notify` and `/module/edit/notify`; Edit/Back/Cancel/Revert/Save all render as buttons with the intended variants.

## Notes

- Existing variants: `nav | tab | icon | close | docTab | primary | danger`. See ANALYSIS.md for the decision (Option A — add variant + migrate). Parallel-safe with N163, N168.
