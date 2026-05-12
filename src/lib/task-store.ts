import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task, TaskDataset } from "@/lib/task-types";
import { SAMPLE_DATASET } from "@/lib/sample-data";

interface TaskStoreState {
  tasks: Task[];
  meta: TaskDataset["meta"] | null;
  loadedAt: string | null;
  source: "sample" | "user";
  dataMode: "fetch" | "upload";
  shardList: string[];
  currentShard: string | null;
  setDataset: (data: TaskDataset, source?: "sample" | "user") => void;
  setShardTasks: (tasks: Task[], meta: TaskDataset["meta"] | null, shardName: string) => void;
  setShardList: (list: string[]) => void;
  setCurrentShard: (shard: string | null) => void;
  setDataMode: (mode: "fetch" | "upload") => void;
  reset: () => void;
}

export const useTaskStore = create<TaskStoreState>()(
  persist(
    (set) => ({
      tasks: SAMPLE_DATASET.tasks,
      meta: SAMPLE_DATASET.meta ?? null,
      loadedAt: new Date().toISOString(),
      source: "sample",
      dataMode: "fetch",
      shardList: [],
      currentShard: null,
      setDataset: (data, source = "user") =>
        set({
          tasks: data.tasks ?? [],
          meta: data.meta ?? null,
          loadedAt: new Date().toISOString(),
          source,
        }),
      setShardTasks: (tasks, meta, shardName) =>
        set({
          tasks,
          meta: meta ?? null,
          loadedAt: new Date().toISOString(),
          source: "user",
          currentShard: shardName,
        }),
      setShardList: (list) => set({ shardList: list }),
      setCurrentShard: (shard) => set({ currentShard: shard }),
      setDataMode: (mode) => set({ dataMode: mode }),
      reset: () =>
        set({
          tasks: SAMPLE_DATASET.tasks,
          meta: SAMPLE_DATASET.meta ?? null,
          loadedAt: new Date().toISOString(),
          source: "sample",
          currentShard: null,
          shardList: [],
        }),
    }),
    { name: "task-viz-store" },
  ),
);
