// N129/N130 — derive the kanban's columns AND per-flow status styling from
// every flow's status set. Mirrors the registry cache (registry.ts): one shared
// in-flight/settled promise of the flow summaries, invalidated on a custom-defs
// write. Until the flows load (and forever in a default-only workspace), the
// canonical 6-column board / canonical styling is the fallback — no flash.
import { useEffect, useMemo, useState } from "react";
import { fetchProjects, type ProjectSummaryDto } from "./api.js";
import { buildColumns, COLUMNS, type Column, type FlowStatus } from "./lib.js";

let cached: Promise<ProjectSummaryDto[]> | null = null;

function load(): Promise<ProjectSummaryDto[]> {
  cached ??= fetchProjects();
  return cached;
}

/** Drop the cache after a flow CRUD write so the next mount refetches. */
export function invalidateFlows(): void {
  cached = null;
}

function useFlows(): ProjectSummaryDto[] | null {
  const [flows, setFlows] = useState<ProjectSummaryDto[] | null>(null);
  useEffect(() => {
    let alive = true;
    load().then(
      (f) => alive && setFlows(f),
      () => {
        cached = null; // allow retry on next mount; keep canonical fallback
      },
    );
    return () => {
      alive = false;
    };
  }, []);
  return flows;
}

/** N129 — kanban columns from the union of flow statuses (canonical fallback). */
export function useFlowColumns(): Column[] {
  const flows = useFlows();
  return useMemo(() => (flows ? buildColumns(flows) : COLUMNS), [flows]);
}

/** N130 — flowId → its status set, for per-flow badge/label/color resolution. */
export function useFlowStatusMap(): Record<string, FlowStatus[]> {
  const flows = useFlows();
  return useMemo(() => {
    const map: Record<string, FlowStatus[]> = {};
    for (const f of flows ?? []) if (f.statuses?.length) map[f.id] = f.statuses;
    return map;
  }, [flows]);
}
