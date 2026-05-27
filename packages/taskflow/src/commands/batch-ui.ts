import { existsSync, readFileSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { createServer } from "node:net";
import { spawn, exec } from "node:child_process";
import type { ParsedArgs } from "../types.js";
import {
  readBatchUiRegistry,
  writeBatchUiRegistry,
  readBatchUiLastSelected,
  writeBatchUiLastSelected,
  readBatchUiRunningPids,
  writeBatchUiRunningPids,
} from "../global-config.js";
import type { BatchUiEntry, BatchUiRunningProcess } from "../types.js";

// ── helpers ─────────────────────────────────────────────────────────────────

function findFreePort(from: number, claimed: Set<number> = new Set()): Promise<number> {
  if (claimed.has(from)) return findFreePort(from + 1, claimed);
  return new Promise((res, rej) => {
    const srv = createServer();
    srv.listen(from, "127.0.0.1", () => {
      const port = (srv.address() as { port: number }).port;
      srv.close(() => res(port));
    });
    srv.on("error", () => {
      process.stderr.write(`(port ${from} was occupied, skipped)\n`);
      findFreePort(from + 1, claimed).then(res, rej);
    });
  });
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

function openUrl(url: string): void {
  let cmd: string;
  if (process.platform === "darwin") cmd = `open "${url}"`;
  else if (process.platform === "win32") cmd = `start "" "${url}"`;
  else cmd = `xdg-open "${url}"`;
  exec(cmd);
}

// ── interactive multi-select ─────────────────────────────────────────────────

function renderLines(
  entries: BatchUiEntry[],
  selected: Set<number>,
  cursor: number,
): string[] {
  return [
    "Select projects to launch (↑↓ navigate, space toggle, enter confirm):",
    "",
    ...entries.map((e, i) => {
      const check = selected.has(i) ? "x" : " ";
      const ptr = i === cursor ? ">" : " ";
      return `  ${ptr} [${check}] ${e.label}`;
    }),
    "",
    `  ${selected.size} of ${entries.length} selected`,
  ];
}

function interactiveSelect(
  entries: BatchUiEntry[],
  lastSelected: string[],
): Promise<BatchUiEntry[]> {
  const selected = new Set<number>(
    entries.reduce<number[]>((acc, e, i) => {
      if (lastSelected.includes(e.label)) acc.push(i);
      return acc;
    }, []),
  );
  let cursor = 0;
  let linesPrinted = 0;

  function paint(): void {
    const lines = renderLines(entries, selected, cursor);
    if (linesPrinted > 0) {
      process.stdout.write(`\x1b[${linesPrinted}A`);
    }
    for (const line of lines) {
      process.stdout.write(`\r\x1b[2K${line}\n`);
    }
    linesPrinted = lines.length;
  }

  paint();

  return new Promise((resolve) => {
    const onData = (data: Buffer): void => {
      const key = data.toString();
      if (key === "\x03") {
        cleanup();
        process.exit(0);
      } else if (key === "\x1b[A" && cursor > 0) {
        cursor--;
        paint();
      } else if (key === "\x1b[B" && cursor < entries.length - 1) {
        cursor++;
        paint();
      } else if (key === " ") {
        if (selected.has(cursor)) selected.delete(cursor);
        else selected.add(cursor);
        paint();
      } else if (key === "\r" || key === "\n") {
        cleanup();
        resolve(entries.filter((_, i) => selected.has(i)));
      }
    };

    function cleanup(): void {
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

// ── commands ─────────────────────────────────────────────────────────────────

export function cmdBatchUiAdd(opts: ParsedArgs): void {
  const label = (opts.add as string).trim();
  const rawPath = (opts._ as string[])[0];
  if (!rawPath) {
    console.error("Usage: insight-flow batch-ui --add \"<label>\" <path>");
    process.exit(1);
  }
  const absPath = resolve(rawPath);
  if (!existsSync(absPath)) {
    console.error(`Error: Path does not exist: ${absPath}`);
    process.exit(1);
  }
  const entries = readBatchUiRegistry();
  if (entries.some((e) => e.path === absPath)) {
    console.log(`Already registered as "${entries.find((e) => e.path === absPath)!.label}" → ${absPath}`);
    return;
  }
  entries.push({ label, path: absPath });
  writeBatchUiRegistry(entries);
  console.log(`Registered "${label}" → ${absPath}`);
}

export function cmdBatchUiList(): void {
  const entries = readBatchUiRegistry();
  if (entries.length === 0) {
    console.log("No projects registered. Run `insight-flow ui-batch-register` inside a project folder.");
    return;
  }
  console.log(`\n  Registered batch-ui projects (${entries.length}):\n`);
  for (const e of entries) {
    const configPath = join(e.path, "taskflow.config.json");
    let projectName = "(no config)";
    let workDir = "";
    if (existsSync(configPath)) {
      try {
        const cfg = JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
        const pn = cfg.projectName ?? cfg.name;
        projectName = typeof pn === "string" && pn.trim() ? pn.trim() : "(unnamed)";
        workDir = typeof cfg.workDir === "string" && cfg.workDir.trim() ? cfg.workDir.trim() : "";
      } catch {
        projectName = "(invalid config)";
      }
    }
    const meta = workDir ? `${projectName} / workDir: ${workDir}` : projectName;
    console.log(`  • ${e.label.padEnd(24)} ${e.path}`);
    console.log(`    ${"".padEnd(24)} config: ${meta}`);
  }
  console.log("");
}

export async function cmdBatchUi(opts: ParsedArgs): Promise<void> {
  const entries = readBatchUiRegistry();
  if (entries.length === 0) {
    console.log("No projects registered.");
    console.log("Run `insight-flow ui-batch-register` inside each project folder, then retry.");
    return;
  }

  let chosen: BatchUiEntry[];
  const isTTY = Boolean(process.stdin.isTTY);

  if (!isTTY) {
    chosen = entries;
    console.log(`Non-interactive mode — launching all ${entries.length} project(s).`);
  } else {
    chosen = await interactiveSelect(entries, readBatchUiLastSelected());
    process.stdout.write("\n");
  }

  if (chosen.length === 0) {
    console.log("No projects selected.");
    return;
  }

  writeBatchUiLastSelected(chosen.map((e) => e.label));

  const shouldOpen = !opts["no-open"];
  const bin = process.platform === "win32" ? "insight-flow.cmd" : "insight-flow";
  const urls: string[] = [];
  const newlySpawned: BatchUiRunningProcess[] = [];
  const surviving: BatchUiRunningProcess[] = [];

  // Build lookup of already-tracked running processes by label
  const existingPids = readBatchUiRunningPids();
  const runningByLabel = new Map(existingPids.map((p) => [p.label, p]));

  const claimedPorts = new Set<number>();
  let port = 6007;

  for (const entry of chosen) {
    // Check if this project's server is already alive
    const existing = runningByLabel.get(entry.label);
    if (existing && isProcessAlive(existing.pid)) {
      console.log(`  [${entry.label}] server on port ${existing.port} already running, skipped`);
      surviving.push(existing);
      continue;
    }

    port = await findFreePort(port, claimedPorts);
    claimedPorts.add(port);
    const url = `http://localhost:${port}`;
    urls.push(url);

    const child = spawn(bin, ["ui", "--port", String(port)], {
      cwd: entry.path,
      detached: true,
      stdio: "ignore",
    });
    if (child.pid !== undefined) {
      newlySpawned.push({ label: entry.label, pid: child.pid, port });
    }
    child.unref();

    console.log(`  [${entry.label}] ${url}`);
    port++;
  }

  // Preserve surviving processes alongside newly spawned ones
  writeBatchUiRunningPids([...surviving, ...newlySpawned]);

  if (shouldOpen && urls.length > 0) {
    setTimeout(() => {
      for (const url of urls) openUrl(url);
    }, 1500);
  }
}

export function cmdBatchUiRemove(opts: ParsedArgs): void {
  const label = typeof opts.remove === "string" ? opts.remove.trim() : "";
  if (!label) {
    console.error("Usage: insight-flow batch-ui --remove \"<label>\"");
    process.exit(1);
  }
  const entries = readBatchUiRegistry();
  const idx = entries.findIndex((e) => e.label === label);
  if (idx === -1) {
    console.error(`No project registered with label "${label}". Run \`insight-flow batch-ui --list\` to see registered projects.`);
    process.exit(1);
  }
  const removed = entries.splice(idx, 1)[0];
  writeBatchUiRegistry(entries);
  // also clean from lastSelected
  const last = readBatchUiLastSelected().filter((l) => l !== label);
  writeBatchUiLastSelected(last);
  console.log(`Unregistered "${removed.label}" → ${removed.path}`);
}

export function cmdUiBatchUnregister(): void {
  const cwd = process.cwd();
  const entries = readBatchUiRegistry();
  const idx = entries.findIndex((e) => e.path === cwd);
  if (idx === -1) {
    console.error(`${cwd} is not registered. Run \`insight-flow batch-ui --list\` to see registered projects.`);
    process.exit(1);
  }
  const removed = entries.splice(idx, 1)[0];
  writeBatchUiRegistry(entries);
  const last = readBatchUiLastSelected().filter((l) => l !== removed.label);
  writeBatchUiLastSelected(last);
  console.log(`Unregistered "${removed.label}" → ${cwd}`);
}

export function cmdUiBatchRegister(): void {
  const cwd = process.cwd();
  const configPath = join(cwd, "taskflow.config.json");

  // a) locate config
  if (!existsSync(configPath)) {
    console.error(`Error: No taskflow.config.json found in ${cwd}.`);
    console.error("This folder is not an insight-flow project.");
    console.error("Run `insight-flow init` to initialise one, or cd into a project folder first.");
    process.exit(1);
  }

  // b) parse config
  let config: Record<string, unknown>;
  try {
    const raw = JSON.parse(readFileSync(configPath, "utf-8")) as unknown;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      console.error(`Error: taskflow.config.json in ${cwd} is not a JSON object.`);
      console.error("Expected { ... } at top level.");
      process.exit(1);
    }
    config = raw as Record<string, unknown>;
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error(`Error: taskflow.config.json in ${cwd} contains invalid JSON.`);
      console.error(err.message);
      console.error("Fix the file and retry.");
      process.exit(1);
    }
    throw err;
  }

  // c) resolve label
  const nameField = typeof config.name === "string" ? config.name.trim() : "";
  const projectNameField = typeof config.projectName === "string" ? config.projectName.trim() : "";
  const label = nameField || projectNameField || basename(cwd);

  // d) skip duplicate
  const entries = readBatchUiRegistry();
  const existing = entries.find((e) => e.path === cwd);
  if (existing) {
    console.log(`Already registered as "${existing.label}" → ${cwd}`);
    console.log("Nothing to do.");
    return;
  }

  // e) append + write
  entries.push({ label, path: cwd });
  writeBatchUiRegistry(entries);

  // f) confirm
  console.log(`Registered "${label}" → ${cwd}`);
  console.log("Run `insight-flow batch-ui` to launch all registered projects.");
}

export function cmdUiBatchDown(): void {
  const running = readBatchUiRunningPids();
  if (running.length === 0) {
    console.log("No batch-ui servers are currently tracked.");
    console.log("Run `insight-flow batch-ui` to start them.");
    return;
  }

  const stopped: string[] = [];
  const alreadyGone: string[] = [];
  const failed: string[] = [];

  for (const entry of running) {
    try {
      process.kill(entry.pid, "SIGTERM");
      stopped.push(`  [${entry.label}] PID ${entry.pid} (port ${entry.port}) — stopped`);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ESRCH") {
        alreadyGone.push(`  [${entry.label}] PID ${entry.pid} — already stopped`);
      } else {
        failed.push(`  [${entry.label}] PID ${entry.pid} — error: ${(err as Error).message}`);
      }
    }
  }

  for (const s of stopped) console.log(s);
  for (const s of alreadyGone) console.log(s);
  for (const s of failed) console.error(s);

  writeBatchUiRunningPids([]);

  if (failed.length > 0) {
    console.error(`\n${failed.length} server(s) could not be stopped.`);
    process.exit(1);
  }

  console.log(`\n${stopped.length + alreadyGone.length} server(s) stopped.`);
  console.log("Run `insight-flow batch-ui` to start them again.");
}
