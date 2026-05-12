import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task, TaskDataset } from "@/lib/task-types";
import { SAMPLE_DATASET } from "@/lib/sample-data";

interface TaskStoreState {
  tasks: Task[];
  meta: TaskDataset["meta"] | null;
  loadedAt: string | null;
  source: "sample" | "user";
  setDataset: (data: TaskDataset, source?: "sample" | "user") => void;
  reset: () => void;
}

export const useTaskStore = create<TaskStoreState>()(
  persist(
    (set) => ({
      tasks: SAMPLE_DATASET.tasks,
      meta: SAMPLE_DATASET.meta ?? null,
      loadedAt: new Date().toISOString(),
      source: "sample",
      setDataset: (data, source = "user") =>
        set({
          tasks: data.tasks ?? [],
          meta: data.meta ?? null,
          loadedAt: new Date().toISOString(),
          source,
        }),
      reset: () =>
        set({
          tasks: SAMPLE_DATASET.tasks,
          meta: SAMPLE_DATASET.meta ?? null,
          loadedAt: new Date().toISOString(),
          source: "sample",
        }),
    }),
    { name: "task-viz-store" },
  ),
);
