# N36 — Sound notification on agent idle and permission needed — Checklist

## Done criteria

- [ ] `playStatusSound(state)` function added using Web Audio API (no external files)
- [ ] `idle` state plays soft descending sine-wave chime (880 Hz → 440 Hz, 0.5 s)
- [ ] `permission-needed` state plays two short square-wave pulses (660 Hz)
- [ ] Sound only plays when `localStorage.getItem('notif-sound') === 'true'`
- [ ] `playStatusSound` called from event handler after `updateActivityStatus` (N35)
- [ ] No double-sound on WS reconnect (guarded by N33 event ID dedup)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` exits 0

## Verification

- [ ] Enable "Sound" in notification settings → `insight-flow log-event done` → hear descending chime
- [ ] Simulate `approval-required` event → hear two short pulses
- [ ] Disable "Sound" → no audio on subsequent events
- [ ] WS reconnect → no audio replay of already-seen events
