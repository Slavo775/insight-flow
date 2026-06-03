import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { BUNDLED_HOOKS_VERSION, installLifecycleHooks } from "../../agents/activity-hook.js";
import type { ParsedArgs } from "../../core/types.js";

/**
 * Refresh hook scripts in `.claude/hooks/` and bump `hooksVersion` in
 * `taskflow.config.json`. Safe to run repeatedly — `installLifecycleHooks` is
 * idempotent (it writes only missing scripts and patches stale `command`
 * entries in `.claude/settings.json`).
 */
export function cmdMigrateHooks(opts: ParsedArgs = { _: [] }, cwd: string = process.cwd()): void {
  const bin = (opts.bin as string | undefined) ?? "insight-flow";
  // force=true so stale hook scripts left over from older versions get
  // rewritten in place. installLifecycleHooks compares content first, so
  // repeated runs against an up-to-date layout stay a no-op.
  const result = installLifecycleHooks(cwd, bin, { force: true });
  const configPath = resolve(cwd, "taskflow.config.json");
  let configBumped = false;
  let previousVersion: number | null = null;

  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, "utf-8");
      const cfg = JSON.parse(raw) as { hooksVersion?: number } & Record<string, unknown>;
      previousVersion = typeof cfg.hooksVersion === "number" ? cfg.hooksVersion : null;
      if (previousVersion !== BUNDLED_HOOKS_VERSION) {
        cfg.hooksVersion = BUNDLED_HOOKS_VERSION;
        writeFileSync(configPath, JSON.stringify(cfg, null, 2) + "\n");
        configBumped = true;
      }
    } catch {
      // Leave config alone if it's unreadable — the user should fix it manually.
    }
  }

  console.log(
    JSON.stringify({
      action: "migrate-hooks",
      hooksWritten: result.hooksWritten,
      settingsUpdated: result.settingsUpdated,
      previousHooksVersion: previousVersion,
      hooksVersion: BUNDLED_HOOKS_VERSION,
      configBumped,
    }),
  );
}
