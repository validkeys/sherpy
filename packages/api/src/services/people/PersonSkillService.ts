/**
 * PersonSkillService - Manages person-skill associations with proficiency levels
 * Uses SqlResolver with JOINs to avoid N+1 queries (SA-003)
 * Uses Effect.Service with Layer pattern (SA-001)
 */

import { SqlClient } from "@effect/sql";
import {
  ConflictError,
  NotFoundError,
  Person,
  PersonSkill,
  Skill,
  type SkillProficiency,
  ValidationError,
} from "@sherpy/shared";
import { Effect, Schema } from "effect";

/**
 * Input for adding a skill to a person
 */
export class AddSkillInput extends Schema.Class<AddSkillInput>("AddSkillInput")({
  personId: Schema.String,
  skillId: Schema.String,
  proficiency: Schema.Literal("beginner", "intermediate", "advanced", "expert"),
}) {}

/**
 * Result type for person with skills
 */
export interface PersonWithSkills {
  person: typeof Person.Type;
  skills: Array<{
    skill: typeof Skill.Type;
    proficiency: SkillProficiency;
  }>;
}

/**
 * Result type for skill with people
 */
export interface SkillWithPeople {
  skill: typeof Skill.Type;
  people: Array<{
    person: typeof Person.Type;
    proficiency: SkillProficiency;
  }>;
}

/**
 * PersonSkillService - Effect.Service for person-skill association operations
 */
export class PersonSkillService extends Effect.Service<PersonSkillService>()(
  "PersonSkillService",
  {
    effect: Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      /**
       * Add a skill to a person with proficiency level
       */
      const addSkill = (
        input: typeof AddSkillInput.Type,
      ): Effect.Effect<
        typeof PersonSkill.Type,
        ConflictError | NotFoundError | ValidationError
      > =>
        Effect.gen(function* () {
          // Verify person exists
          const people = yield* sql<typeof Person.Type>`
              SELECT * FROM people WHERE id = ${input.personId}
            `;

          if (!people[0]) {
            return yield* Effect.fail(
              new NotFoundError({
                entity: "Person",
                id: input.personId,
                message: `Person with id "${input.personId}" not found`,
              }),
            );
          }

          // Verify skill exists
          const skills = yield* sql<typeof Skill.Type>`
              SELECT * FROM skills WHERE id = ${input.skillId}
            `;

          if (!skills[0]) {
            return yield* Effect.fail(
              new NotFoundError({
                entity: "Skill",
                id: input.skillId,
                message: `Skill with id "${input.skillId}" not found`,
              }),
            );
          }

          // Check if association already exists
          const existing = yield* sql<typeof PersonSkill.Type>`
              SELECT * FROM person_skills
              WHERE person_id = ${input.personId} AND skill_id = ${input.skillId}
            `;

          if (existing.length > 0) {
            return yield* Effect.fail(
              new ConflictError({
                resource: "PersonSkill",
                conflictType: "duplicate" as const,
                message: `Person already has this skill`,
              }),
            );
          }

          // Create the association
          yield* sql`
              INSERT INTO person_skills (person_id, skill_id, proficiency)
              VALUES (${input.personId}, ${input.skillId}, ${input.proficiency})
            `;

          // Fetch the created association
          const personSkills = yield* sql<typeof PersonSkill.Type>`
              SELECT * FROM person_skills
              WHERE person_id = ${input.personId} AND skill_id = ${input.skillId}
            `;

          if (!personSkills[0]) {
            return yield* Effect.fail(
              new ValidationError({
                message: `PersonSkill not found after insert`,
              }),
            );
          }

          return personSkills[0] as typeof PersonSkill.Type;
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
       * Remove a skill from a person
       */
      const removeSkill = (
        personId: string,
        skillId: string,
      ): Effect.Effect<void, NotFoundError | ValidationError> =>
        Effect.gen(function* () {
          // Check if association exists
          const existing = yield* sql<typeof PersonSkill.Type>`
              SELECT * FROM person_skills
              WHERE person_id = ${personId} AND skill_id = ${skillId}
            `;

          if (!existing[0]) {
            return yield* Effect.fail(
              new NotFoundError({
                entity: "PersonSkill",
                id: `${personId}:${skillId}`,
                message: `Person does not have this skill`,
              }),
            );
          }

          // Delete the association
          yield* sql`
              DELETE FROM person_skills
              WHERE person_id = ${personId} AND skill_id = ${skillId}
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
       * List all skills for a person with proficiency levels
       * Uses JOIN to avoid N+1 queries (SA-003)
       */
      const listSkillsForPerson = (
        personId: string,
      ): Effect.Effect<PersonWithSkills, NotFoundError | ValidationError> =>
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

          // Fetch skills with proficiency using JOIN (SA-003)
          type SkillProficiencyRow = typeof Skill.Type & { proficiency: SkillProficiency };
          const results = yield* sql<SkillProficiencyRow>`
              SELECT
                s.*,
                ps.proficiency
              FROM person_skills ps
              JOIN skills s ON ps.skill_id = s.id
              WHERE ps.person_id = ${personId}
              ORDER BY s.name ASC
            `;

          const skills = results.map((row) => ({
            skill: row as typeof Skill.Type,
            proficiency: row.proficiency,
          }));

          return {
            person: people[0] as typeof Person.Type,
            skills,
          };
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
       * List all people who have a specific skill
       * Uses JOIN to avoid N+1 queries (SA-003)
       */
      const listPeopleForSkill = (
        skillId: string,
      ): Effect.Effect<SkillWithPeople, NotFoundError | ValidationError> =>
        Effect.gen(function* () {
          // Verify skill exists
          const skills = yield* sql<typeof Skill.Type>`
              SELECT * FROM skills WHERE id = ${skillId}
            `;

          if (!skills[0]) {
            return yield* Effect.fail(
              new NotFoundError({
                entity: "Skill",
                id: skillId,
                message: `Skill with id "${skillId}" not found`,
              }),
            );
          }

          // Fetch people with proficiency using JOIN (SA-003)
          type PersonSkillRow = typeof Person.Type & { proficiency: SkillProficiency };
          const results = yield* sql<PersonSkillRow>`
              SELECT
                p.*,
                ps.proficiency
              FROM person_skills ps
              JOIN people p ON ps.person_id = p.id
              WHERE ps.skill_id = ${skillId}
              ORDER BY p.name ASC
            `;

          const people = results.map((row) => ({
            person: row as typeof Person.Type,
            proficiency: row.proficiency,
          }));

          return {
            skill: skills[0] as typeof Skill.Type,
            people,
          };
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
        addSkill,
        removeSkill,
        listSkillsForPerson,
        listPeopleForSkill,
      } as const;
    }),
  },
) {}

/**
 * Live layer for PersonSkillService with SqlClient dependency
 */
export const PersonSkillServiceLive = PersonSkillService.Default;
