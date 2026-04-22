/**
 * SkillService - Domain service for skill CRUD operations
 * Uses Effect.Service with Layer pattern (SA-001)
 * Uses Model.makeRepository for basic CRUD (SA-002)
 */

import { randomUUID } from "node:crypto";
import { Model, SqlClient } from "@effect/sql";
import { ConflictError, NotFoundError, Skill, ValidationError } from "@sherpy/shared";
import { Effect, Layer, Schema } from "effect";

/**
 * Input for creating a skill
 */
export class CreateSkillInput extends Schema.Class<CreateSkillInput>("CreateSkillInput")({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  category: Schema.optional(Schema.String.pipe(Schema.maxLength(100))),
}) {}

/**
 * Input for updating a skill
 */
export class UpdateSkillInput extends Schema.Class<UpdateSkillInput>("UpdateSkillInput")({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255))),
  category: Schema.optional(Schema.String.pipe(Schema.maxLength(100))),
}) {}

/**
 * SkillService - Effect.Service for skill domain operations
 */
export class SkillService extends Effect.Service<SkillService>()("SkillService", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    // Create repository using Model.makeRepository (SA-002)
    const repo = yield* Model.makeRepository(Skill, {
      tableName: "skills",
      idColumn: "id",
      spanPrefix: "SkillRepository",
    });

    /**
     * Create a new skill
     */
    const create = (
      input: typeof CreateSkillInput.Type,
    ): Effect.Effect<typeof Skill.Type, ConflictError | ValidationError> =>
      Effect.gen(function* () {
        // Check if skill name already exists
        const existingSkills = yield* sql<typeof Skill.Type>`
            SELECT * FROM skills WHERE name = ${input.name}
          `;

        if (existingSkills.length > 0) {
          return yield* Effect.fail(
            new ConflictError({
              resource: "Skill",
              conflictType: "duplicate" as const,
              message: `Skill with name "${input.name}" already exists`,
            }),
          );
        }

        // Create skill with generated UUID
        const id = randomUUID();

        yield* sql`
            INSERT INTO skills (id, name, category)
            VALUES (${id}, ${input.name}, ${input.category ?? null})
          `;

        // Fetch the created skill
        const skills = yield* sql<typeof Skill.Type>`
            SELECT * FROM skills WHERE id = ${id}
          `;

        if (!skills[0]) {
          return yield* Effect.fail(
            new ValidationError({
              message: `Skill not found after insert`,
            }),
          );
        }

        return skills[0] as typeof Skill.Type;
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
     * List all skills, ordered by name
     */
    const list = (): Effect.Effect<ReadonlyArray<typeof Skill.Type>, ValidationError> =>
      Effect.gen(function* () {
        const skills = yield* sql<typeof Skill.Type>`
            SELECT * FROM skills ORDER BY name ASC
          `;
        return skills as ReadonlyArray<typeof Skill.Type>;
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
     * Get a skill by ID
     */
    const get = (id: string): Effect.Effect<typeof Skill.Type, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        const skills = yield* sql<typeof Skill.Type>`
            SELECT * FROM skills WHERE id = ${id}
          `;

        if (!skills[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Skill",
              id,
              message: `Skill with id "${id}" not found`,
            }),
          );
        }

        return skills[0] as typeof Skill.Type;
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
     * Update a skill
     */
    const update = (
      id: string,
      input: typeof UpdateSkillInput.Type,
    ): Effect.Effect<typeof Skill.Type, NotFoundError | ConflictError | ValidationError> =>
      Effect.gen(function* () {
        // First get the existing skill
        const existing = yield* get(id);

        // If updating name, check for conflicts
        if (input.name && input.name !== existing.name) {
          const conflictSkills = yield* sql<typeof Skill.Type>`
              SELECT * FROM skills WHERE name = ${input.name} AND id != ${id}
            `;

          if (conflictSkills.length > 0) {
            return yield* Effect.fail(
              new ConflictError({
                resource: "Skill",
                conflictType: "duplicate" as const,
                message: `Skill with name "${input.name}" already exists`,
              }),
            );
          }
        }

        // Build update fields
        const name = input.name ?? existing.name;
        const category = input.category !== undefined ? input.category : existing.category;

        // Update with raw SQL
        yield* sql`
            UPDATE skills
            SET name = ${name}, category = ${category ?? null}
            WHERE id = ${id}
          `;

        // Fetch the updated skill
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
     * Remove a skill - also removes all person-skill associations
     */
    const remove = (id: string): Effect.Effect<void, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // Verify skill exists
        yield* get(id);

        // Delete person-skill associations (cascade will handle this, but explicit is better)
        yield* sql`
            DELETE FROM person_skills WHERE skill_id = ${id}
          `;

        // Delete the skill
        yield* sql`
            DELETE FROM skills WHERE id = ${id}
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

    return {
      create,
      list,
      get,
      update,
      remove,
    } as const;
  }),
}) {}

/**
 * Live layer for SkillService with SqlClient dependency
 */
export const SkillServiceLive = SkillService.Default;
