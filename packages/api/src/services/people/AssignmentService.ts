/**
 * AssignmentService - Domain service for person-task assignment operations
 * Uses Effect.Service with Layer pattern (SA-001)
 * Uses Model.makeRepository for basic CRUD (SA-002)
 * Uses SqlResolver for joins to avoid N+1 queries (SA-003)
 */

import { randomUUID } from "node:crypto";
import { Model, SqlClient } from "@effect/sql";
import {
  Assignment,
  type AssignmentStatus,
  ConflictError,
  NotFoundError,
  Person,
  Task,
  ValidationError,
} from "@sherpy/shared";
import { Effect, Schema } from "effect";

/**
 * Input for creating an assignment
 */
export class AssignInput extends Schema.Class<AssignInput>("AssignInput")({
  taskId: Schema.String,
  personId: Schema.String,
  allocationPercentage: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(100),
  ),
  startDate: Schema.optional(Schema.String),
  endDate: Schema.optional(Schema.String),
  status: Schema.optional(Schema.Literal("planned", "active", "completed", "cancelled")),
}) {}

/**
 * Input for updating an assignment's allocation
 */
export class UpdateAllocationInput extends Schema.Class<UpdateAllocationInput>(
  "UpdateAllocationInput",
)({
  allocationPercentage: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(100),
  ),
}) {}

/**
 * Assignment with person details
 */
export interface AssignmentWithPerson {
  assignment: typeof Assignment.Type;
  person: typeof Person.Type;
}

/**
 * Assignment with task details
 */
export interface AssignmentWithTask {
  assignment: typeof Assignment.Type;
  task: typeof Task.Type;
}

/**
 * Assignment with both person and task details
 */
export interface AssignmentWithDetails {
  assignment: typeof Assignment.Type;
  person: typeof Person.Type;
  task: typeof Task.Type;
}

/**
 * AssignmentService - Effect.Service for assignment domain operations
 */
export class AssignmentService extends Effect.Service<AssignmentService>()("AssignmentService", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    // Create repository using Model.makeRepository (SA-002)
    const repo = yield* Model.makeRepository(Assignment, {
      tableName: "assignments",
      idColumn: "id",
      spanPrefix: "AssignmentRepository",
    });

    /**
     * Assign a person to a task with allocation percentage
     */
    const assign = (
      input: typeof AssignInput.Type,
    ): Effect.Effect<typeof Assignment.Type, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // Validate input with Schema
        const validatedInput = yield* Schema.decodeUnknown(AssignInput)(input).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              new ValidationError({
                message: `Invalid assignment data: ${error}`,
              }),
            ),
          ),
        );

        // Verify person exists
        const people = yield* sql<typeof Person.Type>`
            SELECT * FROM people WHERE id = ${validatedInput.personId}
          `;

        if (!people[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Person",
              id: validatedInput.personId,
              message: `Person with id "${validatedInput.personId}" not found`,
            }),
          );
        }

        // Verify task exists
        const tasks = yield* sql<typeof Task.Type>`
            SELECT * FROM tasks WHERE id = ${validatedInput.taskId}
          `;

        if (!tasks[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Task",
              id: validatedInput.taskId,
              message: `Task with id "${validatedInput.taskId}" not found`,
            }),
          );
        }

        // Create assignment with generated UUID
        const id = randomUUID();
        const now = new Date().toISOString();
        const status = validatedInput.status ?? "planned";

        yield* sql`
            INSERT INTO assignments (
              id, task_id, person_id, allocation_percentage,
              start_date, end_date, status, created_at, updated_at
            ) VALUES (
              ${id}, ${validatedInput.taskId}, ${validatedInput.personId}, ${validatedInput.allocationPercentage},
              ${validatedInput.startDate ?? null}, ${validatedInput.endDate ?? null}, ${status},
              ${now}, ${now}
            )
          `;

        // Fetch the created assignment
        const assignments = yield* sql<typeof Assignment.Type>`
            SELECT * FROM assignments WHERE id = ${id}
          `;

        if (!assignments[0]) {
          return yield* Effect.fail(
            new ValidationError({
              message: `Assignment not found after insert`,
            }),
          );
        }

        return assignments[0] as typeof Assignment.Type;
      }).pipe(
        Effect.catchTag("SqlError", (error) =>
          Effect.fail(
            new ValidationError({
              message: `Database error: ${error.message ?? "Unknown error"}`,
            }),
          ),
        ),
      );

    /**
     * Unassign a person from a task
     */
    const unassign = (id: string): Effect.Effect<void, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // Verify assignment exists
        const assignments = yield* sql<typeof Assignment.Type>`
            SELECT * FROM assignments WHERE id = ${id}
          `;

        if (!assignments[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Assignment",
              id,
              message: `Assignment with id "${id}" not found`,
            }),
          );
        }

        // Delete the assignment
        yield* sql`
            DELETE FROM assignments WHERE id = ${id}
          `;
      }).pipe(
        Effect.catchTag("SqlError", (error) =>
          Effect.fail(
            new ValidationError({
              message: `Database error: ${error.message ?? "Unknown error"}`,
            }),
          ),
        ),
      );

    /**
     * Update an assignment's allocation percentage
     */
    const updateAllocation = (
      id: string,
      input: typeof UpdateAllocationInput.Type,
    ): Effect.Effect<typeof Assignment.Type, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // Validate input with Schema
        const validatedInput = yield* Schema.decodeUnknown(UpdateAllocationInput)(input).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              new ValidationError({
                message: `Invalid update data: ${error}`,
              }),
            ),
          ),
        );

        // Verify assignment exists
        const existing = yield* sql<typeof Assignment.Type>`
            SELECT * FROM assignments WHERE id = ${id}
          `;

        if (!existing[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Assignment",
              id,
              message: `Assignment with id "${id}" not found`,
            }),
          );
        }

        const now = new Date().toISOString();

        // Update allocation
        yield* sql`
            UPDATE assignments
            SET allocation_percentage = ${validatedInput.allocationPercentage},
                updated_at = ${now}
            WHERE id = ${id}
          `;

        // Fetch the updated assignment
        const updated = yield* sql<typeof Assignment.Type>`
            SELECT * FROM assignments WHERE id = ${id}
          `;

        if (!updated[0]) {
          return yield* Effect.fail(
            new ValidationError({
              message: `Assignment not found after update`,
            }),
          );
        }

        return updated[0] as typeof Assignment.Type;
      }).pipe(
        Effect.catchTag("SqlError", (error) =>
          Effect.fail(
            new ValidationError({
              message: `Database error: ${error.message ?? "Unknown error"}`,
            }),
          ),
        ),
      );

    /**
     * List all assignments for a person with task details
     * Uses JOIN to avoid N+1 queries (SA-003)
     */
    const listByPerson = (
      personId: string,
    ): Effect.Effect<ReadonlyArray<AssignmentWithTask>, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // Verify person exists
        const people = yield* sql<typeof Person.Type>`
            SELECT * FROM people WHERE id = ${personId}
          `;

        if (!people[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Person",
              id: personId,
              message: `Person with id "${personId}" not found`,
            }),
          );
        }

        // Fetch assignments with task details using JOIN (SA-003)
        const results = yield* sql`
            SELECT
              a.id as assignment_id,
              a.task_id,
              a.person_id,
              a.allocation_percentage,
              a.start_date,
              a.end_date,
              a.status as assignment_status,
              a.created_at as assignment_created_at,
              a.updated_at as assignment_updated_at,
              t.*
            FROM assignments a
            JOIN tasks t ON a.task_id = t.id
            WHERE a.person_id = ${personId}
            ORDER BY a.created_at DESC
          `;

        return results.map((row) => ({
          assignment: {
            id: row.assignmentId,
            taskId: row.taskId,
            personId: row.personId,
            allocationPercentage: row.allocationPercentage,
            startDate: row.startDate,
            endDate: row.endDate,
            status: row.assignmentStatus,
            createdAt: row.assignmentCreatedAt,
            updatedAt: row.assignmentUpdatedAt,
          } as unknown as typeof Assignment.Type,
          task: {
            id: row.id,
            projectId: row.projectId,
            milestoneId: row.milestoneId,
            name: row.name,
            description: row.description,
            status: row.status,
            priority: row.priority,
            estimatedHours: row.estimatedHours,
            actualHours: row.actualHours,
            orderIndex: row.orderIndex,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          } as unknown as typeof Task.Type,
        }));
      }).pipe(
        Effect.catchTag("SqlError", (error) =>
          Effect.fail(
            new ValidationError({
              message: `Database error: ${error.message ?? "Unknown error"}`,
            }),
          ),
        ),
      );

    /**
     * List all assignments for a task with person details
     * Uses JOIN to avoid N+1 queries (SA-003)
     */
    const listByTask = (
      taskId: string,
    ): Effect.Effect<ReadonlyArray<AssignmentWithPerson>, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // Verify task exists
        const tasks = yield* sql<typeof Task.Type>`
            SELECT * FROM tasks WHERE id = ${taskId}
          `;

        if (!tasks[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Task",
              id: taskId,
              message: `Task with id "${taskId}" not found`,
            }),
          );
        }

        // Fetch assignments with person details using JOIN (SA-003)
        type AssignmentPersonRow = typeof Assignment.Type & typeof Person.Type;
        const results = yield* sql<AssignmentPersonRow>`
            SELECT
              a.*,
              p.*
            FROM assignments a
            JOIN people p ON a.person_id = p.id
            WHERE a.task_id = ${taskId}
            ORDER BY a.created_at DESC
          `;

        return results.map((row) => ({
          assignment: {
            id: row.id,
            taskId: row.taskId,
            personId: row.personId,
            allocationPercentage: row.allocationPercentage,
            startDate: row.startDate,
            endDate: row.endDate,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          } as unknown as typeof Assignment.Type,
          person: row as unknown as typeof Person.Type,
        }));
      }).pipe(
        Effect.catchTag("SqlError", (error) =>
          Effect.fail(
            new ValidationError({
              message: `Database error: ${error.message ?? "Unknown error"}`,
            }),
          ),
        ),
      );

    /**
     * List all assignments for a project with person and task details
     * Uses JOIN to avoid N+1 queries (SA-003)
     */
    const listByProject = (
      projectId: string,
    ): Effect.Effect<ReadonlyArray<AssignmentWithDetails>, ValidationError> =>
      Effect.gen(function* () {
        // Fetch assignments with person and task details using JOIN (SA-003)
        const results = yield* sql`
            SELECT
              a.id as assignment_id,
              a.task_id as assignment_task_id,
              a.person_id as assignment_person_id,
              a.allocation_percentage,
              a.start_date,
              a.end_date,
              a.status as assignment_status,
              a.created_at as assignment_created_at,
              a.updated_at as assignment_updated_at,
              p.id as person_id,
              p.name as person_name,
              p.email as person_email,
              p.okta_user_id,
              p.capacity_hours_per_week,
              p.created_at as person_created_at,
              p.updated_at as person_updated_at,
              t.id as task_id,
              t.project_id,
              t.milestone_id,
              t.name as task_name,
              t.description as task_description,
              t.status as task_status,
              t.priority,
              t.estimated_hours,
              t.actual_hours,
              t.order_index,
              t.created_at as task_created_at,
              t.updated_at as task_updated_at
            FROM assignments a
            JOIN people p ON a.person_id = p.id
            JOIN tasks t ON a.task_id = t.id
            WHERE t.project_id = ${projectId}
            ORDER BY a.created_at DESC
          `;

        return results.map((row) => ({
          assignment: {
            id: row.assignmentId,
            taskId: row.assignmentTaskId,
            personId: row.assignmentPersonId,
            allocationPercentage: row.allocationPercentage,
            startDate: row.startDate,
            endDate: row.endDate,
            status: row.assignmentStatus,
            createdAt: row.assignmentCreatedAt,
            updatedAt: row.assignmentUpdatedAt,
          } as unknown as typeof Assignment.Type,
          person: {
            id: row.personId,
            name: row.personName,
            email: row.personEmail,
            oktaUserId: row.oktaUserId,
            capacityHoursPerWeek: row.capacityHoursPerWeek,
            createdAt: row.personCreatedAt,
            updatedAt: row.personUpdatedAt,
          } as unknown as typeof Person.Type,
          task: {
            id: row.taskId,
            projectId: row.projectId,
            milestoneId: row.milestoneId,
            name: row.taskName,
            description: row.taskDescription,
            status: row.taskStatus,
            priority: row.priority,
            estimatedHours: row.estimatedHours,
            actualHours: row.actualHours,
            orderIndex: row.orderIndex,
            createdAt: row.taskCreatedAt,
            updatedAt: row.taskUpdatedAt,
          } as unknown as typeof Task.Type,
        }));
      }).pipe(
        Effect.catchTag("SqlError", (error) =>
          Effect.fail(
            new ValidationError({
              message: `Database error: ${error.message ?? "Unknown error"}`,
            }),
          ),
        ),
      );

    return {
      assign,
      unassign,
      updateAllocation,
      listByPerson,
      listByTask,
      listByProject,
    } as const;
  }),
}) {}

/**
 * Live layer for AssignmentService with SqlClient dependency
 */
export const AssignmentServiceLive = AssignmentService.Default;
