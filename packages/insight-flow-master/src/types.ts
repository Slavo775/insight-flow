export interface MasterServerConfig {
  port?: number;
  standalone?: boolean;
}

export interface MasterProjectState {
  currentTaskId: string | null;
  currentTaskTitle: string | null;
  currentTaskStatus: string | null;
  taskCounts: Record<string, number>;
  recentActivity: object[];
  claudeStatus?: "active" | "idle" | "permission-required";
}

export interface MasterProjectEntry {
  id: string;
  projectId: string;
  label: string;
  url: string;
  registeredAt: string;
  lastSeenAt: string;
  state: MasterProjectState;
}
