import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { MasterFile, TaskflowConfig, ParsedArgs } from "../types.js";
import {
  getShardFileName,
  loadShard,
  saveShard,
  saveMaster,
  ensureShardExists,
  getWorkDir,
  now,
} from "../storage.js";
import { resolvePackageAsset } from "../paths.js";

function renderTemplate(tplPath: string, vars: Record<string, string>): string {
  let body = readFileSync(tplPath, "utf-8");
  for (const [key, value] of Object.entries(vars)) {
    body = body.replaceAll(`{{${key}}}`, value);
  }
  return body;
}

function scaffoldTaskDocs(
  folderPath: string,
  vars: Record<string, string>,
): { taskMdCreated: boolean; checklistMdCreated: boolean } {
  let taskMdCreated = false;
  let checklistMdCreated = false;

  const taskMd = resolve(folderPath, "TASK.md");
  if (!existsSync(taskMd)) {
    const tpl = resolvePackageAsset("templates/task/TASK.md.tpl");
    if (existsSync(tpl)) {
      writeFileSync(taskMd, renderTemplate(tpl, vars));
      taskMdCreated = true;
    }
  }

  const checklistMd = resolve(folderPath, "CHECKLIST.md");
  if (!existsSync(checklistMd)) {
    const tpl = resolvePackageAsset("templates/task/CHECKLIST.md.tpl");
    if (existsSync(tpl)) {
      writeFileSync(checklistMd, renderTemplate(tpl, vars));
      checklistMdCreated = true;
    }
  }

  return { taskMdCreated, checklistMdCreated };
}

export function cmdCreate(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const title = opts.title as string;
  if (!title) {
    console.error("--title is required");
    process.exit(1);
  }

  const id = `N${String(master.meta.nextId).padStart(2, "0")}`;
  const num = master.meta.nextId;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  const shardFile = getShardFileName(num, config.shardSize);
  ensureShardExists(config, master, shardFile, num);

  const workDir = getWorkDir(config);
  const folder = `${config.workDir}/${id}-${slug}`;
  const folderPath = resolve(workDir, `${id}-${slug}`);

  if (!existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true });
  }

  const task = {
    id,
    title,
    type: (opts.type as string) || "fix",
    priority: (opts.priority as string) || "medium",
    status: "ready",
    folder,
    createdAt: now(),
    statusHistory: [{ status: "ready", at: now(), by: (opts.by as string) || "taskmaster" }],
    implementation: {
      startedAt: null,
      completedAt: null,
      filesChanged: [] as string[],
      tokensUsed: null,
    },
    // reviews + incidents live in per-task side files (created lazily on first mutation).
    changesAfterImplementation: [],
    reviewCount: 0,
    lastReviewVerdict: null,
    openIncidentCount: 0,
    committedAt: null,
    totalDurationMinutes: null,
    tags: opts.tags ? (opts.tags as string).split(",").map((t) => t.trim()) : [],
    pushes: [],
    branch: null,
    mrUrl: null,
    mergedAt: null,
  };

  const shard = loadShard(workDir, shardFile);
  shard.tasks.push(task);
  saveShard(workDir, shardFile, shard);

  master.meta.nextId++;
  master.meta.currentTaskId = id;
  saveMaster(config, master);

  const scaffold = scaffoldTaskDocs(folderPath, {
    ID: id,
    TITLE: title,
    TYPE: task.type,
    PRIORITY: task.priority,
    DATE: now().slice(0, 10),
  });

  console.log(
    JSON.stringify({
      action: "created",
      id,
      folder: task.folder,
      taskMd: scaffold.taskMdCreated ? `${task.folder}/TASK.md` : null,
      checklistMd: scaffold.checklistMdCreated ? `${task.folder}/CHECKLIST.md` : null,
    }),
  );
}
