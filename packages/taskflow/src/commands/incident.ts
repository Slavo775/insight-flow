import type { MasterFile, TaskflowConfig, ParsedArgs } from "../types.js";
import { loadTaskById, loadAllTasks, saveShard, saveMaster, getWorkDir, now, resolveId } from "../storage.js";

export function cmdIncidentCreate(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = loadTaskById(config, master, id);

  if (!opts.title) {
    console.error("--title is required");
    process.exit(1);
  }

  if (!task.incidents) task.incidents = [];

  const incId = `INC-${String(master.meta.nextIncidentId || 1).padStart(3, "0")}`;
  const slug = (opts.title as string)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  task.incidents.push({
    id: incId,
    title: opts.title as string,
    severity: (opts.severity as string) || "high",
    status: "reported",
    reportedAt: now(),
    resolvedAt: null,
    branch: `fix/incident/${id}-${slug}`,
    description: (opts.description as string) || null,
    rootCause: null,
    fix: null,
    statusHistory: [{ status: "reported", at: now(), by: (opts.by as string) || "task-incident" }],
  });

  saveShard(getWorkDir(config), shardFile, shard);
  master.meta.nextIncidentId = (master.meta.nextIncidentId || 1) + 1;
  saveMaster(config, master);

  console.log(
    JSON.stringify({
      action: "incident-created",
      taskId: id,
      incidentId: incId,
      branch: task.incidents[task.incidents.length - 1].branch,
      severity: task.incidents[task.incidents.length - 1].severity,
    }, null, 2),
  );
}

export function cmdIncidentStatus(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = loadTaskById(config, master, id);

  if (!opts.incident) {
    console.error("--incident is required (e.g., INC-001)");
    process.exit(1);
  }
  if (!opts.status) {
    console.error("--status is required");
    process.exit(1);
  }

  const incident = (task.incidents || []).find((inc) => inc.id === opts.incident);
  if (!incident) {
    console.error(`Incident ${opts.incident} not found on task ${id}`);
    process.exit(1);
  }

  incident.status = opts.status as string;
  incident.statusHistory.push({ status: opts.status as string, at: now(), by: (opts.by as string) || "task-incident" });

  saveShard(getWorkDir(config), shardFile, shard);
  console.log(JSON.stringify({ action: "incident-status-updated", taskId: id, incidentId: opts.incident, status: opts.status }, null, 2));
}

export function cmdIncidentResolve(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = loadTaskById(config, master, id);

  if (!opts.incident) {
    console.error("--incident is required (e.g., INC-001)");
    process.exit(1);
  }

  const incident = (task.incidents || []).find((inc) => inc.id === opts.incident);
  if (!incident) {
    console.error(`Incident ${opts.incident} not found on task ${id}`);
    process.exit(1);
  }

  incident.status = "fixed";
  incident.resolvedAt = now();
  incident.rootCause = (opts.rootCause as string) || null;
  incident.fix = (opts.fix as string) || null;
  incident.statusHistory.push({ status: "fixed", at: now(), by: (opts.by as string) || "task-incident" });

  saveShard(getWorkDir(config), shardFile, shard);
  console.log(
    JSON.stringify({
      action: "incident-resolved",
      taskId: id,
      incidentId: opts.incident,
      rootCause: incident.rootCause,
    }, null, 2),
  );
}

export function cmdIncidentList(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const tasks = opts.id ? [loadTaskById(config, master, opts.id as string).task] : loadAllTasks(config, master);

  const incidents: Array<Record<string, unknown>> = [];
  for (const task of tasks) {
    for (const inc of task.incidents || []) {
      incidents.push({ taskId: task.id, taskTitle: task.title, ...inc });
    }
  }

  if (incidents.length === 0) {
    console.log(JSON.stringify({ incidents: [], message: "No incidents found." }));
    return;
  }

  console.log(JSON.stringify({ incidents }, null, 2));
}
