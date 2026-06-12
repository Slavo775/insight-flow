# N45 — Overview card stuck on permission-required after permission granted — Checklist

## Done criteria

- [ ] `"tool-approved": "active"` added to `CLAUDE_STATUS_MAP` in `packages/taskflow/src/server/index.ts`.
- [ ] No other files changed.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes (no TS errors).

## Verification

- [ ] After granting a permission request, master overview card transitions from red "permission required" to green "active".
- [ ] Existing transitions (active → permission-required → idle) are unaffected.
