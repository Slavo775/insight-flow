# N95 — Bundle module kind — modules composed of modules — Checklist

## Done criteria

- [ ] `kind: "bundle"` schema variant with `modules: [ids]` (min 1)
- [ ] `resolveModules` expands bundles recursively at the bundle's declared position; first-wins dedup spans bundle + direct refs; cycles throw with the cycle path named
- [ ] `testing` bundle ships; playground def adopts the single id; emitted artifacts identical to listing the three siblings
- [ ] Dashboard: bundle kind badge/color, children listed + linked in detail, bundle → children map edges
- [ ] Drift suite untouched; `/api/modules` response shape unchanged

## Quality gates

- [ ] `pnpm build` passes
- [ ] Lint passes (baseline)
- [ ] `pnpm --filter insight-flow test` passes incl. new bundle tests

## Verification

- [ ] Playground apply via bundle id → byte-identical artifacts, second run all `unchanged`
- [ ] `/module/testing` renders the bundle with 3 linked children
