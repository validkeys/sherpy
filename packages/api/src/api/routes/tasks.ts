/**
 * Task RPC endpoint handlers
 * Implements CRUD operations for tasks with schema validation
 */

import {
  HttpApiEndpoint,
  HttpApiGroup,
} from "@effect/platform"
import { Schema } from "effect"
import { Task, NotFoundError, ValidationError, ConflictError } from "@sherpy/shared"

/**
 * Request/Response schemas for task endpoints
 */

// POST /api/milestones/:milestoneId/tasks - Create task
export class CreateTaskParams extends Schema.Class<CreateTaskParams>(
  "CreateTaskParams"
)({
  milestoneId: Schema.String,
}) {}

export class CreateTaskRequest extends Schema.Class<CreateTaskRequest>(
  "CreateTaskRequest"
)({
  projectId: Schema.String,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  description: Schema.optional(Schema.String),
  priority: Schema.optional(Schema.Literal("low", "medium", "high")),
  estimatedHours: Schema.optional(Schema.Number.pipe(Schema.positive())),
}) {}

export class CreateTaskResponse extends Schema.Class<CreateTaskResponse>(
  "CreateTaskResponse"
)({
  task: Schema.typeSchema(Task),
}) {}

// GET /api/milestones/:milestoneId/tasks - List tasks by milestone
export class ListTasksByMilestoneParams extends Schema.Class<ListTasksByMilestoneParams>(
  "ListTasksByMilestoneParams"
)({
  milestoneId: Schema.String,
}) {}

export class ListTasksByMilestoneResponse extends Schema.Class<ListTasksByMilestoneResponse>(
  "ListTasksByMilestoneResponse"
)({
  tasks: Schema.Array(Schema.typeSchema(Task)),
}) {}

// GET /api/projects/:projectId/tasks - List tasks by project
export class ListTasksByProjectParams extends Schema.Class<ListTasksByProjectParams>(
  "ListTasksByProjectParams"
)({
  projectId: Schema.String,
}) {}

export class ListTasksByProjectQueryParams extends Schema.Class<ListTasksByProjectQueryParams>(
  "ListTasksByProjectQueryParams"
)({
  status: Schema.optional(Schema.Literal("pending", "in-progress", "blocked", "complete")),
  priority: Schema.optional(Schema.Literal("low", "medium", "high")),
}) {}

export class ListTasksByProjectResponse extends Schema.Class<ListTasksByProjectResponse>(
  "ListTasksByProjectResponse"
)({
  tasks: Schema.Array(Schema.typeSchema(Task)),
}) {}

// GET /api/tasks/:taskId - Get task
export class GetTaskParams extends Schema.Class<GetTaskParams>(
  "GetTaskParams"
)({
  taskId: Schema.String,
}) {}

export class GetTaskResponse extends Schema.Class<GetTaskResponse>(
  "GetTaskResponse"
)({
  task: Schema.typeSchema(Task),
}) {}

// PATCH /api/tasks/:taskId - Update task
export class UpdateTaskParams extends Schema.Class<UpdateTaskParams>(
  "UpdateTaskParams"
)({
  taskId: Schema.String,
}) {}

export class UpdateTaskRequest extends Schema.Class<UpdateTaskRequest>(
  "UpdateTaskRequest"
)({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  description: Schema.optional(Schema.String),
  priority: Schema.optional(Schema.Literal("low", "medium", "high")),
  estimatedHours: Schema.optional(Schema.Number.pipe(Schema.positive())),
  actualHours: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
}) {}

export class UpdateTaskResponse extends Schema.Class<UpdateTaskResponse>(
  "UpdateTaskResponse"
)({
  task: Schema.typeSchema(Task),
}) {}

// PATCH /api/tasks/:taskId/status - Update task status
export class UpdateTaskStatusParams extends Schema.Class<UpdateTaskStatusParams>(
  "UpdateTaskStatusParams"
)({
  taskId: Schema.String,
}) {}

export class UpdateTaskStatusRequest extends Schema.Class<UpdateTaskStatusRequest>(
  "UpdateTaskStatusRequest"
)({
  status: Schema.Literal("pending", "in-progress", "blocked", "complete"),
}) {}

export class UpdateTaskStatusResponse extends Schema.Class<UpdateTaskStatusResponse>(
  "UpdateTaskStatusResponse"
)({
  task: Schema.typeSchema(Task),
}) {}

// PUT /api/milestones/:milestoneId/tasks/reorder - Reorder tasks
export class ReorderTasksParams extends Schema.Class<ReorderTasksParams>(
  "ReorderTasksParams"
)({
  milestoneId: Schema.String,
}) {}

export class ReorderTasksRequest extends Schema.Class<ReorderTasksRequest>(
  "ReorderTasksRequest"
)({
  taskIds: Schema.Array(Schema.String),
}) {}

export class ReorderTasksResponse extends Schema.Class<ReorderTasksResponse>(
  "ReorderTasksResponse"
)({
  success: Schema.Literal(true),
}) {}

// PATCH /api/tasks/bulk/status - Bulk update task status
export class BulkUpdateTaskStatusRequest extends Schema.Class<BulkUpdateTaskStatusRequest>(
  "BulkUpdateTaskStatusRequest"
)({
  taskIds: Schema.Array(Schema.String),
  status: Schema.Literal("pending", "in-progress", "blocked", "complete"),
}) {}

export class BulkUpdateTaskStatusResponse extends Schema.Class<BulkUpdateTaskStatusResponse>(
  "BulkUpdateTaskStatusResponse"
)({
  tasks: Schema.Array(Schema.typeSchema(Task)),
}) {}

/**
 * Tasks API Group - defines all task endpoints
 * All endpoints require Authentication middleware
 */
export class TasksApi extends HttpApiGroup.make("tasks")
  .add(
    HttpApiEndpoint.post("createTask", "/milestones/:milestoneId/tasks")
      .addSuccess(CreateTaskResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .addError(ConflictError)
      .setPath(CreateTaskParams)
      .setPayload(CreateTaskRequest)
  )
  .add(
    HttpApiEndpoint.get("listTasksByMilestone", "/milestones/:milestoneId/tasks")
      .addSuccess(ListTasksByMilestoneResponse)
      .addError(ValidationError)
      .setPath(ListTasksByMilestoneParams)
  )
  .add(
    HttpApiEndpoint.get("listTasksByProject", "/projects/:projectId/tasks")
      .addSuccess(ListTasksByProjectResponse)
      .addError(ValidationError)
      .setPath(ListTasksByProjectParams)
      .setUrlParams(ListTasksByProjectQueryParams)
  )
  .add(
    HttpApiEndpoint.get("getTask", "/tasks/:taskId")
      .addSuccess(GetTaskResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(GetTaskParams)
  )
  .add(
    HttpApiEndpoint.patch("updateTask", "/tasks/:taskId")
      .addSuccess(UpdateTaskResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(UpdateTaskParams)
      .setPayload(UpdateTaskRequest)
  )
  .add(
    HttpApiEndpoint.patch("updateTaskStatus", "/tasks/:taskId/status")
      .addSuccess(UpdateTaskStatusResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(UpdateTaskStatusParams)
      .setPayload(UpdateTaskStatusRequest)
  )
  .add(
    HttpApiEndpoint.put("reorderTasks", "/milestones/:milestoneId/tasks/reorder")
      .addSuccess(ReorderTasksResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(ReorderTasksParams)
      .setPayload(ReorderTasksRequest)
  )
  .add(
    HttpApiEndpoint.patch("bulkUpdateTaskStatus", "/tasks/bulk/status")
      .addSuccess(BulkUpdateTaskStatusResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPayload(BulkUpdateTaskStatusRequest)
  )
  .prefix("/api") {}
