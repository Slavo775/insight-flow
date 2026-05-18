import { watch, existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import type { ActivityEvent, ActivityEngineConfig } from "../types.js";

export class ActivityEngine {
  private events: ActivityEvent[] = [];
  private listeners: Array<(event: ActivityEvent) => void> = [];
  private watcher: ReturnType<typeof watch> | null = null;
  private lastSize = 0;
  private logPath: string;
  private maxEvents: number;
  private enabled: boolean;

  constructor(logPath: string, config: ActivityEngineConfig) {
    this.logPath = logPath;
    this.maxEvents = config.maxEvents;
    this.enabled = config.enabled;
  }

  start(): void {
    if (!this.enabled) return;

    // Clear ephemeral log on start
    writeFileSync(this.logPath, "");
    this.lastSize = 0;

    // Start watching the log file
    this.watcher = watch(this.logPath, () => {
      this.readNewLines();
    });

    // Also poll every 500ms as a fallback (fs.watch can miss events)
    const poll = setInterval(() => {
      if (!this.enabled) {
        clearInterval(poll);
        return;
      }
      this.readNewLines();
    }, 500);

    // Don't keep the process alive for the poll timer
    if (poll.unref) poll.unref();
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  getRecentEvents(): ActivityEvent[] {
    return this.events.slice();
  }

  onEvent(callback: (event: ActivityEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private readNewLines(): void {
    if (!existsSync(this.logPath)) return;

    let currentSize: number;
    try {
      currentSize = statSync(this.logPath).size;
    } catch {
      return;
    }

    if (currentSize <= this.lastSize) return;

    try {
      const content = readFileSync(this.logPath, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim());

      // Process only new lines
      const existingCount = this.events.length;
      for (let i = existingCount; i < lines.length; i++) {
        try {
          const event = JSON.parse(lines[i]) as ActivityEvent;
          this.events.push(event);

          // Ring buffer: keep only maxEvents
          if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
          }

          for (const listener of this.listeners) {
            listener(event);
          }
        } catch {
          // Skip malformed lines
        }
      }

      this.lastSize = currentSize;
    } catch {
      // File may be in use
    }
  }
}

export class NoopActivityEngine extends ActivityEngine {
  constructor() {
    super("", { enabled: false, logFile: "", maxEvents: 0 });
  }
  start(): void {}
  stop(): void {}
  getRecentEvents(): ActivityEvent[] {
    return [];
  }
  onEvent(): () => void {
    return () => {};
  }
}
