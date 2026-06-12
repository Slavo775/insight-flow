// N93 — one-shot client cache for the composer registry endpoints. The
// registry is static for a server's lifetime, so both pages share a single
// in-flight/settled promise instead of refetching per navigation.
import { useEffect, useState } from "react";
import { fetchAgents, fetchModules, type AgentDto, type ModulesResponse } from "./api.js";

export interface Registry {
  modules: ModulesResponse["modules"];
  referencedBy: ModulesResponse["referencedBy"];
  agents: AgentDto[];
}

let cached: Promise<Registry> | null = null;

function load(): Promise<Registry> {
  cached ??= Promise.all([fetchModules(), fetchAgents()]).then(([m, agents]) => ({
    modules: m.modules,
    referencedBy: m.referencedBy,
    agents,
  }));
  return cached;
}

/** N106 — drop the cache after a CRUD write so the next mount refetches. */
export function invalidateRegistry(): void {
  cached = null;
}

export function useRegistry(): { registry: Registry | null; error: string | null } {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    load().then(
      (r) => alive && setRegistry(r),
      (e: unknown) => {
        cached = null; // allow retry on next mount
        if (alive) setError(e instanceof Error ? e.message : String(e));
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  return { registry, error };
}
