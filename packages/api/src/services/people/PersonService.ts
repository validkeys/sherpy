/**
 * PersonService - Domain service for person CRUD operations
 * Uses Effect.Service with Layer pattern (SA-001)
 * Uses Model.makeRepository for basic CRUD (SA-002)
 */

import { randomUUID } from "node:crypto";
import { Model, SqlClient } from "@effect/sql";
import { NotFoundError, Person, ValidationError } from "@sherpy/shared";
import { Effect, Layer, Option, Schema } from "effect";

/**
 * Input for creating a person
 */
export class CreatePersonInput extends Schema.Class<CreatePersonInput>("CreatePersonInput")({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  oktaUserId: Schema.optional(Schema.String),
  capacityHoursPerWeek: Schema.Number.pipe(
    Schema.positive(),
    Schema.finite(),
    Schema.lessThanOrEqualTo(168), // Max hours in a week
  ),
}) {}

/**
 * Input for updating a person
 */
export class UpdatePersonInput extends Schema.Class<UpdatePersonInput>("UpdatePersonInput")({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255))),
  email: Schema.optional(Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))),
  oktaUserId: Schema.optional(Schema.String),
  capacityHoursPerWeek: Schema.optional(
    Schema.Number.pipe(Schema.positive(), Schema.finite(), Schema.lessThanOrEqualTo(168)),
  ),
}) {}

/**
 * PersonService - Effect.Service for person domain operations
 */
export class PersonService extends Effect.Service<PersonService>()("PersonService", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    // Create repository using Model.makeRepository (SA-002)
    const repo = yield* Model.makeRepository(Person, {
      tableName: "people",
      idColumn: "id",
      spanPrefix: "PersonRepository",
    });

    /**
     * Create a new person
     */
    const create = (
      input: typeof CreatePersonInput.Type,
    ): Effect.Effect<typeof Person.Type, ValidationError> =>
      Effect.gen(function* () {
        // Validate input with Schema
        const validatedInput = yield* Schema.decodeUnknown(CreatePersonInput)(input).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              new ValidationError({
                message: `Invalid person data: ${error}`,
              }),
            ),
          ),
        );

        // Create person with generated UUID
        const id = randomUUID();
        const now = new Date().toISOString();

        yield* sql`
            INSERT INTO people (
              id, name, email, okta_user_id, capacity_hours_per_week,
              created_at, updated_at
            ) VALUES (
              ${id}, ${validatedInput.name}, ${validatedInput.email},
              ${validatedInput.oktaUserId ?? null}, ${validatedInput.capacityHoursPerWeek},
              ${now}, ${now}
            )
          `;

        // Fetch the created person using the repository to get proper schema decoding
        const person = yield* repo.findById(id);

        if (Option.isNone(person)) {
          return yield* Effect.fail(
            new ValidationError({
              message: `Person not found after insert`,
            }),
          );
        }

        return person.value;
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
     * List all people
     */
    const list = (): Effect.Effect<ReadonlyArray<typeof Person.Type>, ValidationError> =>
      Effect.gen(function* () {
        const people = yield* sql<typeof Person.Type>`
            SELECT * FROM people ORDER BY name ASC
          `.pipe(
          Effect.catchTag("SqlError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Database error: ${error.message ?? "Unknown error"}`,
              }),
            ),
          ),
        );

        return people as ReadonlyArray<typeof Person.Type>;
      });

    /**
     * Get a person by ID
     */
    const get = (id: string): Effect.Effect<typeof Person.Type, NotFoundError> =>
      Effect.gen(function* () {
        const person = yield* repo.findById(id);

        if (Option.isNone(person)) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Person",
              id,
              message: `Person with id "${id}" not found`,
            }),
          );
        }

        return person.value;
      });

    /**
     * Update a person
     */
    const update = (
      id: string,
      input: typeof UpdatePersonInput.Type,
    ): Effect.Effect<typeof Person.Type, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // First verify the person exists
        const existing = yield* get(id);

        // Validate input with Schema
        const validatedInput = yield* Schema.decodeUnknown(UpdatePersonInput)(input).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              new ValidationError({
                message: `Invalid update data: ${error}`,
              }),
            ),
          ),
        );

        // Build update fields - merge with existing values
        const name = validatedInput.name ?? existing.name;
        const email = validatedInput.email ?? existing.email;
        const oktaUserId =
          validatedInput.oktaUserId !== undefined ? validatedInput.oktaUserId : existing.oktaUserId;
        const capacityHoursPerWeek =
          validatedInput.capacityHoursPerWeek ?? existing.capacityHoursPerWeek;

        const now = new Date().toISOString();

        // Update with raw SQL since Model.makeRepository doesn't expose update method
        yield* sql`
            UPDATE people
            SET name = ${name},
                email = ${email},
                okta_user_id = ${oktaUserId ?? null},
                capacity_hours_per_week = ${capacityHoursPerWeek},
                updated_at = ${now}
            WHERE id = ${id}
          `.pipe(
          Effect.catchTag("SqlError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Database error: ${error.message ?? "Unknown error"}`,
              }),
            ),
          ),
        );

        // Fetch the updated person
        return yield* get(id);
      });

    return {
      create,
      list,
      get,
      update,
    } as const;
  }),
}) {}

/**
 * Live layer for PersonService with SqlClient dependency
 */
export const PersonServiceLive = PersonService.Default;
