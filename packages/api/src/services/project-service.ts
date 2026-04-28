/**
 * ProjectService - Domain service for project CRUD operations
 * Uses Effect.Service with Layer pattern (SA-001)
 * Uses manual SQL queries with field aliases for snake_case to camelCase mapping
 */

import { randomUUID } from "node:crypto";
import { SqlClient } from "@effect/sql";
import {
  ConflictError,
  NotFoundError,
  type PipelineStatus,
  type Priority,
  Project,
  ValidationError,
} from "@sherpy/shared";
import { Effect, Layer, Schema } from "effect";

/**
 * Project filters for list queries
 */
export class ProjectFilters extends Schema.Class<ProjectFilters>("ProjectFilters")({
  pipelineStatus: Schema.optional(Schema.Array(Schema.String)),
  priority: Schema.optional(Schema.Array(Schema.String)),
  search: Schema.optional(Schema.String),
  limit: Schema.optional(Schema.Number),
  offset: Schema.optional(Schema.Number),
}) {}

/**
 * Input for creating a project
 */
export class CreateProjectInput extends Schema.Class<CreateProjectInput>("CreateProjectInput")({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  description: Schema.optional(Schema.String),
  slug: Schema.optional(
    Schema.String.pipe(
      Schema.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      Schema.minLength(1),
      Schema.maxLength(100),
    ),
  ),
  tags: Schema.optional(Schema.Array(Schema.String)),
  priority: Schema.optional(Schema.Literal("low", "medium", "high", "critical")),
}) {}

/**
 * Input for updating a project
 */
export class UpdateProjectInput extends Schema.Class<UpdateProjectInput>("UpdateProjectInput")({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  description: Schema.optional(Schema.String),
  pipelineStatus: Schema.optional(Schema.String),
  tags: Schema.optional(Schema.Array(Schema.String)),
  priority: Schema.optional(Schema.Literal("low", "medium", "high", "critical")),
}) {}

/**
 * ProjectService - Effect.Service for project domain operations
 */
export class ProjectService extends Effect.Service<ProjectService>()("ProjectService", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    /**
     * Generate a slug from a project name
     */
    const generateSlug = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    };

    /**
     * Create a new project
     */
    const create = (
      input: typeof CreateProjectInput.Type,
    ): Effect.Effect<typeof Project.Type, NotFoundError | ValidationError | ConflictError> =>
      Effect.gen(function* () {
        // Generate slug if not provided
        const slug = input.slug ?? generateSlug(input.name);

        // Check for duplicate slug
        const existing = yield* sql<{ count: number }>`
            SELECT COUNT(*) as count FROM projects WHERE slug = ${slug}
          `;

        if (existing[0] && existing[0].count > 0) {
          return yield* Effect.fail(
            new ConflictError({
              resource: "Project",
              conflictType: "duplicate" as const,
              message: `Project with slug "${slug}" already exists`,
            }),
          );
        }

        // Create project with generated UUID
        const id = randomUUID();
        const now = new Date().toISOString();
        const pipelineStatus: PipelineStatus = "intake";
        const priority: Priority = (input.priority ?? "medium") as Priority;

        yield* sql`
            INSERT INTO projects (
              id, slug, name, description, pipeline_status,
              assigned_people, tags, priority, created_at, updated_at
            ) VALUES (
              ${id}, ${slug}, ${input.name}, ${input.description ?? ""},
              ${pipelineStatus}, ${JSON.stringify([])}, ${JSON.stringify(input.tags ?? [])},
              ${priority}, ${now}, ${now}
            )
          `;

        // Fetch the created project with field aliases to match schema
        const rows = yield* sql`
          SELECT
            id, slug, name, description,
            pipeline_status as "pipelineStatus",
            assigned_people as "assignedPeople",
            tags, priority,
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM projects
          WHERE id = ${id}
        `;

        if (rows.length === 0 || !rows[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Project",
              id,
              message: `Project not found after insert`,
            }),
          );
        }

        // Decode the row using the Project schema
        const project = yield* Schema.decodeUnknown(Project)(rows[0]).pipe(
          Effect.catchTag("ParseError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Failed to parse project data: ${error.message}`,
              }),
            ),
          ),
        );

        return project;
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
     * List projects with optional filters
     */
    const list = (
      filters: typeof ProjectFilters.Type = {},
    ): Effect.Effect<Array<typeof Project.Type>, ValidationError> =>
      Effect.gen(function* () {
        // Build WHERE conditions
        const conditions: string[] = [];
        const hasStatusFilter = filters.pipelineStatus && filters.pipelineStatus.length > 0;
        const hasPriorityFilter = filters.priority && filters.priority.length > 0;
        const hasSearch = filters.search && filters.search.length > 0;

        // Simple non-filtered query
        if (!hasStatusFilter && !hasPriorityFilter && !hasSearch) {
          const rows = yield* sql`
              SELECT
                id, slug, name, description,
                pipeline_status as "pipelineStatus",
                assigned_people as "assignedPeople",
                tags, priority,
                created_at as "createdAt",
                updated_at as "updatedAt"
              FROM projects
              ORDER BY updated_at DESC
              ${filters.limit ? sql` LIMIT ${filters.limit}` : sql``}
              ${filters.offset ? sql` OFFSET ${filters.offset}` : sql``}
            `;
          // Decode each row using the Project schema
          const projects = yield* Effect.all(
            rows.map((row) => Schema.decodeUnknown(Project)(row)),
            { concurrency: "unbounded" },
          ).pipe(
            Effect.catchTag("ParseError", (error) =>
              Effect.fail(
                new ValidationError({
                  message: `Failed to parse project data: ${error.message}`,
                }),
              ),
            ),
          );
          return projects;
        }

        // Filtered query - build WHERE clause
        let query = `SELECT
          id, slug, name, description,
          pipeline_status as "pipelineStatus",
          assigned_people as "assignedPeople",
          tags, priority,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM projects WHERE 1=1`;

        if (hasStatusFilter) {
          const statusList = filters.pipelineStatus!.map((s) => `'${s}'`).join(",");
          query += ` AND pipeline_status IN (${statusList})`;
        }

        if (hasPriorityFilter) {
          const priorityList = filters.priority!.map((p) => `'${p}'`).join(",");
          query += ` AND priority IN (${priorityList})`;
        }

        if (hasSearch) {
          const searchTerm = filters.search!.replace(/'/g, "''"); // Escape quotes
          query += ` AND (name LIKE '%${searchTerm}%' OR description LIKE '%${searchTerm}%')`;
        }

        query += " ORDER BY updated_at DESC";

        if (filters.limit) {
          query += ` LIMIT ${filters.limit}`;
        }

        if (filters.offset) {
          query += ` OFFSET ${filters.offset}`;
        }

        const rows = yield* sql.unsafe(query);
        // Decode each row using the Project schema
        const projects = yield* Effect.all(
          rows.map((row) => Schema.decodeUnknown(Project)(row)),
          { concurrency: "unbounded" },
        ).pipe(
          Effect.catchTag("ParseError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Failed to parse project data: ${error.message}`,
              }),
            ),
          ),
        );
        return projects;
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
     * Get a project by ID
     */
    const get = (id: string): Effect.Effect<typeof Project.Type, NotFoundError> =>
      Effect.gen(function* () {
        // Manual query with field aliases to match Project schema
        const rows = yield* sql`
          SELECT
            id, slug, name, description,
            pipeline_status as "pipelineStatus",
            assigned_people as "assignedPeople",
            tags, priority,
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM projects
          WHERE id = ${id}
        `.pipe(Effect.orDie); // Convert SQL errors to defects

        if (rows.length === 0) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Project",
              id,
              message: `Project with id "${id}" not found`,
            }),
          );
        }

        // Decode the row using the Project schema
        const project = yield* Schema.decodeUnknown(Project)(rows[0]).pipe(
          Effect.orDie, // Convert parse errors to defects
        );
        return project;
      });

    /**
     * Get a project by slug
     */
    const getBySlug = (
      slug: string,
    ): Effect.Effect<typeof Project.Type, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        const rows = yield* sql`
            SELECT
              id, slug, name, description,
              pipeline_status as "pipelineStatus",
              assigned_people as "assignedPeople",
              tags, priority,
              created_at as "createdAt",
              updated_at as "updatedAt"
            FROM projects WHERE slug = ${slug} LIMIT 1
          `;

        if (rows.length === 0 || !rows[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Project",
              id: slug,
              message: `Project with slug "${slug}" not found`,
            }),
          );
        }

        // Decode the row using the Project schema
        const project = yield* Schema.decodeUnknown(Project)(rows[0]).pipe(
          Effect.catchTag("ParseError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Failed to parse project data: ${error.message}`,
              }),
            ),
          ),
        );
        return project;
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
     * Update a project
     */
    const update = (
      id: string,
      input: typeof UpdateProjectInput.Type,
    ): Effect.Effect<typeof Project.Type, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // First get the existing project
        const existing = yield* get(id);

        // Update only provided fields
        const name = input.name ?? existing.name;
        const description = input.description ?? existing.description ?? "";
        const pipelineStatus = (input.pipelineStatus ?? existing.pipelineStatus) as PipelineStatus;
        const tags = input.tags ?? existing.tags;
        const priority = (input.priority ?? existing.priority) as Priority;
        const now = new Date().toISOString();

        yield* sql`
          UPDATE projects
          SET
            name = ${name},
            description = ${description},
            pipeline_status = ${pipelineStatus},
            tags = ${JSON.stringify(tags)},
            priority = ${priority},
            updated_at = ${now}
          WHERE id = ${id}
        `;

        // Fetch the updated project with field aliases
        const rows = yield* sql`
          SELECT
            id, slug, name, description,
            pipeline_status as "pipelineStatus",
            assigned_people as "assignedPeople",
            tags, priority,
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM projects
          WHERE id = ${id}
        `;

        if (rows.length === 0 || !rows[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Project",
              id,
              message: `Project not found after update`,
            }),
          );
        }

        // Decode the row using the Project schema
        const project = yield* Schema.decodeUnknown(Project)(rows[0]).pipe(
          Effect.catchTag("ParseError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Failed to parse project data: ${error.message}`,
              }),
            ),
          ),
        );

        return project;
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
      list,
      get,
      getBySlug,
      update,
    } as const;
  }),
}) {}

/**
 * Live layer for ProjectService with SqlClient dependency
 */
export const ProjectServiceLive = ProjectService.Default;
