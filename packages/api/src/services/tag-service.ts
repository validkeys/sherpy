/**
 * TagService - Domain service for tag CRUD and project assignment operations
 * Uses Effect.Service with Layer pattern (SA-001)
 * Uses Model.makeRepository for basic CRUD (SA-002)
 */

import { randomUUID } from "node:crypto";
import { Model, SqlClient } from "@effect/sql";
import { ConflictError, NotFoundError, type Project, Tag, ValidationError } from "@sherpy/shared";
import { Effect, Layer, Schema } from "effect";

/**
 * Input for creating a tag
 */
export class CreateTagInput extends Schema.Class<CreateTagInput>("CreateTagInput")({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  color: Schema.optional(
    Schema.String.pipe(Schema.pattern(/^#[0-9a-fA-F]{6}$/)), // Hex color code
  ),
}) {}

/**
 * Input for updating a tag
 */
export class UpdateTagInput extends Schema.Class<UpdateTagInput>("UpdateTagInput")({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))),
  color: Schema.optional(
    Schema.String.pipe(Schema.pattern(/^#[0-9a-fA-F]{6}$/)), // Hex color code
  ),
}) {}

/**
 * TagService - Effect.Service for tag domain operations
 */
export class TagService extends Effect.Service<TagService>()("TagService", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    // Create repository using Model.makeRepository (SA-002)
    const repo = yield* Model.makeRepository(Tag, {
      tableName: "tags",
      idColumn: "id",
      spanPrefix: "TagRepository",
    });

    /**
     * Create a new tag
     */
    const create = (
      input: typeof CreateTagInput.Type,
    ): Effect.Effect<typeof Tag.Type, ConflictError | ValidationError> =>
      Effect.gen(function* () {
        // Check if tag name already exists
        const existingTags = yield* sql<typeof Tag.Type>`
            SELECT * FROM tags WHERE name = ${input.name}
          `;

        if (existingTags.length > 0) {
          return yield* Effect.fail(
            new ConflictError({
              resource: "Tag",
              conflictType: "duplicate" as const,
              message: `Tag with name "${input.name}" already exists`,
            }),
          );
        }

        // Create tag with generated UUID
        const id = randomUUID();

        yield* sql`
            INSERT INTO tags (id, name, color)
            VALUES (${id}, ${input.name}, ${input.color ?? null})
          `;

        // Fetch the created tag
        const tags = yield* sql<typeof Tag.Type>`
            SELECT * FROM tags WHERE id = ${id}
          `;

        if (!tags[0]) {
          return yield* Effect.fail(
            new ValidationError({
              message: `Tag not found after insert`,
            }),
          );
        }

        return tags[0] as typeof Tag.Type;
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
     * List all tags, ordered by name
     */
    const list = (): Effect.Effect<ReadonlyArray<typeof Tag.Type>, ValidationError> =>
      Effect.gen(function* () {
        const tags = yield* sql<typeof Tag.Type>`
            SELECT * FROM tags ORDER BY name ASC
          `;
        return tags as ReadonlyArray<typeof Tag.Type>;
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
     * Get a tag by ID
     */
    const get = (id: string): Effect.Effect<typeof Tag.Type, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        const tags = yield* sql<typeof Tag.Type>`
            SELECT * FROM tags WHERE id = ${id}
          `;

        if (!tags[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Tag",
              id,
              message: `Tag with id "${id}" not found`,
            }),
          );
        }

        return tags[0] as typeof Tag.Type;
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
     * Update a tag
     */
    const update = (
      id: string,
      input: typeof UpdateTagInput.Type,
    ): Effect.Effect<typeof Tag.Type, NotFoundError | ConflictError | ValidationError> =>
      Effect.gen(function* () {
        // First get the existing tag
        const existing = yield* get(id);

        // If updating name, check for conflicts
        if (input.name && input.name !== existing.name) {
          const conflictTags = yield* sql<typeof Tag.Type>`
              SELECT * FROM tags WHERE name = ${input.name} AND id != ${id}
            `;

          if (conflictTags.length > 0) {
            return yield* Effect.fail(
              new ConflictError({
                resource: "Tag",
                conflictType: "duplicate" as const,
                message: `Tag with name "${input.name}" already exists`,
              }),
            );
          }
        }

        // Build update fields
        const name = input.name ?? existing.name;
        const color = input.color !== undefined ? input.color : existing.color;

        // Update with raw SQL
        yield* sql`
            UPDATE tags
            SET name = ${name}, color = ${color ?? null}
            WHERE id = ${id}
          `;

        // Fetch the updated tag
        return yield* get(id);
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
     * Remove a tag - also removes it from all projects
     */
    const remove = (id: string): Effect.Effect<void, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // Verify tag exists
        yield* get(id);

        // Get all projects that reference this tag
        const projects = yield* sql<typeof Project.Type>`
            SELECT * FROM projects
          `;

        // Remove tag from each project's tags array
        for (const project of projects) {
          const tagIds = typeof project.tags === "string" ? JSON.parse(project.tags) : project.tags;

          if (Array.isArray(tagIds) && tagIds.includes(id)) {
            const updatedTags = tagIds.filter((tagId: string) => tagId !== id);
            yield* sql`
                UPDATE projects
                SET tags = ${JSON.stringify(updatedTags)}
                WHERE id = ${project.id}
              `;
          }
        }

        // Delete the tag
        yield* sql`
            DELETE FROM tags WHERE id = ${id}
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
     * Assign a tag to a project (idempotent)
     */
    const assignToProject = (
      tagId: string,
      projectId: string,
    ): Effect.Effect<typeof Project.Type, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // Verify tag exists
        yield* get(tagId);

        // Get the project
        const projects = yield* sql<typeof Project.Type>`
            SELECT * FROM projects WHERE id = ${projectId}
          `;

        if (!projects[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Project",
              id: projectId,
              message: `Project with id "${projectId}" not found`,
            }),
          );
        }

        const project = projects[0];
        const tagIds = typeof project.tags === "string" ? JSON.parse(project.tags) : project.tags;

        // Add tag if not already present
        if (!Array.isArray(tagIds) || !tagIds.includes(tagId)) {
          const updatedTags = Array.isArray(tagIds) ? [...tagIds, tagId] : [tagId];

          const now = new Date().toISOString();
          yield* sql`
              UPDATE projects
              SET tags = ${JSON.stringify(updatedTags)}, updated_at = ${now}
              WHERE id = ${projectId}
            `;
        }

        // Fetch the updated project
        const updatedProjects = yield* sql<typeof Project.Type>`
            SELECT * FROM projects WHERE id = ${projectId}
          `;

        return updatedProjects[0] as typeof Project.Type;
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
     * Remove a tag from a project
     */
    const removeFromProject = (
      tagId: string,
      projectId: string,
    ): Effect.Effect<typeof Project.Type, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // Verify tag exists
        yield* get(tagId);

        // Get the project
        const projects = yield* sql<typeof Project.Type>`
            SELECT * FROM projects WHERE id = ${projectId}
          `;

        if (!projects[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Project",
              id: projectId,
              message: `Project with id "${projectId}" not found`,
            }),
          );
        }

        const project = projects[0];
        const tagIds = typeof project.tags === "string" ? JSON.parse(project.tags) : project.tags;

        // Remove tag from array
        if (Array.isArray(tagIds) && tagIds.includes(tagId)) {
          const updatedTags = tagIds.filter((id: string) => id !== tagId);
          const now = new Date().toISOString();
          yield* sql`
              UPDATE projects
              SET tags = ${JSON.stringify(updatedTags)}, updated_at = ${now}
              WHERE id = ${projectId}
            `;
        }

        // Fetch the updated project
        const updatedProjects = yield* sql<typeof Project.Type>`
            SELECT * FROM projects WHERE id = ${projectId}
          `;

        return updatedProjects[0] as typeof Project.Type;
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
     * Get all tags for a project
     */
    const getProjectTags = (
      projectId: string,
    ): Effect.Effect<ReadonlyArray<typeof Tag.Type>, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // Get the project
        const projects = yield* sql<typeof Project.Type>`
            SELECT * FROM projects WHERE id = ${projectId}
          `;

        if (!projects[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Project",
              id: projectId,
              message: `Project with id "${projectId}" not found`,
            }),
          );
        }

        const project = projects[0];
        const tagIds = typeof project.tags === "string" ? JSON.parse(project.tags) : project.tags;

        // If no tags, return empty array
        if (!Array.isArray(tagIds) || tagIds.length === 0) {
          return [];
        }

        // Fetch all tags
        const tags = yield* Effect.all(tagIds.map((tagId: string) => get(tagId)));

        return tags as ReadonlyArray<typeof Tag.Type>;
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
      update,
      remove,
      assignToProject,
      removeFromProject,
      getProjectTags,
    } as const;
  }),
}) {}

/**
 * Live layer for TagService with SqlClient dependency
 */
export const TagServiceLive = TagService.Default;
