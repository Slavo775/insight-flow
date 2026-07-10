import type { ParsedArgs } from "../../core/types.js";
import { executeInstall } from "../../agents/flow-install.js";
import { mergedProjects } from "../../agents/user-registry.js";
import type { EmitReport } from "../../agents/emit.js";

/**
 * Core install-a-flow primitive, shared by the CLI command and `insight-flow init`.
 * Installs a built-in or custom flow's artifacts (commands + subagents + any
 * mcp-server + hooks) into the project at `root` via the same `executeInstall`
 * engine the composer MCP uses. Idempotent (re-running is safe).
 */
export function installFlow(
  id: string,
  root: string,
  opts: { force?: boolean } = {},
): EmitReport[] {
  return executeInstall({ kind: "flow", id }, root, { force: opts.force ?? false });
}

/**
 * `insight-flow install-flow <id>` — install a built-in/custom flow into the
 * current project. Validates the id against the merged flow registry so an
 * unknown flow fails with the list of known ids instead of a raw throw.
 */
export function cmdInstallFlow(opts: ParsedArgs = { _: [] }, cwd: string = process.cwd()): void {
  const id = (opts._?.[0] ?? opts.id) as string | undefined;
  const flows = mergedProjects(cwd);
  if (!id) {
    console.error(
      `Usage: insight-flow install-flow <flow-id>\nKnown flows: ${Object.keys(flows).join(", ")}`,
    );
    process.exit(1);
  }
  if (!flows[id]) {
    console.error(`Unknown flow '${id}'. Known flows: ${Object.keys(flows).join(", ")}`);
    process.exit(1);
  }
  const reports = installFlow(id, cwd, { force: !!opts.force });
  console.log(
    JSON.stringify(
      {
        action: "install-flow",
        id,
        artifacts: reports.map((r) => ({ target: r.target, result: r.action })),
      },
      null,
      2,
    ),
  );
}
