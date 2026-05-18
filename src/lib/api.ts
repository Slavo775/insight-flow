import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

declare global {
  interface Window {
    __TASKFLOW_CONFIG__?: {
      apiBase?: string;
      projectName?: string;
      activityEngine?: { enabled?: boolean };
    };
  }
}

function resolveApiBase(): string {
  if (typeof window !== "undefined") {
    const runtime = window.__TASKFLOW_CONFIG__?.apiBase;
    if (typeof runtime === "string") return runtime;
  }
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (typeof envBase === "string" && envBase.length > 0) return envBase;
  return "";
}

export const API_BASE_URL = resolveApiBase();

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

/**
 * Subscribe to the taskflow server WebSocket and invalidate shard queries
 * whenever the server broadcasts a file-change event. No-op outside the
 * bundled SPA (i.e., when API_BASE_URL points at a different origin and
 * window.location is not the taskflow server).
 */
export function useTaskflowLiveSync(enabled = true) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // Same-origin SPA: API_BASE_URL is "" and window.location is the server.
    // Cross-origin (dev mode hitting a remote API) is not supported here.
    if (API_BASE_URL !== "") return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { type?: string };
          if (msg.type === "file-change") {
            qc.invalidateQueries({ queryKey: ["shard-index"] });
            qc.invalidateQueries({ queryKey: ["shard-data"] });
            qc.invalidateQueries({ queryKey: ["master-data"] });
          }
        } catch {
          // ignore malformed
        }
      };

      ws.onclose = () => {
        if (stopped) return;
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [enabled, qc]);
}
