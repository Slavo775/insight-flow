import { useRef } from "react";
import { Upload, RotateCcw, Database, FileStack } from "lucide-react";
import { useTaskStore } from "@/lib/task-store";
import type { Task, TaskDataset } from "@/lib/task-types";
import { toast } from "sonner";

/**
 * Accepts any combination of:
 *  - master.json   { meta: { nextId, shards: [...] } }
 *  - shard files   { range, tasks: [...] }
 *  - flat dataset  { tasks: [...] }
 * Merges all tasks from all files; later wins on duplicate id.
 */
function mergeFiles(parsed: unknown[]): TaskDataset {
  const taskMap = new Map<string, Task>();
  let meta: TaskDataset["meta"] | undefined;
  for (const json of parsed) {
    if (!json || typeof json !== "object") continue;
    const j = json as Record<string, unknown>;
    if (Array.isArray(j.tasks)) {
      for (const t of j.tasks as Task[]) taskMap.set(t.id, t);
    }
    if (j.meta && typeof j.meta === "object") {
      meta = { ...(meta ?? { nextId: 0 }), ...(j.meta as TaskDataset["meta"]) };
    }
  }
  const tasks = [...taskMap.values()].sort((a, b) => a.id.localeCompare(b.id));
  return { meta, tasks };
}

export function DataLoader() {
  const { setDataset, reset, source, tasks } = useTaskStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    try {
      const arr = Array.from(files);
      const parsed = await Promise.all(
        arr.map(async (f) => {
          const text = await f.text();
          return JSON.parse(text);
        }),
      );
      const merged = mergeFiles(parsed);
      if (merged.tasks.length === 0)
        throw new Error("No tasks found across uploaded files");
      setDataset(merged, "user");
      toast.success(
        `Loaded ${merged.tasks.length} tasks from ${arr.length} file${arr.length > 1 ? "s" : ""}`,
      );
    } catch (e) {
      toast.error(`Failed to load: ${(e as Error).message}`);
    }
  };

  const handlePaste = async () => {
    const text = prompt("Paste task JSON (master.json, a shard, or a {tasks:[]} blob):");
    if (!text) return;
    try {
      const json = JSON.parse(text);
      const merged = mergeFiles([json]);
      if (merged.tasks.length === 0)
        throw new Error("Pasted JSON contained no tasks (paste a shard or {tasks:[]})");
      setDataset(merged, "user");
      toast.success(`Loaded ${merged.tasks.length} tasks`);
    } catch (e) {
      toast.error(`Invalid JSON: ${(e as Error).message}`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[11px] text-muted-foreground">
        {tasks.length} tasks · {source === "sample" ? "sample data" : "user data"}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] text-foreground transition hover:bg-accent"
        title="Upload master.json + all shard files together"
      >
        <FileStack className="h-3 w-3" /> Upload JSON files
      </button>
      <button
        onClick={handlePaste}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] text-foreground transition hover:bg-accent"
      >
        <Database className="h-3 w-3" /> Paste
      </button>
      <button
        onClick={reset}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground transition hover:bg-accent"
      >
        <RotateCcw className="h-3 w-3" /> Reset
      </button>
      <span className="hidden lg:inline font-mono text-[10px] text-muted-foreground">
        <Upload className="inline h-3 w-3" /> tip: select master.json + every tasks-NXX-NYY.json
      </span>
    </div>
  );
}
