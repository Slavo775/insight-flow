import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const LOCK_DIR = resolve(homedir(), ".insight-flow");
export const LOCK_PATH = resolve(LOCK_DIR, "master.lock");

export interface LockData {
  pid: number;
  port: number;
  startedAt: string;
}

export function readMasterLock(): LockData | null {
  try {
    return JSON.parse(readFileSync(LOCK_PATH, "utf-8")) as LockData;
  } catch {
    return null;
  }
}

export function writeMasterLock(pid: number, port: number): void {
  mkdirSync(LOCK_DIR, { recursive: true });
  writeFileSync(
    LOCK_PATH,
    JSON.stringify({ pid, port, startedAt: new Date().toISOString() }, null, 2),
  );
}

export function clearMasterLock(): void {
  try {
    unlinkSync(LOCK_PATH);
  } catch {
    // ignore
  }
}

export function checkMasterPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
