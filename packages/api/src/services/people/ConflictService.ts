/**
 * ConflictService - Domain service for detecting scheduling conflicts
 * Uses Effect.Service with Layer pattern (SA-001)
 * Uses SQL aggregation for over-allocation detection (SA-003)
 * Detects: (1) over-allocation > 100%, (2) overlapping availability windows
 */

import { SqlClient } from "@effect/sql";
import { ValidationError } from "@sherpy/shared";
import { Effect, Schema } from "effect";

/**
 * Conflict type discriminator
 */
export const ConflictType = Schema.Literal("over_allocation", "availability_conflict");

export type ConflictType = typeof ConflictType.Type;

/**
 * Details for an over-allocation conflict
 */
export class OverAllocationDetail extends Schema.Class<OverAllocationDetail>(
  "OverAllocationDetail",
)({
  assignmentId: Schema.String,
  taskId: Schema.String,
  taskName: Schema.String,
  allocationPercentage: Schema.Number,
  startDate: Schema.optional(Schema.String),
  endDate: Schema.optional(Schema.String),
}) {}

/**
 * Details for an availability conflict
 */
export class AvailabilityConflictDetail extends Schema.Class<AvailabilityConflictDetail>(
  "AvailabilityConflictDetail",
)({
  windowId: Schema.String,
  startDate: Schema.String,
  endDate: Schema.String,
  type: Schema.String,
  description: Schema.optional(Schema.String),
}) {}

/**
 * Conflict schema - represents a detected scheduling conflict
 */
export class Conflict extends Schema.Class<Conflict>("Conflict")({
  type: ConflictType,
  personId: Schema.String,
  personName: Schema.String,
  totalAllocation: Schema.optional(Schema.Number), // For over-allocation conflicts
  overAllocationDetails: Schema.optional(Schema.Array(OverAllocationDetail)),
  availabilityConflictDetails: Schema.optional(Schema.Array(AvailabilityConflictDetail)),
  message: Schema.String,
}) {}

/**
 * ConflictService - Effect.Service for conflict detection operations
 */
export class ConflictService extends Effect.Service<ConflictService>()("ConflictService", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    /**
     * Detect over-allocation for a person within a date range
     * Uses SQL aggregation to sum allocations for overlapping assignments (SA-003)
     */
    const detectOverAllocation = (
      personId: string,
      startDate: string,
      endDate: string,
    ): Effect.Effect<ReadonlyArray<typeof Conflict.Type>, ValidationError> =>
      Effect.gen(function* () {
        // Use SQL to find overlapping assignments and sum allocations
        // Two date ranges overlap if: start1 < end2 AND start2 < end1
        // For assignments with NULL dates, we consider them as always overlapping
        const results = yield* sql`
          SELECT
            a.id as assignment_id,
            a.task_id,
            a.person_id,
            a.allocation_percentage,
            a.start_date,
            a.end_date,
            t.name as task_name,
            p.name as person_name
          FROM assignments a
          JOIN tasks t ON a.task_id = t.id
          JOIN people p ON a.person_id = p.id
          WHERE a.person_id = ${personId}
            AND (
              -- Both assignment dates are NULL (always active)
              (a.start_date IS NULL AND a.end_date IS NULL)
              -- Assignment has dates and overlaps with query range
              OR (
                a.start_date IS NOT NULL
                AND a.end_date IS NOT NULL
                AND a.start_date < ${endDate}
                AND ${startDate} < a.end_date
              )
              -- Assignment has only start date (ongoing)
              OR (
                a.start_date IS NOT NULL
                AND a.end_date IS NULL
                AND a.start_date < ${endDate}
              )
              -- Assignment has only end date (started in past)
              OR (
                a.start_date IS NULL
                AND a.end_date IS NOT NULL
                AND ${startDate} < a.end_date
              )
            )
          ORDER BY a.start_date ASC NULLS FIRST
        `;

        if (results.length === 0) {
          return [];
        }

        // Calculate total allocation
        const totalAllocation = results.reduce(
          (sum, row) => sum + (row.allocationPercentage as number),
          0,
        );

        // If total > 100%, create a conflict
        if (totalAllocation > 100) {
          const personName = results[0]?.personName as string;

          const details = results.map(
            (row) =>
              ({
                assignmentId: row.assignmentId as string,
                taskId: row.taskId as string,
                taskName: row.taskName as string,
                allocationPercentage: row.allocationPercentage as number,
                startDate: row.startDate as string | undefined,
                endDate: row.endDate as string | undefined,
              }) as typeof OverAllocationDetail.Type,
          );

          const conflict: typeof Conflict.Type = {
            type: "over_allocation",
            personId,
            personName,
            totalAllocation,
            overAllocationDetails: details,
            message: `Person ${personName} is over-allocated at ${totalAllocation}% (maximum 100%) for the period ${startDate} to ${endDate}`,
          };

          return [conflict];
        }

        return [];
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
     * Detect overlapping availability windows for a person
     * Uses SQL range comparison to find conflicts (SA-003)
     */
    const detectAvailabilityConflicts = (
      personId: string,
    ): Effect.Effect<ReadonlyArray<typeof Conflict.Type>, ValidationError> =>
      Effect.gen(function* () {
        // Self-join to find pairs of overlapping windows
        // Two ranges overlap if: start1 < end2 AND start2 < end1
        const results = yield* sql`
          SELECT
            w1.id as window1_id,
            w1.start_date as window1_start,
            w1.end_date as window1_end,
            w1.type as window1_type,
            w1.description as window1_description,
            w2.id as window2_id,
            w2.start_date as window2_start,
            w2.end_date as window2_end,
            w2.type as window2_type,
            w2.description as window2_description,
            p.name as person_name
          FROM availability_windows w1
          JOIN availability_windows w2 ON w1.person_id = w2.person_id
          JOIN people p ON w1.person_id = p.id
          WHERE w1.person_id = ${personId}
            AND w1.id < w2.id
            AND w1.start_date < w2.end_date
            AND w2.start_date < w1.end_date
          ORDER BY w1.start_date ASC
        `;

        if (results.length === 0) {
          return [];
        }

        // Group overlapping windows into conflicts
        const conflicts: Array<typeof Conflict.Type> = [];
        const personName = results[0]?.personName as string;

        for (const row of results) {
          const details: Array<typeof AvailabilityConflictDetail.Type> = [
            {
              windowId: row.window1Id as string,
              startDate: row.window1Start as string,
              endDate: row.window1End as string,
              type: row.window1Type as string,
              description: row.window1Description as string | undefined,
            },
            {
              windowId: row.window2Id as string,
              startDate: row.window2Start as string,
              endDate: row.window2End as string,
              type: row.window2Type as string,
              description: row.window2Description as string | undefined,
            },
          ];

          const conflict: typeof Conflict.Type = {
            type: "availability_conflict",
            personId,
            personName,
            availabilityConflictDetails: details,
            message: `Person ${personName} has overlapping availability windows: ${row.window1Start} to ${row.window1End} and ${row.window2Start} to ${row.window2End}`,
          };

          conflicts.push(conflict);
        }

        return conflicts;
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
     * Detect all conflicts for a person within a date range
     * Combines over-allocation and availability conflict detection
     */
    const detectAllConflictsForPerson = (
      personId: string,
      startDate: string,
      endDate: string,
    ): Effect.Effect<ReadonlyArray<typeof Conflict.Type>, ValidationError> =>
      Effect.gen(function* () {
        // Verify person exists
        const people = yield* sql`
          SELECT id, name FROM people WHERE id = ${personId}
        `;

        if (!people[0]) {
          return yield* Effect.fail(
            new ValidationError({
              message: `Person with id "${personId}" not found`,
            }),
          );
        }

        // Run both detection methods
        const overAllocationConflicts = yield* detectOverAllocation(personId, startDate, endDate);
        const availabilityConflicts = yield* detectAvailabilityConflicts(personId);

        return [...overAllocationConflicts, ...availabilityConflicts];
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
      detectOverAllocation,
      detectAvailabilityConflicts,
      detectAllConflictsForPerson,
    } as const;
  }),
}) {}

/**
 * Live layer for ConflictService with SqlClient dependency
 */
export const ConflictServiceLive = ConflictService.Default;
