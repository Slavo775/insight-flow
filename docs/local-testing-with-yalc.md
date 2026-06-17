# Local testing with yalc

Test the `insight-flow` package the way a consumer would install it — `files` allowlist, `bin` wiring, prod deps only — **before** cutting a real npm release, using [yalc](https://github.com/wclr/yalc) as a local package store.

`yalc` ships as a dev dependency of this repo, so the `pnpm yalc:*` scripts work without a global install. (In a separate consumer project, get `yalc` via `npm i -g yalc` once, or let `npx` fetch it.)

## Quick reference

```bash
# 1. In this repo — build + publish to the local yalc store
pnpm yalc:publish

# 2. In your test project — install it like a real npm dependency
npx yalc add insight-flow && pnpm install

# 3. Iterate — after changing package code, rebuild + update every linked project
pnpm yalc:push          # run from this repo; auto-updates the linked test project

# 4. Cleanup — in the test project
npx yalc remove insight-flow && pnpm install
```

## What each step does

| Step | Command | Effect |
|------|---------|--------|
| Publish | `pnpm yalc:publish` | Builds the package, then copies exactly what `npm publish` would (the `files` allowlist: `dist`, `schema`, `templates`, `README.md`, `LICENSE`) plus the `insight-flow` bin into `~/.yalc/packages/insight-flow`. |
| Add | `npx yalc add insight-flow` | Drops a real copy into `<project>/.yalc/` and injects a `file:.yalc/insight-flow` dependency — behaves like a genuine npm install, not a symlinked `npm link`. Follow with `pnpm install` to wire up `node_modules` + the bin. |
| Push | `pnpm yalc:push` | Build + publish + update every project that already added the package, in place. If a consumer doesn't refresh, run `npx yalc update` inside it. |
| Remove | `npx yalc remove insight-flow` | Removes the `file:` dependency from the consumer. Follow with `pnpm install`. |

After `yalc add` + install, the CLI is available in the consumer via `npx insight-flow` / `pnpm exec insight-flow` (e.g. `npx insight-flow --version`, `npx insight-flow ui`).

> The `.yalc/` directory and `yalc.lock` are gitignored at the repo root, so yalc state never leaks into commits if you use `playground/` as the test consumer.

See also the [package README's "Local testing with yalc" section](../packages/taskflow/README.md#local-testing-with-yalc-contributors).
