/**
 * ResourceAllocationService - Aggregated resource allocation views
 * Uses Effect.Service with Layer pattern (SA-001)
 * Uses SQL aggregation with GROUP BY and SUM (SA-003)
 */

import { SqlClient } from "@effect/sql";
import { Assignment, type Person, Project, Task, ValidationError } from "@sherpy/shared";
import { Effect, Schema } from "effect";

/**
 * Assignment detail within a person's allocation breakdown
 */
export class AssignmentDetail extends Schema.Class<AssignmentDetail>("AssignmentDetail")({
  assignmentId: Schema.String,
  taskId: Schema.String,
  taskName: Schema.String,
  projectId: Schema.String,
  projectName: Schema.String,
  allocation: Schema.Number,
}) {}

/**
 * Person allocation across all projects
 */
export class PersonAllocation extends Schema.Class<PersonAllocation>("PersonAllocation")({
  personId: Schema.String,
  personName: Schema.String,
  totalAllocation: Schema.Number,
  assignments: Schema.Array(AssignmentDetail),
}) {}

/**
 * Person detail within a project's allocation breakdown
 */
export class PersonDetail extends Schema.Class<PersonDetail>("PersonDetail")({
  personId: Schema.String,
  personName: Schema.String,
  allocation: Schema.Number,
  assignmentCount: Schema.Number,
}) {}

/**
 * Project allocation broken down by people
 */
export class ProjectAllocation extends Schema.Class<ProjectAllocation>("ProjectAllocation")({
  projectId: Schema.String,
  projectName: Schema.String,
  totalAllocation: Schema.Number,
  people: Schema.Array(PersonDetail),
}) {}

/**
 * Project summary for a person's allocation breakdown
 */
export class PersonProjectAllocation extends Schema.Class<PersonProjectAllocation>(
  "PersonProjectAllocation",
)({
  projectId: Schema.String,
  projectName: Schema.String,
  totalAllocation: Schema.Number,
  assignmentCount: Schema.Number,
}) {}

/**
 * ResourceAllocationService - Effect.Service for resource allocation aggregation
 */
export class ResourceAllocationService extends Effect.Service<ResourceAllocationService>()(
  "ResourceAllocationService",
  {
    effect: Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      /**
       * Get total allocation per person across all projects
       * Uses SQL GROUP BY and SUM for aggregation (SA-003)
       */
      const allocationByPerson = (): Effect.Effect<
        ReadonlyArray<typeof PersonAllocation.Type>,
        ValidationError
      > =>
        Effect.gen(function* () {
          // Aggregate total allocation per person using SQL
          const aggregated = yield* sql`
            SELECT
              p.id as person_id,
              p.name as person_name,
              COALESCE(SUM(a.allocation_percentage), 0) as total_allocation
            FROM people p
            LEFT JOIN assignments a ON p.id = a.person_id
            GROUP BY p.id, p.name
            ORDER BY p.name ASC
          `;

          // Get assignment details for each person
          const allAllocations: Array<typeof PersonAllocation.Type> = [];

          for (const row of aggregated) {
            const personId = row.personId as string;

            // Fetch assignment details for this person
            const assignments = yield* sql`
              SELECT
                a.id as assignment_id,
                a.task_id,
                a.allocation_percentage,
                t.name as task_name,
                t.project_id,
                pr.name as project_name
              FROM assignments a
              JOIN tasks t ON a.task_id = t.id
              JOIN projects pr ON t.project_id = pr.id
              WHERE a.person_id = ${personId}
              ORDER BY pr.name ASC, t.name ASC
            `;

            const assignmentDetails: Array<typeof AssignmentDetail.Type> = assignments.map((a) => ({
              assignmentId: a.assignmentId as string,
              taskId: a.taskId as string,
              taskName: a.taskName as string,
              projectId: a.projectId as string,
              projectName: a.projectName as string,
              allocation: a.allocationPercentage as number,
            }));

            allAllocations.push({
              personId,
              personName: row.personName as string,
              totalAllocation: row.totalAllocation as number,
              assignments: assignmentDetails,
            });
          }

          return allAllocations;
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
       * Get total allocation per project broken down by people
       * Uses SQL GROUP BY and SUM for aggregation (SA-003)
       */
      const allocationByProject = (): Effect.Effect<
        ReadonlyArray<typeof ProjectAllocation.Type>,
        ValidationError
      > =>
        Effect.gen(function* () {
          // Aggregate total allocation per project using SQL
          const aggregated = yield* sql`
            SELECT
              pr.id as project_id,
              pr.name as project_name,
              COALESCE(SUM(a.allocation_percentage), 0) as total_allocation
            FROM projects pr
            LEFT JOIN tasks t ON pr.id = t.project_id
            LEFT JOIN assignments a ON t.id = a.task_id
            GROUP BY pr.id, pr.name
            ORDER BY pr.name ASC
          `;

          // Get person breakdown for each project
          const allAllocations: Array<typeof ProjectAllocation.Type> = [];

          for (const row of aggregated) {
            const projectId = row.projectId as string;

            // Aggregate allocation per person for this project
            const personBreakdown = yield* sql`
              SELECT
                p.id as person_id,
                p.name as person_name,
                SUM(a.allocation_percentage) as allocation,
                COUNT(a.id) as assignment_count
              FROM people p
              JOIN assignments a ON p.id = a.person_id
              JOIN tasks t ON a.task_id = t.id
              WHERE t.project_id = ${projectId}
              GROUP BY p.id, p.name
              ORDER BY p.name ASC
            `;

            const people: Array<typeof PersonDetail.Type> = personBreakdown.map((p) => ({
              personId: p.personId as string,
              personName: p.personName as string,
              allocation: p.allocation as number,
              assignmentCount: p.assignmentCount as number,
            }));

            allAllocations.push({
              projectId,
              projectName: row.projectName as string,
              totalAllocation: row.totalAllocation as number,
              people,
            });
          }

          return allAllocations;
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
       * Get allocation breakdown for a specific person across their projects
       * Uses SQL GROUP BY and SUM for aggregation (SA-003)
       */
      const personAllocationByProject = (
        personId: string,
      ): Effect.Effect<ReadonlyArray<typeof PersonProjectAllocation.Type>, ValidationError> =>
        Effect.gen(function* () {
          // Verify person exists
          const people = yield* sql<typeof Person.Type>`
            SELECT * FROM people WHERE id = ${personId}
          `;

          if (!people[0]) {
            return yield* Effect.fail(
              new ValidationError({
                message: `Person with id "${personId}" not found`,
              }),
            );
          }

          // Aggregate allocation per project for this person using SQL
          const results = yield* sql`
            SELECT
              pr.id as project_id,
              pr.name as project_name,
              SUM(a.allocation_percentage) as total_allocation,
              COUNT(a.id) as assignment_count
            FROM projects pr
            JOIN tasks t ON pr.id = t.project_id
            JOIN assignments a ON t.id = a.task_id
            WHERE a.person_id = ${personId}
            GROUP BY pr.id, pr.name
            ORDER BY pr.name ASC
          `;

          return results.map((row) => ({
            projectId: row.projectId as string,
            projectName: row.projectName as string,
            totalAllocation: row.totalAllocation as number,
            assignmentCount: row.assignmentCount as number,
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
        allocationByPerson,
        allocationByProject,
        personAllocationByProject,
      } as const;
    }),
  },
) {}

/**
 * Live layer for ResourceAllocationService with SqlClient dependency
 */
export const ResourceAllocationServiceLive = ResourceAllocationService.Default;
