import { useEffect, useRef } from "react";
import {
  Upload,
  RotateCcw,
  Database,
  FileStack,
  Globe,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useTaskStore } from "@/lib/task-store";
import { useShardIndex, useShardData, useMasterData } from "@/lib/api";
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

function FetchMode() {
  const { setShardTasks, setShardList, shardList, currentShard, setCurrentShard } = useTaskStore();

  const isFetch = true;
  const { data: shards, isLoading: indexLoading, error: indexError } = useShardIndex(isFetch);
  const { data: masterData } = useMasterData(isFetch);
  const {
    data: shardData,
    isLoading: shardLoading,
    error: shardError,
  } = useShardData(currentShard, isFetch);

  // When shard index arrives, set list and default to first (highest) shard
  useEffect(() => {
    if (shards && shards.length > 0) {
      setShardList(shards);
      if (!currentShard || !shards.includes(currentShard)) {
        setCurrentShard(shards[0]);
      }
    }
  }, [shards, currentShard, setShardList, setCurrentShard]);

  // When shard data arrives, merge with master and push to store
  useEffect(() => {
    if (shardData && currentShard) {
      const sources: unknown[] = [shardData];
      if (masterData) sources.unshift(masterData);
      const merged = mergeFiles(sources);
      if (merged.tasks.length > 0) {
        setShardTasks(merged.tasks, merged.meta, currentShard);
      }
    }
  }, [shardData, masterData, currentShard, setShardTasks]);

  const currentIndex = shardList.indexOf(currentShard ?? "");
  const totalShards = shardList.length;
  const pageNum = currentIndex >= 0 ? currentIndex + 1 : 0;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < totalShards - 1;

  const goPrev = () => {
    if (hasPrev) setCurrentShard(shardList[currentIndex - 1]);
  };
  const goNext = () => {
    if (hasNext) setCurrentShard(shardList[currentIndex + 1]);
  };

  // Extract display name from shard filename (e.g., "tasks-N20-N29.json" -> "N20-N29")
  const shardLabel = currentShard?.replace("tasks-", "").replace(".json", "") ?? "...";

  if (indexError || shardError) {
    const msg = (indexError ?? shardError)?.message ?? "Fetch failed";
    return (
      <span className="font-mono text-[11px] text-destructive" title={msg}>
        API error: {msg}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {(indexLoading || shardLoading) && (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      )}
      {totalShards > 0 && (
        <>
          <button
            onClick={goPrev}
            disabled={!hasPrev || shardLoading}
            className="inline-flex items-center justify-center rounded-md border border-border bg-card p-1 text-foreground transition hover:bg-accent disabled:opacity-30 disabled:hover:bg-card"
            title="Previous shard (older)"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-[11px] text-muted-foreground">
            {shardLabel} ({pageNum}/{totalShards})
          </span>
          <button
            onClick={goNext}
            disabled={!hasNext || shardLoading}
            className="inline-flex items-center justify-center rounded-md border border-border bg-card p-1 text-foreground transition hover:bg-accent disabled:opacity-30 disabled:hover:bg-card"
            title="Next shard (newer)"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

function UploadMode() {
  const { setDataset } = useTaskStore();
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
      <span className="hidden lg:inline font-mono text-[10px] text-muted-foreground">
        <Upload className="inline h-3 w-3" /> tip: select master.json + every tasks-NXX-NYY.json
      </span>
    </div>
  );
}

export function DataLoader() {
  const { dataMode, setDataMode, reset, source, tasks } = useTaskStore();

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[11px] text-muted-foreground">
        {tasks.length} tasks · {source === "sample" ? "sample data" : "user data"}
      </span>

      {/* Mode toggle */}
      <div className="flex rounded-md border border-border">
        <button
          onClick={() => setDataMode("fetch")}
          className={`inline-flex items-center gap-1 px-2 py-1 font-mono text-[11px] transition first:rounded-l-md ${
            dataMode === "fetch"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-accent"
          }`}
          title="Fetch from API"
        >
          <Globe className="h-3 w-3" /> Fetch
        </button>
        <button
          onClick={() => setDataMode("upload")}
          className={`inline-flex items-center gap-1 px-2 py-1 font-mono text-[11px] transition last:rounded-r-md ${
            dataMode === "upload"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-accent"
          }`}
          title="Upload JSON files"
        >
          <Upload className="h-3 w-3" /> Upload
        </button>
      </div>

      {dataMode === "fetch" ? <FetchMode /> : <UploadMode />}

      <button
        onClick={reset}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground transition hover:bg-accent"
      >
        <RotateCcw className="h-3 w-3" /> Reset
      </button>
    </div>
  );
}
