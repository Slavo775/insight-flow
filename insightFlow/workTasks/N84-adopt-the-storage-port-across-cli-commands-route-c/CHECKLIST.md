# N84 — Adopt the Storage port across CLI commands — route call sites through jsonFileStorage — Checklist

## Done criteria

- [x] CLI + command call sites use `jsonFileStorage` / the `Storage` port instead of direct `storage.ts` free-function calls. (12 files / 71 `jsonFileStorage.*` call sites; cli.ts already done in N81)
- [x] No behavior change (the port delegates to the same functions; only call routing changed).
- [x] A future backend can be swapped at a single wiring point (the `jsonFileStorage` singleton in `storage-port.ts`).

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes
- [x] `pnpm --dir packages/taskflow test` passes (87/87, no behavior change)
- [x] `pnpm --dir packages/taskflow lint` + `format:check` pass (N82 gates)

## Verification

- [x] `grep` confirms all 12 `cli/` modules import the port from `storage-port.js`; zero bare port-method call sites remain; full suite green proves behavior preserved.
