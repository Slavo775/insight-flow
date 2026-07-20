# N255 — Deduplicate UI form components and agent hook installers; activity.ts to JSX

**Type:** refactor
**Priority:** medium
**Created:** 2026-07-18

## Problem

The audit (2026-07-18) found three separate copy-paste clusters worth collapsing:

1. **UI form styled-components** — ~12 styled-components (`Field`, `FieldError`, `TopError`, `FormActions`, `FormBox`, `PickerRow`, `OrderedRow`, `RowTitle`, `RowButton`, `OriginTag`, `CheckRow`, `PickerList`) are copy-pasted near-verbatim across `ModuleForm.tsx`, `AgentForm.tsx`, `ProjectForm.tsx`.
2. **Agent hook installers** — `notify-hook.ts` is essentially a clone of `activity-hook.ts` (same `settingsRegistersHook` / `hookFilePath` / `SETTINGS_CANDIDATES` / read-dedup-push-write body, with `Stop`/`taskflow-notify.sh` swapped for `PostToolUse`/`taskflow-activity.sh`), and both hand-roll the settings.json hook-registration that `emit.ts applyHooks` already does generically. The bash prelude (resolve `insight-flow` bin → read port → `curl` an `/api/agent-*` endpoint) is copy-pasted across `notify-hook.ts`, `cursor-hooks.ts` (STOP + APPROVAL scripts).
3. **`activity.ts` HTML strings** — ~340 lines build DOM as escaped HTML strings piped through `dangerouslySetInnerHTML` (`ActivityFeed.tsx:47`), reimplementing JSX + React's built-in escaping by hand. This is a manual-escape XSS surface in a React app.

## Goal

1. One shared `client/components/form.ts` holding the common form styled-components; the 3 forms import from it.
2. Agent hook-installer duplication collapsed — `notify-hook`/`activity-hook` share their settings.json registration logic (ideally onto `emit.ts applyHooks`), and the bash prelude is shared once.
3. `activity.ts` render functions converted to JSX; `dangerouslySetInnerHTML` and hand-rolled `escHtml` in the activity path removed.
4. Smaller UI dedup wins folded in: `MapBox` (FlowMap/CompositionMap), `minutesBetween` helper (DetailPanel).

## Scope

### In scope

- **UI forms** — `packages/taskflow/src/dashboard/client/`: extract shared styled-components from `ModuleForm.tsx:30-137`, `AgentForm.tsx:31-156`, `ProjectForm.tsx:15-84` into `components/form.ts`. `Field/FieldError/TopError/FormActions/FormBox/OriginTag/CheckRow` are identical across all 3; `PickerList/PickerRow/OrderedRow/RowTitle/RowButton` across ModuleForm+AgentForm.
- **UI small dups** — shared `MapBox` styled from `FlowMap.tsx:21` + `CompositionMap.tsx:24`; `minutesBetween(a,b)` in `lib.ts` replacing the duplicated `Math.round((end-start)/60000)` at `DetailPanel.tsx:91-96` and `:133-139`.
- **activity.ts → JSX** — convert `renderActivityItemHtml`/`hookEventHtml` (and siblings) in `client/activity.ts` to React components; update `ActivityFeed.tsx:47` to render them directly; delete the activity-path `escHtml`.
- **Agent hooks** — `packages/taskflow/src/agents/`: dedup `notify-hook.ts` against `activity-hook.ts` (`settingsRegistersHook`, `hookFilePath`, `SETTINGS_CANDIDATES`, install body); prefer routing both through `emit.ts applyHooks`/`applyArtifacts`. Extract the shared bash prelude used by `notify-hook.ts` `NOTIFY_HOOK_SCRIPT`, `cursor-hooks.ts` `STOP_SCRIPT`+`APPROVAL_SCRIPT`. Also fold the in-file duplicate: hook-group removal filter repeated in `emit.ts applyHooks` (240-247) and `uninstallTarget` (753-760).

### Out of scope

- The server-side `escHtml` unification and `http-util` extraction — that's N254. If N254 lands first and exposes a shared `escHtml`, the client may reuse it, but don't block on it.
- Splitting the large `FlowEditor.tsx` (830 lines) / `ProjectPage.tsx` (505 lines) god-components — noted by the audit but a separate task; not here.
- The parallel status-color systems consolidation (`badgeClass`/`BADGE_TONES`/`tokens.status`) — separate, deeper; only touch it if the form/activity work naturally crosses it.

## Implementation plan

1. **`components/form.ts`** — move the shared styled-components there; update the 3 forms to import; delete their local copies. Verify each form still renders + validates.
2. **`MapBox` + `minutesBetween`** — extract both; update the 2 call sites each.
3. **activity.ts → JSX** — convert render functions to components; swap `ActivityFeed.tsx:47` off `dangerouslySetInnerHTML`; delete the manual `escHtml`. This removes an XSS surface — verify the feed renders identically for each event type.
4. **Agent hook dedup** — collapse `notify-hook`↔`activity-hook` registration onto the generic `applyHooks` path; extract the shared bash prelude; remove the duplicated removal filter. Re-run the hook install/uninstall paths.
5. **Gates + verify** — build, `tsc --noEmit`, lint, test; `insight-flow ui` to eyeball the 3 forms + activity feed; exercise a hook install/uninstall.

## Verification

- `pnpm --dir packages/taskflow test` + `tsc --noEmit` + lint green.
- `insight-flow ui`: Module/Agent/Project forms render + validate as before; activity feed renders every event type identically (compare before/after screenshots).
- Hook install then uninstall via the agents path leaves settings.json correct (no orphaned entries).
- `git grep` shows the moved styled-components + bash prelude defined once.

## Notes

- Independent of N253/N254 but lower-conflict if done after N254 (shared `escHtml` may already exist). Source: ponytail audit 2026-07-18. See ANALYSIS.md.
- The activity.ts→JSX change is the one with real safety value (removes `dangerouslySetInnerHTML`); prioritize it within the task. Related: [N253], [N254].
