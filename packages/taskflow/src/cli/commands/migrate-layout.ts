import { existsSync, renameSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { resolve, relative } from "node:path";
import type { TaskflowConfig } from "../../core/types.js";
import { resolveProjectRoot, resolveFlowRoot } from "../../core/paths.js";

interface PlannedMove {
  from: string;
  to: string;
}

/**
 * N100 — move a legacy project (`<workDir>/` + `<workDir>/.events/`) into the
 * consolidated `insightFlow/` layout (`insightFlow/workTasks/` +
 * `insightFlow/events/`). Idempotent: already-migrated projects are a no-op;
 * partial states are reported with recovery guidance instead of half-moving.
 * JSON contents are never touched — directories move as-is.
 */
export function cmdMigrateLayout(config: TaskflowConfig, opts: Record<string, unknown>): void {
  const dryRun = !!opts["dry-run"];
  const projectRoot = resolveProjectRoot();
  const layoutBefore = resolveFlowRoot(projectRoot, config.workDir);

  if (layoutBefore.layout === "insightFlow") {
    process.stdout.write(
      JSON.stringify({
        action: "migrate-layout",
        result: "noop",
        reason: "already on the insightFlow layout",
        tasksDir: rel(projectRoot, layoutBefore.tasksDir),
      }) + "\n",
    );
    return;
  }

  const insightRoot = resolve(projectRoot, "insightFlow");
  const targetTasksDir = resolve(insightRoot, "workTasks");
  const targetEventsDir = resolve(insightRoot, "events");
  const sourceTasksDir = layoutBefore.tasksDir;
  const movedLegacyEventsDir = resolve(targetTasksDir, ".events");

  // Partial state: insightFlow/ exists (without workTasks/, or layout detection
  // would have said "insightFlow") — a previous run was interrupted or the dir
  // was created by hand. Refuse rather than guess.
  if (existsSync(insightRoot)) {
    fail(
      `partial insightFlow/ layout detected at ${insightRoot} (no workTasks/ inside). ` +
        `Inspect its contents: either remove the directory and re-run, or finish the move ` +
        `by hand (mv ${rel(projectRoot, sourceTasksDir)} ${rel(projectRoot, targetTasksDir)}).`,
    );
  }

  if (!existsSync(sourceTasksDir)) {
    fail(
      `nothing to migrate: ${rel(projectRoot, sourceTasksDir)} does not exist. ` +
        `Run 'insight-flow init' to create a project.`,
    );
  }

  // Move 1 carries the nested legacy `.events/` along; move 2 hoists it to
  // the new top-level events dir.
  const moves: PlannedMove[] = [{ from: sourceTasksDir, to: targetTasksDir }];
  const hasLegacyEvents = existsSync(resolve(sourceTasksDir, ".events"));
  if (hasLegacyEvents) {
    moves.push({ from: movedLegacyEventsDir, to: targetEventsDir });
  }

  if (dryRun) {
    process.stdout.write(
      JSON.stringify({
        action: "migrate-layout",
        result: "dry-run",
        moves: moves.map((m) => ({ from: rel(projectRoot, m.from), to: rel(projectRoot, m.to) })),
      }) + "\n",
    );
    return;
  }

  mkdirSync(insightRoot, { recursive: true });
  for (const move of moves) {
    moveDir(move.from, move.to);
  }

  const layoutAfter = resolveFlowRoot(projectRoot, config.workDir);
  if (layoutAfter.layout !== "insightFlow") {
    fail("migration finished but layout detection still reports legacy — inspect the project.");
  }

  process.stdout.write(
    JSON.stringify({
      action: "migrate-layout",
      result: "migrated",
      moves: moves.map((m) => ({ from: rel(projectRoot, m.from), to: rel(projectRoot, m.to) })),
      tasksDir: rel(projectRoot, layoutAfter.tasksDir),
      eventsDir: rel(projectRoot, layoutAfter.eventsDir),
    }) + "\n",
  );
}

/** rename, with a copy+verify+delete fallback for cross-device moves. */
function moveDir(from: string, to: string): void {
  try {
    renameSync(from, to);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EXDEV") throw err;
    cpSync(from, to, { recursive: true, errorOnExist: true, force: false });
    rmSync(from, { recursive: true });
  }
}

function rel(root: string, path: string): string {
  return relative(root, path) || ".";
}

function fail(message: string): never {
  console.error(`migrate-layout: ${message}`);
  process.exit(1);
}
