// Public API for programmatic usage
export type {
  Task,
  TaskStatus,
  Review,
  ReviewFix,
  Push,
  Incident,
  ChangeRequest,
  StatusHistoryEntry,
  ShardFile,
  MasterFile,
  TaskflowConfig,
  ActivityEvent,
  ActivityEngineConfig,
  AgentsConfig,
  AgentExtensions,
  CustomAgent,
} from "./core/types.js";

export { resolveConfig, getWorkDir, getMasterPath } from "./core/config.js";
export {
  loadMaster,
  saveMaster,
  loadShard,
  saveShard,
  loadTaskById,
  loadAllTasks,
  getShardFileName,
  parseTaskNum,
} from "./core/storage.js";
export { startServer } from "./dashboard/server/index.js";
export { deriveStatus, statusFromEvent, EventStore } from "./dashboard/server/event-stream.js";
export {
  CURSOR_EVENT_TO_DERIVED,
  cursorEventToDerived,
  parseCursorStdin,
} from "./agents/hook-parse.js";
export type { HookEventInput, ProjectStatus, EventFrame, StatusFrame } from "./core/types.js";
export { initProject } from "./agents/init/index.js";
export { buildBulkInitArgs } from "./cli/commands/batch-ui.js";
export {
  resolveProjectRoot,
  resolvePackageAsset,
  TaskflowProjectNotFoundError,
} from "./core/paths.js";
export {
  TaskSchema,
  ReviewSchema,
  ReviewFixSchema,
  PushSchema,
  IncidentSchema,
  ChangeRequestSchema,
  ShardFileSchema,
  MasterFileSchema,
  TaskStatusSchema,
  StatusHistoryEntrySchema,
  TaskflowValidationError,
} from "./core/schema/index.js";
export { runMaster, startMasterServer } from "./master/index.js";
export { jsonFileStorage } from "./core/storage-port.js";
export type { Storage } from "./core/storage-port.js";
export { SseTransport } from "./dashboard/server/transport.js";
export type { Transport, TransportClient } from "./dashboard/server/transport.js";
export { AgentModuleSchema, ComposedAgentSchema } from "./core/schema/index.js";
export {
  composeAgent,
  composeAgentById,
  collectArtifacts,
  listComposedAgents,
  indexById,
  MODULE_REGISTRY,
  COMPOSED_AGENTS,
} from "./agents/compose.js";
export type { AgentModule, ComposedAgent, AgentArtifacts } from "./agents/compose.js";
export { applyArtifacts } from "./agents/emit.js";
export type { EmitReport, EmitAction } from "./agents/emit.js";
