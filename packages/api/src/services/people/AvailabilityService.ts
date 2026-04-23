/**
 * AvailabilityService - Domain service for availability window operations
 * Uses Effect.Service with Layer pattern (SA-001)
 * Uses Model.makeRepository for basic CRUD (SA-002)
 * Uses SQL range comparison for overlapping windows (SA-003)
 */

import { randomUUID } from "node:crypto";
import { Model, SqlClient } from "@effect/sql";
import {
  type AvailabilityType,
  AvailabilityWindow,
  NotFoundError,
  ValidationError,
} from "@sherpy/shared";
import { Effect, Schema } from "effect";

/**
 * Input for creating an availability window
 */
export class CreateAvailabilityInput extends Schema.Class<CreateAvailabilityInput>(
  "CreateAvailabilityInput",
)({
  personId: Schema.String,
  startDate: Schema.String, // ISO 8601 date
  endDate: Schema.String, // ISO 8601 date
  type: Schema.Literal("pto", "other-project", "training", "unavailable"),
  description: Schema.optional(Schema.String),
}) {}

/**
 * Input for updating an availability window
 */
export class UpdateAvailabilityInput extends Schema.Class<UpdateAvailabilityInput>(
  "UpdateAvailabilityInput",
)({
  startDate: Schema.optional(Schema.String),
  endDate: Schema.optional(Schema.String),
  type: Schema.optional(Schema.Literal("pto", "other-project", "training", "unavailable")),
  description: Schema.optional(Schema.String),
}) {}

/**
 * AvailabilityService - Effect.Service for availability window domain operations
 */
export class AvailabilityService extends Effect.Service<AvailabilityService>()(
  "AvailabilityService",
  {
    effect: Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      // Create repository using Model.makeRepository (SA-002)
      const repo = yield* Model.makeRepository(AvailabilityWindow, {
        tableName: "availability_windows",
        idColumn: "id",
        spanPrefix: "AvailabilityRepository",
      });

      /**
       * Validate date range: startDate < endDate
       */
      const validateDateRange = (
        startDate: string,
        endDate: string,
      ): Effect.Effect<void, ValidationError> =>
        Effect.gen(function* () {
          const start = new Date(startDate);
          const end = new Date(endDate);

          if (Number.isNaN(start.getTime())) {
            return yield* Effect.fail(
              new ValidationError({
                message: `Invalid startDate: ${startDate}`,
              }),
            );
          }

          if (Number.isNaN(end.getTime())) {
            return yield* Effect.fail(
              new ValidationError({
                message: `Invalid endDate: ${endDate}`,
              }),
            );
          }

          if (start >= end) {
            return yield* Effect.fail(
              new ValidationError({
                message: `startDate must be before endDate (${startDate} >= ${endDate})`,
              }),
            );
          }
        });

      /**
       * Create a new availability window
       */
      const create = (
        input: typeof CreateAvailabilityInput.Type,
      ): Effect.Effect<typeof AvailabilityWindow.Type, NotFoundError | ValidationError> =>
        Effect.gen(function* () {
          // Validate input with Schema
          const validatedInput = yield* Schema.decodeUnknown(CreateAvailabilityInput)(input).pipe(
            Effect.catchAll((error) =>
              Effect.fail(
                new ValidationError({
                  message: `Invalid availability data: ${error}`,
                }),
              ),
            ),
          );

          // Validate date range
          yield* validateDateRange(validatedInput.startDate, validatedInput.endDate);

          // Verify person exists
          const people = yield* sql`
            SELECT id FROM people WHERE id = ${validatedInput.personId}
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

          // Create availability window with generated UUID
          const id = randomUUID();
          const now = new Date().toISOString();

          yield* sql`
            INSERT INTO availability_windows (
              id, person_id, start_date, end_date, type, description, created_at
            ) VALUES (
              ${id}, ${validatedInput.personId}, ${validatedInput.startDate},
              ${validatedInput.endDate}, ${validatedInput.type}, ${validatedInput.description ?? null},
              ${now}
            )
          `;

          // Fetch the created availability window
          const windows = yield* sql<typeof AvailabilityWindow.Type>`
            SELECT * FROM availability_windows WHERE id = ${id}
          `;

          if (!windows[0]) {
            return yield* Effect.fail(
              new ValidationError({
                message: `Availability window not found after insert`,
              }),
            );
          }

          return windows[0] as typeof AvailabilityWindow.Type;
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
       * Update an availability window
       */
      const update = (
        id: string,
        input: typeof UpdateAvailabilityInput.Type,
      ): Effect.Effect<typeof AvailabilityWindow.Type, NotFoundError | ValidationError> =>
        Effect.gen(function* () {
          // Validate input with Schema
          const validatedInput = yield* Schema.decodeUnknown(UpdateAvailabilityInput)(input).pipe(
            Effect.catchAll((error) =>
              Effect.fail(
                new ValidationError({
                  message: `Invalid update data: ${error}`,
                }),
              ),
            ),
          );

          // Verify window exists
          const existing = yield* sql<typeof AvailabilityWindow.Type>`
            SELECT * FROM availability_windows WHERE id = ${id}
          `;

          if (!existing[0]) {
            return yield* Effect.fail(
              new NotFoundError({
                entity: "AvailabilityWindow",
                id,
                message: `Availability window with id "${id}" not found`,
              }),
            );
          }

          const existingWindow = existing[0];

          // Build update fields - merge with existing values
          const startDate = validatedInput.startDate ?? existingWindow.startDate;
          const endDate = validatedInput.endDate ?? existingWindow.endDate;
          const type = validatedInput.type ?? existingWindow.type;
          const description =
            validatedInput.description !== undefined
              ? validatedInput.description
              : existingWindow.description;

          // Validate date range
          yield* validateDateRange(startDate, endDate);

          // Update with raw SQL
          yield* sql`
            UPDATE availability_windows
            SET start_date = ${startDate},
                end_date = ${endDate},
                type = ${type},
                description = ${description ?? null}
            WHERE id = ${id}
          `;

          // Fetch the updated window
          const updated = yield* sql<typeof AvailabilityWindow.Type>`
            SELECT * FROM availability_windows WHERE id = ${id}
          `;

          if (!updated[0]) {
            return yield* Effect.fail(
              new ValidationError({
                message: `Availability window not found after update`,
              }),
            );
          }

          return updated[0] as typeof AvailabilityWindow.Type;
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
       * Remove an availability window
       */
      const remove = (id: string): Effect.Effect<void, NotFoundError | ValidationError> =>
        Effect.gen(function* () {
          // Verify window exists
          const existing = yield* sql<typeof AvailabilityWindow.Type>`
            SELECT * FROM availability_windows WHERE id = ${id}
          `;

          if (!existing[0]) {
            return yield* Effect.fail(
              new NotFoundError({
                entity: "AvailabilityWindow",
                id,
                message: `Availability window with id "${id}" not found`,
              }),
            );
          }

          // Delete the window
          yield* sql`
            DELETE FROM availability_windows WHERE id = ${id}
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
       * List all availability windows for a person
       */
      const listByPerson = (
        personId: string,
      ): Effect.Effect<
        ReadonlyArray<typeof AvailabilityWindow.Type>,
        NotFoundError | ValidationError
      > =>
        Effect.gen(function* () {
          // Verify person exists
          const people = yield* sql`
            SELECT id FROM people WHERE id = ${personId}
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

          // Fetch windows for person, ordered by start date
          const windows = yield* sql<typeof AvailabilityWindow.Type>`
            SELECT * FROM availability_windows
            WHERE person_id = ${personId}
            ORDER BY start_date ASC
          `;

          return windows as ReadonlyArray<typeof AvailabilityWindow.Type>;
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
       * List availability windows that overlap with a given date range
       * Uses SQL range comparison (SA-003)
       * Two ranges overlap if: startA < endB AND startB < endA
       */
      const listOverlapping = (
        startDate: string,
        endDate: string,
        personId?: string,
      ): Effect.Effect<ReadonlyArray<typeof AvailabilityWindow.Type>, ValidationError> =>
        Effect.gen(function* () {
          // Validate date range
          yield* validateDateRange(startDate, endDate);

          // Use SQL range overlap check: (start_date < endDate) AND (startDate < end_date)
          const windows = personId
            ? yield* sql<typeof AvailabilityWindow.Type>`
                SELECT * FROM availability_windows
                WHERE person_id = ${personId}
                  AND start_date < ${endDate}
                  AND ${startDate} < end_date
                ORDER BY start_date ASC
              `
            : yield* sql<typeof AvailabilityWindow.Type>`
                SELECT * FROM availability_windows
                WHERE start_date < ${endDate}
                  AND ${startDate} < end_date
                ORDER BY start_date ASC
              `;

          return windows as ReadonlyArray<typeof AvailabilityWindow.Type>;
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
        update,
        remove,
        listByPerson,
        listOverlapping,
      } as const;
    }),
  },
) {}

/**
 * Live layer for AvailabilityService with SqlClient dependency
 */
export const AvailabilityServiceLive = AvailabilityService.Default;
