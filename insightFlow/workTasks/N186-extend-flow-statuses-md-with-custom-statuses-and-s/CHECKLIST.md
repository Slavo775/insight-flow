# N186 — Extend flow/statuses.md with custom statuses and state aliases — Checklist

## Done criteria

- [ ] `flow/statuses.md` reframes the canonical table as the **default flow's** statuses.
- [ ] New "Custom statuses & state aliases" section covers the **two** mechanisms:
  - [ ] Custom status universe (`statuses[]`, N128): id/name/color/terminal; empty ⇒ canonical fallback; the value a task actually stores.
  - [ ] State aliases (`states[]`, N112): `mapsTo` a canonical status; display/suggestion layer only; `resolveTrigger` collapses alias → canonical.
- [ ] A small example showing a custom flow's `statuses` + a `states` alias.
- [ ] Cross-links to `../concepts/flows.md` and `../guides/custom-flow.md` resolve.
- [ ] Handovers / relationships NOT duplicated (out of scope).
- [ ] No source-code change; docs only.

## Quality gates

- [ ] `pnpm --dir website build` passes, zero broken-link/anchor warnings.
- [ ] Prettier passes on the edited file.
- [ ] Claims grounded in source (`FlowStatusSchema`/N128, `states`/N112, `resolveTrigger`).

## Verification

- [ ] Built page distinguishes canonical vs custom statuses vs state aliases; cross-links work.
