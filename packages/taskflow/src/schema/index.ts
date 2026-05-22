import { z, type ZodError } from "zod";

export const TaskStatusSchema = z.enum([
  "ready",
  "in-progress",
  "implemented",
  "reviewing",
  "approved",
  "fix-needed",
  "fixing",
  "fixed",
  "pushed",
  "merged",
  "done",
  "request-changes",
  "changes-requested",
  "changes-implementing",
  "changes-implemented",
]);

export const StatusHistoryEntrySchema = z.object({
  status: z.string(),
  at: z.string(),
  by: z.string(),
});

export const ReviewFixSchema = z.object({
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  status: z.string(),
  filesChanged: z.array(z.string()),
  comment: z.string().nullable(),
  by: z.string(),
});

export const ReviewSchema = z.object({
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  verdict: z.string().nullable(),
  comment: z.string().nullable(),
  type: z.enum(["ai", "human"]),
  by: z.string(),
  fix: ReviewFixSchema.nullable(),
});

export const PushSchema = z.object({
  at: z.string(),
  commitHash: z.string(),
  commitMessage: z.string(),
});

export const IncidentStatusEntrySchema = z.object({
  status: z.string(),
  at: z.string(),
  by: z.string().optional(),
});

export const IncidentSeveritySchema = z.enum(["critical", "high", "medium", "low"]);

export const IncidentSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: IncidentSeveritySchema,
  status: z.string(),
  reportedAt: z.string(),
  resolvedAt: z.string().nullable(),
  branch: z.string(),
  description: z.string().nullable(),
  rootCause: z.string().nullable(),
  fix: z.string().nullable(),
  statusHistory: z.array(IncidentStatusEntrySchema),
});

export const ChangeRequestSchema = z.object({
  requestedAt: z.string(),
  description: z.string(),
  requestedBy: z.string(),
  status: z.string(),
  implementedAt: z.string().nullable(),
  filesChanged: z.array(z.string()),
  comment: z.string().nullable(),
  implementedBy: z.string().nullable(),
});

export const TaskSchema = z.object({
  id: z.string().regex(/^N\d{2,}$/),
  title: z.string(),
  type: z.string(),
  priority: z.string(),
  status: z.string(),
  folder: z.string(),
  createdAt: z.string(),
  statusHistory: z.array(StatusHistoryEntrySchema),
  implementation: z.object({
    startedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    filesChanged: z.array(z.string()),
    tokensUsed: z.number().nullable(),
  }),
  // reviews/incidents live in per-task side files (reviews.json, incidents.json).
  // Both remain accepted inline for legacy shards predating the split.
  reviews: z.array(ReviewSchema).optional(),
  changesAfterImplementation: z.array(ChangeRequestSchema),
  incidents: z.array(IncidentSchema).optional(),
  reviewCount: z.number().int().min(0).optional(),
  lastReviewVerdict: z.string().nullable().optional(),
  openIncidentCount: z.number().int().min(0).optional(),
  committedAt: z.string().nullable(),
  totalDurationMinutes: z.number().nullable(),
  tags: z.array(z.string()),
  pushes: z.array(PushSchema).default([]),
  branch: z.string().nullable().default(null),
  mrUrl: z.string().nullable().default(null),
  mergedAt: z.string().nullable().default(null),
});

export const ShardFileSchema = z.object({
  range: z.object({
    from: z.number().int().min(0),
    to: z.number().int().min(0),
  }),
  tasks: z.array(TaskSchema),
});

export const ReviewsFileSchema = z.object({
  taskId: z.string().regex(/^N\d{2,}$/),
  reviews: z.array(ReviewSchema),
});

export const IncidentsFileSchema = z.object({
  taskId: z.string().regex(/^N\d{2,}$/),
  incidents: z.array(IncidentSchema),
});

export const MasterFileSchema = z.object({
  meta: z.object({
    nextId: z.number().int().min(0),
    currentTaskId: z.string().nullable().default(null),
    nextIncidentId: z.number().int().min(1).default(1),
    shards: z.array(z.string().regex(/^tasks-N\d{2,}-N\d{2,}\.json$/)),
  }),
});

export class TaskflowValidationError extends Error {
  readonly file: string;
  readonly issuePath: string;
  readonly expected: string;
  readonly received: string;

  constructor(file: string, error: ZodError) {
    const issue = error.issues[0];
    const issuePath = issue?.path.join(".") || "(root)";
    const expected = issue && "expected" in issue ? String(issue.expected) : "valid value";
    const received = issue && "received" in issue ? String(issue.received) : "invalid";
    super(
      `Taskflow validation error in ${file} at "${issuePath}": ${
        issue?.message ?? "validation failed"
      } (expected ${expected}, got ${received})`,
    );
    this.name = "TaskflowValidationError";
    this.file = file;
    this.issuePath = issuePath;
    this.expected = expected;
    this.received = received;
  }
}
