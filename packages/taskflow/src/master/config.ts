import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { z } from "zod";
import type { MasterServerConfig } from "./types.js";

export const MasterServerConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).optional(),
  standalone: z.boolean().optional(),
  updateCheck: z
    .object({
      enabled: z.boolean().optional(),
      intervalHours: z.number().positive().optional(),
    })
    .optional(),
});

const DEFAULTS: Required<MasterServerConfig> = {
  port: 6100,
  standalone: false,
  updateCheck: { enabled: true, intervalHours: 12 },
};

export function loadMasterConfig(): Required<MasterServerConfig> {
  const configPath = resolve(homedir(), ".insight-flow", "master.json");
  try {
    const raw = JSON.parse(readFileSync(configPath, "utf-8")) as unknown;
    const parsed = MasterServerConfigSchema.safeParse(raw);
    if (!parsed.success) return { ...DEFAULTS };
    return { ...DEFAULTS, ...parsed.data };
  } catch {
    return { ...DEFAULTS };
  }
}
