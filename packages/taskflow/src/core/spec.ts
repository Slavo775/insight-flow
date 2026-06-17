import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Task, TaskflowConfig } from "./types.js";
import { getWorkDir } from "./config.js";
import { resolvePackageAsset } from "./paths.js";

/**
 * Resolve `<workDir>/<task.folder relative tail>` — duplicated from storage.ts
 * to keep spec.ts independent. `task.folder` is stored as a project-relative
 * path like "workTasks/Nxx-slug".
 */
function resolveTaskFolder(config: TaskflowConfig, task: Task, cwd?: string): string {
  const workDir = getWorkDir(config, cwd);
  // N139 — task.folder is stored project-root-relative (e.g.
  // "insightFlow/workTasks/N00-x"). Take its basename so joining with workDir
  // (already the resolved tasks dir) can't double the layout segments — the old
  // `replace(/^.*?\//, "")` stripped only the first segment and produced
  // insightFlow/workTasks/workTasks/N00-x under the N101 layout.
  const tail = task.folder.split(/[\\/]/).filter(Boolean).pop() ?? task.folder;
  return resolve(workDir, tail);
}

/** Substitute `{{KEY}}` placeholders. Used by every template consumer. */
export function renderTemplate(tplPath: string, vars: Record<string, string>): string {
  let body = readFileSync(tplPath, "utf-8");
  for (const [key, value] of Object.entries(vars)) {
    body = body.replaceAll(`{{${key}}}`, value);
  }
  return body;
}

/**
 * Read TASK.md + CHECKLIST.md as strings from a task's folder. Either may be
 * null if the file is absent (graceful for tasks created before scaffolding
 * existed, or for tasks where docs were intentionally not written yet).
 */
export function loadSpec(
  config: TaskflowConfig,
  task: Task,
  cwd?: string,
): { task: string | null; checklist: string | null } {
  const folderPath = resolveTaskFolder(config, task, cwd);
  const taskMd = resolve(folderPath, "TASK.md");
  const checklistMd = resolve(folderPath, "CHECKLIST.md");
  return {
    task: existsSync(taskMd) ? readFileSync(taskMd, "utf-8") : null,
    checklist: existsSync(checklistMd) ? readFileSync(checklistMd, "utf-8") : null,
  };
}

/**
 * Scaffold REVIEW.md for a task.
 *
 * - First call (file absent): write the template with placeholders substituted.
 *   Returns `{ created: true, round: 1 }`.
 * - Subsequent calls (file present): append a `## Round N — pending verdict`
 *   block (N = number of existing `## Round` headings + 2, since the initial
 *   review is round 1 and doesn't carry a `## Round 1` heading by convention).
 *   Returns `{ created: false, round: N }`.
 */
export function scaffoldReviewMd(
  config: TaskflowConfig,
  task: Task,
  vars: { reviewer: string; date: string; prUrl: string },
  cwd?: string,
): { created: boolean; round: number } {
  const folderPath = resolveTaskFolder(config, task, cwd);
  if (!existsSync(folderPath)) mkdirSync(folderPath, { recursive: true });
  const reviewMd = resolve(folderPath, "REVIEW.md");

  if (!existsSync(reviewMd)) {
    const tpl = resolvePackageAsset("templates/task/REVIEW.md.tpl");
    if (!existsSync(tpl)) return { created: false, round: 1 };
    const body = renderTemplate(tpl, {
      ID: task.id,
      TITLE: task.title,
      REVIEWER: vars.reviewer,
      DATE: vars.date,
      PR_URL: vars.prUrl,
    });
    writeFileSync(reviewMd, body);
    return { created: true, round: 1 };
  }

  // Existing file — append a Round N block. Section headings mirror the
  // Round-1 template (Summary / Checklist verification / Blockers /
  // Non-blocking / Security & edge cases / Notes) but at h3 so they nest
  // cleanly under the `## Round N` h2 and don't collide with the original
  // round's global h2 sections.
  const existing = readFileSync(reviewMd, "utf-8");
  const roundMatches = existing.match(/^## Round \d+/gm) ?? [];
  const nextRound = roundMatches.length + 2; // initial review = round 1 (no heading); next round starts at 2

  const block =
    `\n\n---\n\n## Round ${nextRound} — pending verdict\n\n` +
    `**Reviewer:** ${vars.reviewer}\n` +
    `**Date:** ${vars.date}\n` +
    `**Verdict:** pending\n\n` +
    `### Summary\n\n` +
    `### Checklist verification\n\n` +
    `### Blockers\n\n` +
    `### Non-blocking\n\n` +
    `### Security & edge cases\n\n` +
    `### Notes\n`;

  writeFileSync(reviewMd, existing + block);
  return { created: false, round: nextRound };
}
