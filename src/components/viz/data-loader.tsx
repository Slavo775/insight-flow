import { useRef } from "react";
import { Upload, RotateCcw, Database } from "lucide-react";
import { useTaskStore } from "@/lib/task-store";
import { toast } from "sonner";

export function DataLoader() {
  const { setDataset, reset, source, tasks } = useTaskStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!Array.isArray(json.tasks)) throw new Error("JSON must contain a 'tasks' array");
      setDataset(json, "user");
      toast.success(`Loaded ${json.tasks.length} tasks`);
    } catch (e) {
      toast.error(`Failed to load: ${(e as Error).message}`);
    }
  };

  const handlePaste = async () => {
    const text = prompt("Paste task JSON:");
    if (!text) return;
    try {
      const json = JSON.parse(text);
      if (!Array.isArray(json.tasks)) throw new Error("JSON must contain a 'tasks' array");
      setDataset(json, "user");
      toast.success(`Loaded ${json.tasks.length} tasks`);
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
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] text-foreground transition hover:bg-accent"
      >
        <Upload className="h-3 w-3" /> Upload JSON
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
    </div>
  );
}
