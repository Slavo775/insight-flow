import { useCallback, useEffect, useMemo, useState } from "react";
import type { Task } from "./lib.js";
import type { MasterResponse } from "./api.js";
import { fetchMaster, fetchShard, fetchShardIndex } from "./api.js";
import { DetailPanel } from "./DetailPanel.js";
import { Kanban, Nav, ShardNav, Stats, Timeline } from "./ui.js";

export function App() {
  const [shards, setShards] = useState<string[]>([]);
  const [currentShard, setCurrentShard] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [label, setLabel] = useState<string>("Loading...");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadShard = useCallback(async (name: string) => {
    setCurrentShard(name);
    const [shardTasks, master] = await Promise.all([
      fetchShard(name),
      fetchMaster().catch((): MasterResponse => ({})),
    ]);
    setTasks(shardTasks);
    const current = master?.meta?.currentTaskId ?? null;
    let next =
      "Shard: " +
      name.replace("tasks-", "").replace(".json", "") +
      " · " +
      shardTasks.length +
      " tasks";
    if (current) next += " · current " + current;
    setLabel(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const index = await fetchShardIndex();
      if (cancelled) return;
      setShards(index);
      if (index.length > 0) await loadShard(index[0]);
    })().catch(() => setLabel("Failed to load tasks"));
    return () => {
      cancelled = true;
    };
  }, [loadShard]);

  const selected = useMemo(
    () => tasks.find((t) => t.id === selectedId) ?? null,
    [tasks, selectedId],
  );

  return (
    <>
      <Nav projectName="" />
      <div className="top-bar">
        <div>
          <h1>
            <span className="live-dot" id="status-dot" />
            Taskflow Dashboard
          </h1>
          <p className="subtitle">{label}</p>
        </div>
      </div>

      <div className="layout">
        <div className="main-content">
          {shards.length > 0 ? (
            <ShardNav shards={shards} current={currentShard} onSelect={(n) => void loadShard(n)} />
          ) : null}
          <Stats tasks={tasks} />
          <Kanban tasks={tasks} onOpen={setSelectedId} />
          <div id="timeline">
            <Timeline tasks={tasks} />
          </div>
        </div>
      </div>

      <DetailPanel task={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}
