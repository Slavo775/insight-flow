# N255 — Deduplicate UI form components and agent hook installers; activity.ts to JSX — Checklist

## Done criteria

- [x] `client/components/form.ts` holds the shared form styled-components; ModuleForm/AgentForm/ProjectForm import from it, local copies deleted
- [~] **Only the 8 provably-safe components extracted** (7 byte-identical: FieldError, TopError, FormActions, PickerRow, OrderedRow, RowTitle, RowButton + `Field` as ModuleForm's superset — verified Agent/Project forms have zero select/textarea so the extra rules are inert). Browser-confirmed identical rendering.
- [~] **`FormBox`, `OriginTag`, `CheckRow`, `PickerList` LEFT per-form** — re-confirmation showed they genuinely DIFFER between forms (audit's "identical" was wrong); merging would change appearance.
- [~] **`MapBox` SKIPPED** — FlowMap (620px, position:relative) vs CompositionMap (560px, +`.react-flow__attribution`) genuinely differ; not a safe merge.
- [x] `minutesBetween(start, end)` in `lib.ts` replaces both duplicated duration calcs in DetailPanel
- [x] `activity.ts` render functions converted to JSX (`ActivityItem.tsx`); `ActivityFeed.tsx` no longer uses `dangerouslySetInnerHTML`; `escHtml` deleted (React auto-escapes). Class/icon/spacing taxonomy preserved exactly.
- [~] **agent hooks:** the big "notify-hook clones activity-hook" duplication was already removed by N253 (dead helpers deleted). Extracted the one clean, testable remaining dup: `removeOwnedHook` helper in `emit.ts` (was inlined identically in `applyHooks` + `uninstallTarget`).
- [~] **bash prelude sharing LEFT** — notify-hook (Claude) and cursor-hooks (`CURSOR_PROJECT_DIR`) preludes genuinely differ by environment; they run in external hook runners with no unit tests → forcing a shared prelude is the risky-DRY case, not a safe mechanical dedup.

## Quality gates

- [x] `npx tsc --noEmit` passes
- [x] lint passes (eslint clean; prettier applied)
- [x] `pnpm --dir packages/taskflow test` passes (373/373)
- [x] No regressions in affected area

## Verification (browser-driven, per request)

- [x] AgentForm renders correctly — shared Field / PickerRow / FormActions all styled as before
- [x] ModuleForm renders correctly — superset `Field` styles `<select>` (Harness/Kind) + `<textarea>` (Body) + inputs consistently
- [x] Activity feed renders every event type via the JSX `ActivityItem` (tool-requested/approved, approval-required, agent-active/idle, started/completed skills, done, file-written, Write/Bash tools) — matches former string renderer
- [x] Zero console errors across forms + feed
