import {
  existsSync,
  renameSync,
  mkdirSync,
  cpSync,
  rmSync,
  readdirSync,
  readFileSync,
} from "node:fs";
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
 *
 * N141 — also cleans up stray doubled `insightFlow/workTasks/workTasks/Nxx-…`
 * directories produced by the N139 bug (live between the N101 migration and the
 * N139 fix). Stray cleanup is report-only by default — projects that hit the bug
 * are already on the insightFlow layout, so the no-op path above is the one that
 * reaches them — and only removes a stray under an explicit `--fix-strays` flag,
 * and only when it is empty / scaffold-only (a stray REVIEW.md carrying a real
 * review is preserved and reported, never deleted).
 */
export function cmdMigrateLayout(config: TaskflowConfig, opts: Record<string, unknown>): void {
  const dryRun = !!opts["dry-run"];
  const fixStrays = !!opts["fix-strays"];
  const projectRoot = resolveProjectRoot();
  const layoutBefore = resolveFlowRoot(projectRoot, config.workDir);

  if (layoutBefore.layout === "insightFlow") {
    const strays = handleStrays(projectRoot, layoutBefore.tasksDir, { dryRun, fixStrays });
    process.stdout.write(
      JSON.stringify({
        action: "migrate-layout",
        result: "noop",
        reason: "already on the insightFlow layout",
        tasksDir: rel(projectRoot, layoutBefore.tasksDir),
        ...(strays ? { strays } : {}),
      }) + "\n",
    );
    return;
  }

  const insightRoot = resolve(projectRoot, "insightFlow");
  const targetTasksDir = resolve(insightRoot, "workTasks");
  const targetEventsDir = resolve(insightRoot, "events");
  const sourceTasksDir = layoutBefore.tasksDir;
  const movedLegacyEventsDir = resolve(targetTasksDir, ".events");

  // Blockers are collected, not thrown inline, so --dry-run reports them as
  // warnings without exiting non-zero (a dry-run takes no side effects and is
  // purely informational). A real run fails on any blocker below.
  //
  // Partial state: insightFlow/ exists (without workTasks/, or layout detection
  // would have said "insightFlow") — a previous run was interrupted or the dir
  // was created by hand. Exception (N102): the user-space registry dirs
  // (modules/agents/projects) legitimately exist before migration.
  const blockers: string[] = [];
  if (existsSync(insightRoot)) {
    const REGISTRY_DIRS = new Set(["modules", "agents", "projects"]);
    const stray = readdirSync(insightRoot).filter(
      (entry) => !REGISTRY_DIRS.has(entry) && entry !== ".DS_Store",
    );
    if (stray.length > 0) {
      blockers.push(
        `partial insightFlow/ layout detected at ${insightRoot} (no workTasks/ inside; found: ${stray.join(", ")}). ` +
          `Inspect its contents: either remove the directory and re-run, or finish the move ` +
          `by hand (mv ${rel(projectRoot, sourceTasksDir)} ${rel(projectRoot, targetTasksDir)}).`,
      );
    }
  }
  if (!existsSync(sourceTasksDir)) {
    blockers.push(
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
        ...(blockers.length ? { warnings: blockers } : {}),
      }) + "\n",
    );
    return;
  }

  if (blockers.length > 0) {
    fail(blockers.join(" "));
  }

  mkdirSync(insightRoot, { recursive: true });
  for (const move of moves) {
    moveDir(move.from, move.to);
  }

  const layoutAfter = resolveFlowRoot(projectRoot, config.workDir);
  if (layoutAfter.layout !== "insightFlow") {
    fail("migration finished but layout detection still reports legacy — inspect the project.");
  }

  const strays = handleStrays(projectRoot, layoutAfter.tasksDir, { dryRun, fixStrays });
  process.stdout.write(
    JSON.stringify({
      action: "migrate-layout",
      result: "migrated",
      moves: moves.map((m) => ({ from: rel(projectRoot, m.from), to: rel(projectRoot, m.to) })),
      tasksDir: rel(projectRoot, layoutAfter.tasksDir),
      eventsDir: rel(projectRoot, layoutAfter.eventsDir),
      ...(strays ? { strays } : {}),
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

interface StrayDir {
  dir: string;
  eligible: boolean;
  removed: boolean;
  reason?: string;
}

interface StrayReport {
  parent: string;
  dirs: StrayDir[];
  eligible: number;
  removed: number;
  parentRemoved?: boolean;
  hint?: string;
}

/**
 * N141 — detect (and optionally clean) stray doubled task dirs at
 * `<tasksDir>/workTasks/Nxx-…` left by the N139 bug. Returns undefined when the
 * doubled `workTasks/` parent holds no `Nxx-…` strays (the common, clean case),
 * so callers omit the field entirely and existing output is unchanged.
 *
 * Removal happens only when `fixStrays` is set and it is not a dry-run, and only
 * for strays classified eligible (empty, or a single scaffold-only REVIEW.md).
 * Anything else — a REVIEW.md with a real verdict/summary, or unexpected files —
 * is preserved and reported with a reason.
 */
function handleStrays(
  projectRoot: string,
  tasksDir: string,
  { dryRun, fixStrays }: { dryRun: boolean; fixStrays: boolean },
): StrayReport | undefined {
  const parent = resolve(tasksDir, "workTasks");
  if (!existsSync(parent)) return undefined;
  const children = readdirSync(parent, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^N\d+-/.test(e.name))
    .map((e) => e.name)
    .sort();
  if (children.length === 0) return undefined;

  const apply = fixStrays && !dryRun;
  const dirs: StrayDir[] = [];
  let eligible = 0;
  let removed = 0;
  for (const name of children) {
    const abs = resolve(parent, name);
    const { eligible: isEligible, reason } = classifyStray(abs);
    if (isEligible) eligible++;
    let didRemove = false;
    if (isEligible && apply) {
      rmSync(abs, { recursive: true });
      didRemove = true;
      removed++;
    }
    dirs.push({
      dir: rel(projectRoot, abs),
      eligible: isEligible,
      removed: didRemove,
      ...(reason ? { reason } : {}),
    });
  }

  // Drop the now-empty doubled `workTasks/` parent only once everything under
  // it is gone — never if a preserved stray still lives there.
  let parentRemoved = false;
  if (apply && existsSync(parent)) {
    const leftover = readdirSync(parent).filter((f) => f !== ".DS_Store");
    if (leftover.length === 0) {
      rmSync(parent, { recursive: true });
      parentRemoved = true;
    }
  }

  return {
    parent: rel(projectRoot, parent),
    dirs,
    eligible,
    removed,
    ...(parentRemoved ? { parentRemoved: true } : {}),
    ...(!apply && eligible > 0
      ? {
          hint: dryRun
            ? "re-run without --dry-run and with --fix-strays to remove the eligible strays"
            : "re-run with --fix-strays to remove the eligible strays",
        }
      : {}),
  };
}

/**
 * A stray dir is eligible for removal when it is empty, or holds nothing but a
 * scaffold-only REVIEW.md. Any other file, or a REVIEW.md that carries a real
 * review, makes it ineligible (preserved) with a reason.
 */
function classifyStray(dir: string): { eligible: boolean; reason?: string } {
  const files = readdirSync(dir).filter((f) => f !== ".DS_Store");
  if (files.length === 0) return { eligible: true };
  if (files.length === 1 && files[0] === "REVIEW.md") {
    if (isScaffoldReview(readFileSync(resolve(dir, "REVIEW.md"), "utf-8"))) {
      return { eligible: true };
    }
    return {
      eligible: false,
      reason: "REVIEW.md carries a real review (verdict set or summary filled)",
    };
  }
  return { eligible: false, reason: `unexpected files present: ${files.sort().join(", ")}` };
}

/**
 * Scaffold-only ⟺ the untouched REVIEW.md.tpl render: verdict still `pending`,
 * the Summary placeholder never replaced, and no appended `## Round N` block.
 * Conservative — any sign of a human/AI edit flips it to false (preserve).
 */
function isScaffoldReview(content: string): boolean {
  if (/^## Round \d+/m.test(content)) return false;
  if (!content.includes("**Verdict:** pending")) return false;
  return content.includes("<one paragraph: what changed, risk level>");
}

function rel(root: string, path: string): string {
  return relative(root, path) || ".";
}

function fail(message: string): never {
  console.error(`migrate-layout: ${message}`);
  process.exit(1);
}
