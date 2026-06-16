# N133 — Agent role prompts emit status via the flow — Checklist

## Done criteria

- [x] Transition wording/targets derive from the agent's status-transition module:
      `composeAgent` renders it as an `insight-flow advance` instruction;
      `advance` reads the module's target and writes via the N131 setter
- [x] Custom flow agents emit the flow's custom statuses (e2e: advance → custom
      status, validated against the flow)
- [x] Default roles byte-identical (shipped agents carry no transition modules;
      compose drift green; `sync-roles` copied 0 / unchanged 14)
- [x] End-to-end custom-status lifecycle works (create on custom flow → advance)

## Quality gates

- [x] `npx tsc --noEmit` passes (server + client)
- [x] `npm run lint` passes (no new findings)
- [x] Related tests pass (219; +4 in `test/transitions.test.mjs`)
- [x] No regressions in affected area (compose/role drift suites green)

## Verification

- [x] default role parity (shipped agents have no advance wording), custom-status
      emission (e2e), and role-template drift (`sync-roles`) verified
