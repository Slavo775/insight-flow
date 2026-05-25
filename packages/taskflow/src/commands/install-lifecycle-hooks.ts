import { installLifecycleHooks } from "../activity-hook.js";
import type { ParsedArgs } from "../types.js";

export function cmdInstallLifecycleHooks(
  opts: ParsedArgs = { _: [] },
  cwd: string = process.cwd(),
): void {
  const bin = (opts.bin as string | undefined) ?? "insight-flow";
  const result = installLifecycleHooks(cwd, bin);

  if (!result.hooksWritten && !result.settingsUpdated) {
    console.log(
      JSON.stringify({
        action: "install-lifecycle-hooks",
        result: "already-installed",
        hooksWritten: 0,
        settingsUpdated: false,
      }),
    );
    return;
  }

  console.log(
    JSON.stringify({
      action: "install-lifecycle-hooks",
      result: "installed",
      hooksWritten: result.hooksWritten,
      settingsUpdated: result.settingsUpdated,
    }),
  );
  console.error(
    `Generated ${result.hooksWritten} lifecycle hook(s) in .claude/hooks/ — restart your Claude Code session to activate.`,
  );
}
