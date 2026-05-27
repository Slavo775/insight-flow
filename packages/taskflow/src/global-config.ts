import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { BatchUiEntry, BatchUiRegistry } from "./types.js";

export function getGlobalConfigDir(): string {
  return join(homedir(), ".insight-flow");
}

function getRegistryPath(): string {
  return join(getGlobalConfigDir(), "batch-ui.json");
}

function readRaw(): BatchUiRegistry {
  const p = getRegistryPath();
  if (!existsSync(p)) return { entries: [], lastSelected: [] };
  try {
    const parsed = JSON.parse(readFileSync(p, "utf-8")) as Partial<BatchUiRegistry>;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      lastSelected: Array.isArray(parsed.lastSelected) ? parsed.lastSelected : [],
    };
  } catch {
    return { entries: [], lastSelected: [] };
  }
}

function writeRaw(reg: BatchUiRegistry): void {
  mkdirSync(getGlobalConfigDir(), { recursive: true });
  writeFileSync(getRegistryPath(), JSON.stringify(reg, null, 2), "utf-8");
}

export function readBatchUiRegistry(): BatchUiEntry[] {
  return readRaw().entries;
}

export function writeBatchUiRegistry(entries: BatchUiEntry[]): void {
  const reg = readRaw();
  reg.entries = entries;
  writeRaw(reg);
}

export function readBatchUiLastSelected(): string[] {
  return readRaw().lastSelected;
}

export function writeBatchUiLastSelected(labels: string[]): void {
  const reg = readRaw();
  reg.lastSelected = labels;
  writeRaw(reg);
}
