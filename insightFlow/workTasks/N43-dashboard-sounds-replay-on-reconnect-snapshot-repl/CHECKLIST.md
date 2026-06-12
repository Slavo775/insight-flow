# N43 — Dashboard sounds replay on reconnect — snapshot replays playStatusSound for historical events — Checklist

## Done criteria

- [ ] `isReplayingSnapshot` flag declared in activity JS block in `dashboard.ts`.
- [ ] `sock.on('snapshot', ...)` sets the flag to `true` before the replay loop and `false` after.
- [ ] `addActivityEvent` skips `playStatusSound` when `isReplayingSnapshot` is `true`.
- [ ] Live `activity` socket events still trigger `playStatusSound` normally.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes (no TS errors).
- [ ] No regressions to activity feed render, dedup, or scroll behaviour.

## Verification

- [ ] Background the dashboard tab for 10+ seconds, switch back → no sounds play.
- [ ] End a Claude session while dashboard is focused → idle ping plays once.
