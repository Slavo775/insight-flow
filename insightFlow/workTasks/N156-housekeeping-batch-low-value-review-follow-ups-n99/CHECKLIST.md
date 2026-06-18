# N156 — housekeeping batch — low-value review follow-ups (N99-N150) — Checklist

## Done criteria

- [ ] Each in-scope candidate triaged (done, or skipped-as-moot with a note)
- [ ] `LOCKED_MODULE_IDS` shared constants module (server + client) — or noted moot
- [ ] Handover append-position before `actions` (+ contiguity note) — drift guard re-checked
- [ ] Bundle-picker kind-dots/preview + hex note + CRUD response-key doc applied where trivial
- [ ] Out-of-scope design items left untouched (live-SSE, kanban toggle, weight rescale)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow lint` + `format:check` pass
- [ ] `pnpm --dir packages/taskflow test` passes (drift guard incl.; regen role MD only if intended)

## Verification

- [ ] PR lists which candidates were done vs skipped-as-moot
- [ ] No unintended `*_ROLE.md` changes (or regenerated + reviewed if append-position altered output)
