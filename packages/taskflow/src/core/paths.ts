import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export class TaskflowProjectNotFoundError extends Error {
  constructor(searchedFrom: string) {
    super(
      `no insight-flow project found (searched upward from ${searchedFrom}). ` +
        `Run 'insight-flow init' to create one.`,
    );
    this.name = "TaskflowProjectNotFoundError";
  }
}

const CONFIG_FILENAME = "taskflow.config.json";
const DEFAULT_WORK_DIR = "workTasks";
const MASTER_FILENAME = "master.json";

let cachedProjectRoot: string | null = null;

export function resolveProjectRoot(start: string = process.cwd()): string {
  if (cachedProjectRoot && start === process.cwd()) {
    return cachedProjectRoot;
  }

  let dir = resolve(start);
  while (true) {
    if (
      existsSync(resolve(dir, CONFIG_FILENAME)) ||
      existsSync(resolve(dir, DEFAULT_WORK_DIR, MASTER_FILENAME))
    ) {
      if (start === process.cwd()) cachedProjectRoot = dir;
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new TaskflowProjectNotFoundError(start);
    }
    dir = parent;
  }
}

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function resolvePackageAsset(relPath: string): string {
  return resolve(PACKAGE_ROOT, relPath);
}
