import { mkdirSync, writeFileSync, readFileSync, existsSync, cpSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { TaskflowConfig } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function initProject(cwd: string = process.cwd()): void {
  const configPath = resolve(cwd, "taskflow.config.json");

  // 1. Write config
  const config: TaskflowConfig = {
    workDir: "workTasks",
    shardSize: 10,
    projectName: inferName(cwd),
    rolesDir: ".claude/roles",
    server: { port: 6006 },
  };

  if (existsSync(configPath)) {
    console.log("taskflow.config.json already exists, skipping config creation.");
  } else {
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    console.log("Created taskflow.config.json");
  }

  // 2. Create workTasks dir + master.json
  const workDir = resolve(cwd, config.workDir);
  if (!existsSync(workDir)) {
    mkdirSync(workDir, { recursive: true });
    console.log(`Created ${config.workDir}/`);
  }

  const masterPath = resolve(workDir, "master.json");
  if (!existsSync(masterPath)) {
    const master = {
      meta: {
        nextId: 0,
        currentTaskId: null,
        nextIncidentId: 1,
        shards: ["tasks-N00-N09.json"],
      },
    };
    writeFileSync(masterPath, JSON.stringify(master, null, 2) + "\n");

    const shard = { range: { from: 0, to: 9 }, tasks: [] as unknown[] };
    writeFileSync(resolve(workDir, "tasks-N00-N09.json"), JSON.stringify(shard, null, 2) + "\n");
    console.log("Created master.json + initial shard");
  }

  // 3. Copy role templates
  const rolesDir = resolve(cwd, config.rolesDir);
  const templateRolesDir = resolve(__dirname, "..", "templates", "roles");

  if (existsSync(templateRolesDir)) {
    if (!existsSync(rolesDir)) {
      mkdirSync(rolesDir, { recursive: true });
    }
    try {
      cpSync(templateRolesDir, rolesDir, { recursive: true, force: false });
      console.log(`Copied role templates to ${config.rolesDir}/`);
    } catch {
      console.log("Role templates already exist, skipping.");
    }
  }

  console.log("\nTaskflow initialized! Run 'taskflow create --title \"My task\" --type feat' to create your first task.");
  console.log("Run 'taskflow' to launch the dashboard.\n");
}

function inferName(cwd: string): string {
  try {
    const pkgPath = resolve(cwd, "package.json");
    if (existsSync(pkgPath)) {
      const { name } = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (name) return name;
    }
  } catch {
    // ignore
  }
  return resolve(cwd).split("/").pop() || "project";
}
