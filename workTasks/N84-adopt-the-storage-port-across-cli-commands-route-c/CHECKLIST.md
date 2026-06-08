# N84 — Adopt the Storage port across CLI commands — route call sites through jsonFileStorage — Checklist

## Done criteria

- [ ] CLI + command call sites use `jsonFileStorage` / the `Storage` port instead of direct `storage.ts` free-function calls.
- [ ] No behavior change (the port delegates to the same functions).
- [ ] A future backend can be swapped at a single wiring point.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow test` passes (no behavior change)

## Verification

- [ ] `grep` confirms `cli/commands/*` import storage methods from `storage-port.js`; full suite green proves behavior preserved.
