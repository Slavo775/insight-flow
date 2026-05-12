import { useQuery } from "@tanstack/react-query";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3033";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/** Fetch the shard index, sorted descending (highest shard first). */
export function useShardIndex(enabled: boolean) {
  return useQuery({
    queryKey: ["shard-index"],
    queryFn: () => fetchJson<string[]>("/api/work-tasks"),
    enabled,
    select: (files) => {
      const shards = files.filter((f) => f.startsWith("tasks-"));
      shards.sort((a, b) => b.localeCompare(a));
      return shards;
    },
  });
}

/** Fetch a single shard (or master.json) by filename. */
export function useShardData(filename: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["shard-data", filename],
    queryFn: () => fetchJson<unknown>(`/api/work-tasks/${filename}`),
    enabled: enabled && !!filename,
  });
}

/** Fetch master.json for metadata. */
export function useMasterData(enabled: boolean) {
  return useQuery({
    queryKey: ["master-data"],
    queryFn: () => fetchJson<unknown>("/api/work-tasks/master.json"),
    enabled,
  });
}
