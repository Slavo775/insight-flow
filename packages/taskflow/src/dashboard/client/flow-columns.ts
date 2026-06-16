// N129 — derive the kanban's columns from every flow's status set. Mirrors the
// registry cache (registry.ts): one shared in-flight/settled promise so the
// board doesn't refetch on each shard nav, invalidated on a custom-defs write.
// Until the flows load (and forever in a default-only workspace), the canonical
// 6-column board is the fallback, so there's no layout flash.
import { useEffect, useState } from "react";
import { fetchProjects } from "./api.js";
import { buildColumns, COLUMNS, type Column } from "./lib.js";

let cached: Promise<Column[]> | null = null;

function load(): Promise<Column[]> {
  cached ??= fetchProjects().then((projects) => buildColumns(projects));
  return cached;
}

/** Drop the cache after a flow CRUD write so the next mount rebuilds columns. */
export function invalidateFlowColumns(): void {
  cached = null;
}

export function useFlowColumns(): Column[] {
  const [columns, setColumns] = useState<Column[]>(COLUMNS);
  useEffect(() => {
    let alive = true;
    load().then(
      (cols) => alive && setColumns(cols),
      () => {
        cached = null; // allow retry on next mount; keep canonical fallback
      },
    );
    return () => {
      alive = false;
    };
  }, []);
  return columns;
}
