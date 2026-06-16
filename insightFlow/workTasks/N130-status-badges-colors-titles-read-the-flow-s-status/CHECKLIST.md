# N130 — Status badges/colors/titles read the flow's status defs — Checklist

## Done criteria

- [x] Status styling resolves from the flow's statuses (`core/kanban.statusLabel`/
      `statusColor`/`isCanonicalStatus`); `Badge` takes a `statuses` prop, custom
      statuses with a hex color render colored (canonical keep grouped tones)
- [x] Canonical fallback unchanged for default-only (title===id, canonical colors;
      canonical statuses always use the 6 grouped tones)
- [x] Consistent across kanban cards, task detail (Info + status history), timeline
      (color + label) via `useFlowStatusMap`
- [x] Unknown status → raw id label + neutral color (caller fallback)

## Quality gates

- [x] `npx tsc --noEmit` passes (server + client)
- [x] `npm run lint` passes (no new findings)
- [x] Related tests pass (203; +4 in `test/status-style.test.mjs`)
- [x] No regressions in affected area (default-flow parity asserted; build green)

## Verification

- [x] custom/canonical/unknown status styling verified by `test/status-style.test.mjs`
      (default-flow byte-parity: title===id, color==#f59e0b, done→neutral)
