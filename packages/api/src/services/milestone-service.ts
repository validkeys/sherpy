/**
 * MilestoneService - Domain service for milestone CRUD operations
 * Uses Effect.Service with Layer pattern (SA-001)
 * Uses Model.makeRepository for basic CRUD (SA-002)
 */

import { randomUUID } from "node:crypto";
import { Model, SqlClient } from "@effect/sql";
import {
  type ConflictError,
  Milestone,
  type MilestoneStatus,
  NotFoundError,
  ValidationError,
} from "@sherpy/shared";
import { Effect, Layer, Option, Schema } from "effect";

/**
 * Input for creating a milestone
 */
export class CreateMilestoneInput extends Schema.Class<CreateMilestoneInput>(
  "CreateMilestoneInput",
)({
  projectId: Schema.String,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  description: Schema.optional(Schema.String),
  estimatedDays: Schema.optional(Schema.Number.pipe(Schema.positive())),
  acceptanceCriteria: Schema.optional(Schema.String),
}) {}

/**
 * Input for updating a milestone
 */
export class UpdateMilestoneInput extends Schema.Class<UpdateMilestoneInput>(
  "UpdateMilestoneInput",
)({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  description: Schema.optional(Schema.String),
  status: Schema.optional(Schema.Literal("pending", "in-progress", "blocked", "complete")),
  estimatedDays: Schema.optional(Schema.Number.pipe(Schema.positive())),
  acceptanceCriteria: Schema.optional(Schema.String),
}) {}

/**
 * Input for reordering milestones
 */
export class ReorderMilestonesInput extends Schema.Class<ReorderMilestonesInput>(
  "ReorderMilestonesInput",
)({
  milestoneIds: Schema.Array(Schema.String),
}) {}

/**
 * MilestoneService - Effect.Service for milestone domain operations
 */
export class MilestoneService extends Effect.Service<MilestoneService>()("MilestoneService", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    // Create repository using Model.makeRepository (SA-002)
    const repo = yield* Model.makeRepository(Milestone, {
      tableName: "milestones",
      idColumn: "id",
      spanPrefix: "MilestoneRepository",
    });

    /**
     * Create a new milestone
     */
    const create = (
      input: typeof CreateMilestoneInput.Type,
    ): Effect.Effect<typeof Milestone.Type, NotFoundError | ValidationError | ConflictError> =>
      Effect.gen(function* () {
        // Validate that project exists
        const projectCheck = yield* sql<{ count: number }>`
            SELECT COUNT(*) as count FROM projects WHERE id = ${input.projectId}
          `;

        if (!projectCheck[0] || projectCheck[0].count === 0) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Project",
              id: input.projectId,
              message: `Project with id "${input.projectId}" not found`,
            }),
          );
        }

        // Get max orderIndex for this project to set new milestone at the end
        const maxOrderResult = yield* sql<{ maxOrder: number | null }>`
            SELECT MAX(order_index) as maxOrder FROM milestones WHERE project_id = ${input.projectId}
          `;
        const orderIndex = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

        // Create milestone with generated UUID
        const id = randomUUID();
        const now = new Date().toISOString();
        const status: MilestoneStatus = "pending";

        yield* sql`
            INSERT INTO milestones (
              id, project_id, name, description, status,
              order_index, estimated_days, acceptance_criteria,
              created_at, updated_at
            ) VALUES (
              ${id}, ${input.projectId}, ${input.name}, ${input.description ?? ""},
              ${status}, ${orderIndex}, ${input.estimatedDays ?? null},
              ${input.acceptanceCriteria ?? null}, ${now}, ${now}
            )
          `;

        // Fetch the created milestone using the repository to get proper schema decoding
        const milestone = yield* repo.findById(id);

        if (Option.isNone(milestone)) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Milestone",
              id,
              message: `Milestone not found after insert`,
            }),
          );
        }

        return milestone.value;
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
     * List milestones for a project, ordered by orderIndex
     */
    const listByProject = (
      projectId: string,
    ): Effect.Effect<Array<typeof Milestone.Type>, ValidationError> =>
      Effect.gen(function* () {
        const milestones = yield* sql<typeof Milestone.Type>`
            SELECT * FROM milestones
            WHERE project_id = ${projectId}
            ORDER BY order_index ASC
          `;
        return milestones as Array<typeof Milestone.Type>;
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
     * Get a milestone by ID
     */
    const get = (id: string): Effect.Effect<typeof Milestone.Type, NotFoundError> =>
      Effect.gen(function* () {
        const milestone = yield* repo.findById(id);

        if (Option.isNone(milestone)) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Milestone",
              id,
              message: `Milestone with id "${id}" not found`,
            }),
          );
        }

        return milestone.value;
      });

    /**
     * Update a milestone
     */
    const update = (
      id: string,
      input: typeof UpdateMilestoneInput.Type,
    ): Effect.Effect<typeof Milestone.Type, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // First get the existing milestone
        const existing = yield* get(id);

        // Update only provided fields
        const updated = yield* repo.update({
          id,
          projectId: existing.projectId,
          name: input.name ?? existing.name,
          description: input.description ?? existing.description,
          status: (input.status ?? existing.status) as MilestoneStatus,
          orderIndex: existing.orderIndex,
          estimatedDays: input.estimatedDays ?? existing.estimatedDays,
          acceptanceCriteria: input.acceptanceCriteria ?? existing.acceptanceCriteria,
          updatedAt: undefined, // Let Model.DateTimeUpdate handle this
        });

        return updated;
      });

    /**
     * Reorder milestones within a project atomically
     * Takes an array of milestone IDs in the desired order
     */
    const reorder = (
      projectId: string,
      input: typeof ReorderMilestonesInput.Type,
    ): Effect.Effect<void, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // Validate that all milestones exist and belong to the project
        const existingMilestones = yield* listByProject(projectId);
        const existingIds = new Set(existingMilestones.map((m) => m.id));

        // Check that all provided IDs exist
        for (const id of input.milestoneIds) {
          if (!existingIds.has(id)) {
            return yield* Effect.fail(
              new NotFoundError({
                entity: "Milestone",
                id,
                message: `Milestone with id "${id}" not found in project "${projectId}"`,
              }),
            );
          }
        }

        // Check that all existing milestones are included
        if (input.milestoneIds.length !== existingMilestones.length) {
          return yield* Effect.fail(
            new ValidationError({
              message: `Reorder must include all milestones for project. Expected ${existingMilestones.length}, got ${input.milestoneIds.length}`,
            }),
          );
        }

        // Update orderIndex for each milestone in a transaction
        yield* sql.withTransaction(
          Effect.gen(function* () {
            for (let i = 0; i < input.milestoneIds.length; i++) {
              const milestoneId = input.milestoneIds[i]!;
              const now = new Date().toISOString();
              yield* sql`
                  UPDATE milestones
                  SET order_index = ${i}, updated_at = ${now}
                  WHERE id = ${milestoneId}
                `;
            }
          }),
        );
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
      create,
      listByProject,
      get,
      update,
      reorder,
    } as const;
  }),
}) {}

/**
 * Live layer for MilestoneService with SqlClient dependency
 */
export const MilestoneServiceLive = MilestoneService.Default;
