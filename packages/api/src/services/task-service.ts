/**
 * TaskService - Domain service for task CRUD operations
 * Uses Effect.Service with Layer pattern (SA-001)
 * Uses Model.makeRepository for basic CRUD (SA-002)
 */

import { Model, SqlClient } from "@effect/sql"
import { Effect, Layer, Option, Schema } from "effect"
import {
  Task,
  type TaskStatus,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@sherpy/shared"
import { randomUUID } from "node:crypto"

/**
 * Input for creating a task
 */
export class CreateTaskInput extends Schema.Class<CreateTaskInput>(
  "CreateTaskInput",
)({
  milestoneId: Schema.String,
  projectId: Schema.String,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  description: Schema.optional(Schema.String),
  priority: Schema.optional(Schema.Literal("low", "medium", "high")),
  estimatedHours: Schema.optional(Schema.Number.pipe(Schema.positive())),
}) {}

/**
 * Input for updating a task
 */
export class UpdateTaskInput extends Schema.Class<UpdateTaskInput>(
  "UpdateTaskInput",
)({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  description: Schema.optional(Schema.String),
  priority: Schema.optional(Schema.Literal("low", "medium", "high")),
  estimatedHours: Schema.optional(Schema.Number.pipe(Schema.positive())),
  actualHours: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
}) {}

/**
 * Input for reordering tasks
 */
export class ReorderTasksInput extends Schema.Class<ReorderTasksInput>(
  "ReorderTasksInput",
)({
  taskIds: Schema.Array(Schema.String),
}) {}

/**
 * Input for bulk status update
 */
export class BulkUpdateStatusInput extends Schema.Class<BulkUpdateStatusInput>(
  "BulkUpdateStatusInput",
)({
  taskIds: Schema.Array(Schema.String),
  status: Schema.Literal("pending", "in-progress", "blocked", "complete"),
}) {}

/**
 * Filters for listing tasks by project
 */
export class ListTaskFilters extends Schema.Class<ListTaskFilters>(
  "ListTaskFilters",
)({
  status: Schema.optional(Schema.Literal("pending", "in-progress", "blocked", "complete")),
  priority: Schema.optional(Schema.Literal("low", "medium", "high")),
}) {}

/**
 * TaskService - Effect.Service for task domain operations
 */
export class TaskService extends Effect.Service<TaskService>()(
  "TaskService",
  {
    effect: Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      // Create repository using Model.makeRepository (SA-002)
      const repo = yield* Model.makeRepository(Task, {
        tableName: "tasks",
        idColumn: "id",
        spanPrefix: "TaskRepository",
      })

      /**
       * Create a new task
       */
      const create = (
        input: typeof CreateTaskInput.Type,
      ): Effect.Effect<typeof Task.Type, NotFoundError | ValidationError | ConflictError> =>
        Effect.gen(function* () {
          // Validate that milestone exists and belongs to the project
          const milestoneCheck = yield* sql<{ projectId: string; count: number }>`
            SELECT project_id as projectId, COUNT(*) as count
            FROM milestones
            WHERE id = ${input.milestoneId}
          `

          if (!milestoneCheck[0] || milestoneCheck[0].count === 0) {
            return yield* Effect.fail(
              new NotFoundError({
                entity: "Milestone",
                id: input.milestoneId,
                message: `Milestone with id "${input.milestoneId}" not found`,
              }),
            )
          }

          // Validate milestone belongs to project
          if (milestoneCheck[0].projectId !== input.projectId) {
            return yield* Effect.fail(
              new ValidationError({
                message: `Milestone "${input.milestoneId}" does not belong to project "${input.projectId}"`,
              }),
            )
          }

          // Validate that project exists
          const projectCheck = yield* sql<{ count: number }>`
            SELECT COUNT(*) as count FROM projects WHERE id = ${input.projectId}
          `

          if (!projectCheck[0] || projectCheck[0].count === 0) {
            return yield* Effect.fail(
              new NotFoundError({
                entity: "Project",
                id: input.projectId,
                message: `Project with id "${input.projectId}" not found`,
              }),
            )
          }

          // Get max orderIndex for this milestone to set new task at the end
          const maxOrderResult = yield* sql<{ maxOrder: number | null }>`
            SELECT MAX(order_index) as maxOrder FROM tasks WHERE milestone_id = ${input.milestoneId}
          `
          const orderIndex = (maxOrderResult[0]?.maxOrder ?? -1) + 1

          // Create task with generated UUID
          const id = randomUUID()
          const now = new Date().toISOString()
          const status: TaskStatus = "pending"
          const priority = input.priority ?? "medium"

          yield* sql`
            INSERT INTO tasks (
              id, milestone_id, project_id, name, description,
              status, priority, estimated_hours, actual_hours,
              order_index, created_at, updated_at
            ) VALUES (
              ${id}, ${input.milestoneId}, ${input.projectId}, ${input.name},
              ${input.description ?? null}, ${status}, ${priority},
              ${input.estimatedHours ?? null}, ${null}, ${orderIndex}, ${now}, ${now}
            )
          `

          // Fetch the created task
          const tasks = yield* sql<typeof Task.Type>`
            SELECT * FROM tasks WHERE id = ${id}
          `

          if (!tasks[0]) {
            return yield* Effect.fail(
              new NotFoundError({
                entity: "Task",
                id,
                message: `Task not found after insert`,
              }),
            )
          }

          return tasks[0] as typeof Task.Type
        }).pipe(
          Effect.catchTag("SqlError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Database error: ${error.message ?? "Unknown error"}`,
              }),
            ),
          ),
        )

      /**
       * List tasks for a milestone, ordered by orderIndex
       */
      const listByMilestone = (
        milestoneId: string,
      ): Effect.Effect<Array<typeof Task.Type>, ValidationError> =>
        Effect.gen(function* () {
          const tasks = yield* sql<typeof Task.Type>`
            SELECT * FROM tasks
            WHERE milestone_id = ${milestoneId}
            ORDER BY order_index ASC
          `
          return tasks as Array<typeof Task.Type>
        }).pipe(
          Effect.catchTag("SqlError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Database error: ${error.message ?? "Unknown error"}`,
              }),
            ),
          ),
        )

      /**
       * List tasks for a project with optional filters
       */
      const listByProject = (
        projectId: string,
        filters?: typeof ListTaskFilters.Type,
      ): Effect.Effect<Array<typeof Task.Type>, ValidationError> =>
        Effect.gen(function* () {
          let query = `SELECT * FROM tasks WHERE project_id = '${projectId}'`

          if (filters?.status) {
            query += ` AND status = '${filters.status}'`
          }

          if (filters?.priority) {
            query += ` AND priority = '${filters.priority}'`
          }

          query += ` ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, order_index ASC`

          const result = yield* sql.unsafe(query)
          const tasks = result as unknown as Array<typeof Task.Type>
          return tasks
        }).pipe(
          Effect.catchTag("SqlError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Database error: ${error.message ?? "Unknown error"}`,
              }),
            ),
          ),
        )

      /**
       * Get a task by ID
       */
      const get = (
        id: string,
      ): Effect.Effect<typeof Task.Type, NotFoundError | ValidationError> =>
        Effect.gen(function* () {
          const tasks = yield* sql<typeof Task.Type>`
            SELECT * FROM tasks WHERE id = ${id}
          `

          if (!tasks[0]) {
            return yield* Effect.fail(
              new NotFoundError({
                entity: "Task",
                id,
                message: `Task with id "${id}" not found`,
              }),
            )
          }

          return tasks[0] as typeof Task.Type
        }).pipe(
          Effect.catchTag("SqlError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Database error: ${error.message ?? "Unknown error"}`,
              }),
            ),
          ),
        )

      /**
       * Update a task
       */
      const update = (
        id: string,
        input: typeof UpdateTaskInput.Type,
      ): Effect.Effect<typeof Task.Type, NotFoundError | ValidationError> =>
        Effect.gen(function* () {
          // First get the existing task
          const existing = yield* get(id)

          // Build update fields
          const name = input.name ?? existing.name
          const description = input.description !== undefined ? input.description : existing.description
          const priority = input.priority ?? existing.priority
          const estimatedHours = input.estimatedHours !== undefined ? input.estimatedHours : existing.estimatedHours
          const actualHours = input.actualHours !== undefined ? input.actualHours : existing.actualHours
          const now = new Date().toISOString()

          // Update with raw SQL
          yield* sql`
            UPDATE tasks
            SET name = ${name},
                description = ${description ?? null},
                priority = ${priority},
                estimated_hours = ${estimatedHours ?? null},
                actual_hours = ${actualHours ?? null},
                updated_at = ${now}
            WHERE id = ${id}
          `

          // Fetch the updated task
          return yield* get(id)
        }).pipe(
          Effect.catchTag("SqlError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Database error: ${error.message ?? "Unknown error"}`,
              }),
            ),
          ),
        )

      /**
       * Reorder tasks within a milestone atomically
       * Takes an array of task IDs in the desired order
       */
      const reorder = (
        milestoneId: string,
        input: typeof ReorderTasksInput.Type,
      ): Effect.Effect<void, NotFoundError | ValidationError> =>
        Effect.gen(function* () {
          // Validate that all tasks exist and belong to the milestone
          const existingTasks = yield* listByMilestone(milestoneId)
          const existingIds = new Set(existingTasks.map(t => t.id))

          // Check that all provided IDs exist
          for (const id of input.taskIds) {
            if (!existingIds.has(id)) {
              return yield* Effect.fail(
                new NotFoundError({
                  entity: "Task",
                  id,
                  message: `Task with id "${id}" not found in milestone "${milestoneId}"`,
                }),
              )
            }
          }

          // Check that all existing tasks are included
          if (input.taskIds.length !== existingTasks.length) {
            return yield* Effect.fail(
              new ValidationError({
                message: `Reorder must include all tasks for milestone. Expected ${existingTasks.length}, got ${input.taskIds.length}`,
              }),
            )
          }

          // Update orderIndex for each task in a transaction
          yield* sql.withTransaction(
            Effect.gen(function* () {
              for (let i = 0; i < input.taskIds.length; i++) {
                const taskId = input.taskIds[i]!
                const now = new Date().toISOString()
                yield* sql`
                  UPDATE tasks
                  SET order_index = ${i}, updated_at = ${now}
                  WHERE id = ${taskId}
                `
              }
            }),
          )
        }).pipe(
          Effect.catchTag("SqlError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Database error: ${error.message ?? "Unknown error"}`,
              }),
            ),
          ),
        )

      /**
       * Bulk update status for multiple tasks atomically
       */
      const bulkUpdateStatus = (
        input: typeof BulkUpdateStatusInput.Type,
      ): Effect.Effect<Array<typeof Task.Type>, NotFoundError | ValidationError> =>
        Effect.gen(function* () {
          // Validate that all tasks exist
          for (const id of input.taskIds) {
            yield* get(id)
          }

          // Update all tasks in a transaction
          yield* sql.withTransaction(
            Effect.gen(function* () {
              for (const taskId of input.taskIds) {
                const now = new Date().toISOString()
                yield* sql`
                  UPDATE tasks
                  SET status = ${input.status}, updated_at = ${now}
                  WHERE id = ${taskId}
                `
              }
            }),
          )

          // Fetch updated tasks
          const updatedTasks = yield* Effect.all(
            input.taskIds.map(id => get(id)),
          )

          return updatedTasks
        }).pipe(
          Effect.catchTag("SqlError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Database error: ${error.message ?? "Unknown error"}`,
              }),
            ),
          ),
        )

      return {
        create,
        listByMilestone,
        listByProject,
        get,
        update,
        reorder,
        bulkUpdateStatus,
      } as const
    }),
  },
) {}

/**
 * Live layer for TaskService with SqlClient dependency
 */
export const TaskServiceLive = TaskService.Default
