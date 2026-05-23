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
}

export interface MasterProjectEntry {
  id: string;
  label: string;
  url: string;
  registeredAt: string;
  lastSeenAt: string;
  state: MasterProjectState;
}
