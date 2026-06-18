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

export {
  resolveConfig,
  getWorkDir,
  getEventsDir,
  getMasterPath,
  resolveTaskFolder,
} from "./core/config.js";
export { loadSpec, scaffoldReviewMd } from "./core/spec.js";
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
  resolveFlowRoot,
  TaskflowProjectNotFoundError,
} from "./core/paths.js";
export type { FlowRoot } from "./core/paths.js";
export { flowInstallPlan, flowArtifacts } from "./agents/flow-install.js";
export type { InstallStep } from "./agents/flow-install.js";
export { setStatus, flowStatusUniverse, InvalidStatusTransitionError } from "./core/set-status.js";
export type { StatusFlow, SetStatusOptions } from "./core/set-status.js";
export { currentFlowNodes, suggestNextSteps, resolveTrigger } from "./core/flow-status.js";
export type { FlowEdge, NextStep, FlowStateDef, AgentHandover } from "./core/flow-status.js";
// (TaskStatus the type already exports from core/types; only the const here.)
export { TASK_STATUSES } from "./core/statuses.js";
export {
  buildColumns,
  orphanStatuses,
  isCanonicalStatus,
  statusLabel,
  statusColor,
  CANONICAL_COLUMNS,
} from "./core/kanban.js";
export type { Column, FlowStatus } from "./core/kanban.js";
export { validateEdgeAddition, edgeKey } from "./core/flow-edit.js";
export {
  loadUserRegistries,
  mergedModuleRegistry,
  mergedComposedAgents,
  mergedProjects,
  userSpaceRoot,
  UserRegistryError,
  CUSTOM_ID_PREFIX,
} from "./agents/user-registry.js";
export type { UserRegistries } from "./agents/user-registry.js";
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
export {
  AgentModuleSchema,
  ComposedAgentSchema,
  ProjectSchema,
  deriveCommandName,
  RESERVED_COMMAND_NAMES,
} from "./core/schema/index.js";
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
export { transitionTargetFor } from "./agents/transitions.js";
export { applyArtifacts, renameManifestBucket } from "./agents/emit.js";
export type { EmitReport, EmitAction } from "./agents/emit.js";
export { DEFAULT_PROJECT, projectBucketId, collectProjectInstall } from "./agents/project.js";
export type { Project } from "./agents/project.js";
