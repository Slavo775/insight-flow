import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import type { MasterFile, TaskflowConfig, ParsedArgs } from "../../core/types.js";
import { jsonFileStorage } from "../../core/storage-port.js";
import { getWorkDir, now } from "../../core/storage.js";
import { resolveProjectRoot } from "../../core/paths.js";
import { resolvePackageAsset } from "../../core/paths.js";
import { renderTemplate } from "../../core/spec.js";
import { mergedChains, mergedProjects } from "../../agents/user-registry.js";
import type { Chain } from "../../core/schema/index.js";

/**
 * N116/N123 — resolve the flow a new task binds to. Precedence: explicit
 * `--flow` > `--agent` (the flow whose `entryAgents` includes it, N122/N123) >
 * `flows.byType[<type>]` > `flows.defaultFlow`. An unknown/missing flow falls
 * back to "default" non-fatally. An `--agent` that owns no flow, or more than
 * one, is a hard error (the latter requires `--flow` to disambiguate).
 */
function resolveFlowId(
  config: TaskflowConfig,
  type: string,
  explicit?: string,
  agent?: string,
  softAgent?: string,
): string {
  const flows = config.flows ?? { defaultFlow: "default", byType: {} };
  let projects: Record<string, { entryAgents?: string[] }>;
  try {
    projects = mergedProjects();
  } catch {
    projects = { default: {} }; // malformed user space — only the shipped flow is safe
  }
  const known = new Set(Object.keys(projects));

  // N123 — a main/entry agent identifies its flow.
  let byAgent: string | undefined;
  if (!explicit && agent) {
    const owning = Object.entries(projects)
      .filter(([, p]) => (p.entryAgents ?? []).includes(agent))
      .map(([id]) => id);
    if (owning.length === 0) {
      console.error(`Agent "${agent}" is not a main agent of any flow — pass --flow to bind one.`);
      process.exit(1);
    }
    if (owning.length > 1) {
      console.error(
        `Agent "${agent}" is a main agent of multiple flows (${owning.join(", ")}) — pass --flow.`,
      );
      process.exit(1);
    }
    byAgent = owning[0];
  }

  // N173 — a `--by <id>` that is also a flow's entry agent binds the flow too
  // (lenient: a `--by` that isn't an entry agent is just attribution and is
  // ignored here). This lets a custom flow's main agent bind by passing the same
  // identity it stamps on every lifecycle command, without a separate `--agent`.
  let bySoft: string | undefined;
  if (!explicit && !byAgent && softAgent) {
    const owning = Object.entries(projects)
      .filter(([, p]) => (p.entryAgents ?? []).includes(softAgent))
      .map(([id]) => id);
    if (owning.length === 1) bySoft = owning[0];
  }

  const requested =
    explicit ?? byAgent ?? bySoft ?? flows.byType[type] ?? flows.defaultFlow ?? "default";
  if (!known.has(requested)) {
    console.error(`Flow "${requested}" not found — binding to "default" instead.`);
    return "default";
  }
  return requested;
}

function scaffoldTaskDocs(
  folderPath: string,
  vars: Record<string, string>,
  options: { withAnalysis?: boolean } = {},
): { taskMdCreated: boolean; checklistMdCreated: boolean; analysisMdCreated: boolean } {
  let taskMdCreated = false;
  let checklistMdCreated = false;
  let analysisMdCreated = false;

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

  if (options.withAnalysis) {
    const analysisMd = resolve(folderPath, "ANALYSIS.md");
    if (!existsSync(analysisMd)) {
      const tpl = resolvePackageAsset("templates/task/ANALYSIS.md.tpl");
      if (existsSync(tpl)) {
        writeFileSync(analysisMd, renderTemplate(tpl, vars));
        analysisMdCreated = true;
      }
    }
  }

  return { taskMdCreated, checklistMdCreated, analysisMdCreated };
}

/** N267 — the `--chain` a new task binds to; exits on a bad chain or a `--flow` outside it. */
function resolveChain(chainId: string, flow?: string): Chain {
  let chain: Chain | undefined;
  try {
    chain = mergedChains()[chainId];
  } catch (err) {
    console.error(`Cannot load chains: ${(err as Error).message}`);
    process.exit(1);
  }
  if (!chain) {
    console.error(`Chain "${chainId}" not found.`);
    process.exit(1);
  }
  if (flow && !chain.flows.includes(flow)) {
    console.error(`Flow "${flow}" is not part of chain "${chainId}" (${chain.flows.join(", ")}).`);
    process.exit(1);
  }
  return chain;
}

export function cmdCreate(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const title = opts.title as string;
  if (!title) {
    console.error("--title is required");
    process.exit(1);
  }
  // Resolved before anything is written so a bad --chain leaves no folder behind.
  const chain = opts.chain ? resolveChain(opts.chain as string, opts.flow as string) : undefined;

  const id = `N${String(master.meta.nextId).padStart(2, "0")}`;
  const num = master.meta.nextId;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  const shardFile = jsonFileStorage.getShardFileName(num, config.shardSize);
  jsonFileStorage.ensureShardExists(config, master, shardFile, num);

  const workDir = getWorkDir(config);
  const folderPath = resolve(workDir, `${id}-${slug}`);
  // Stored relative to the project root; reflects the live layout (N101) —
  // "insightFlow/workTasks/Nxx-slug" on migrated projects, "<workDir>/Nxx-slug" legacy.
  const folder = relative(resolveProjectRoot(), folderPath).split("\\").join("/");

  if (!existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true });
  }

  const taskType = (opts.type as string) || "fix";
  const flowId = resolveFlowId(
    config,
    taskType,
    // N267 — a chained task starts in the chain's entry flow unless --flow picks another.
    (opts.flow as string | undefined) ?? chain?.flows[0],
    opts.agent as string | undefined,
    opts.by as string | undefined,
  );

  const task = {
    id,
    title,
    type: taskType,
    priority: (opts.priority as string) || "medium",
    status: "ready",
    flowId,
    ...(chain ? { chainId: chain.id } : {}),
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

  const shard = jsonFileStorage.loadShard(workDir, shardFile);
  shard.tasks.push(task);
  jsonFileStorage.saveShard(workDir, shardFile, shard);

  master.meta.nextId++;
  master.meta.currentTaskId = id;
  jsonFileStorage.saveMaster(config, master);

  const withAnalysis = opts["with-analysis"] === true || opts.withAnalysis === true;

  const scaffold = scaffoldTaskDocs(
    folderPath,
    {
      ID: id,
      TITLE: title,
      TYPE: task.type,
      PRIORITY: task.priority,
      DATE: now().slice(0, 10),
    },
    { withAnalysis },
  );

  console.log(
    JSON.stringify({
      action: "created",
      id,
      flowId,
      ...(chain ? { chainId: chain.id } : {}),
      folder: task.folder,
      taskMd: scaffold.taskMdCreated ? `${task.folder}/TASK.md` : null,
      checklistMd: scaffold.checklistMdCreated ? `${task.folder}/CHECKLIST.md` : null,
      analysisMd: scaffold.analysisMdCreated ? `${task.folder}/ANALYSIS.md` : null,
    }),
  );
}
