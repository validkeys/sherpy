/**
 * PersonService tests using @effect/vitest with real SQLite (SA-008, SA-009)
 */

import { Reactivity } from "@effect/experimental";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { LibsqlClient } from "@effect/sql-libsql";
import { assert, describe, expect, it } from "@effect/vitest";
import { NotFoundError, Person, ValidationError } from "@sherpy/shared";
import { Effect, Either, Layer } from "effect";
import { runMigrations } from "../../db/migration-runner.js";
import {
  type CreatePersonInput,
  PersonService,
  PersonServiceLive,
  type UpdatePersonInput,
} from "./PersonService.js";

/**
 * Create a temporary SQLite database for testing
 */
const makeTestDb = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const dir = yield* fs.makeTempDirectoryScoped();
  return yield* LibsqlClient.make({
    url: `file:${dir}/test.db`,
    transformQueryNames: (_str: string) => _str.replace(/([A-Z])/g, "_$1").toLowerCase(),
    transformResultNames: (_str: string) =>
      _str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
  });
}).pipe(Effect.provide(Layer.mergeAll(NodeFileSystem.layer, Reactivity.layer)));

describe("PersonService", () => {
  it.scoped(
    "create - creates person with valid input",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const input: typeof CreatePersonInput.Type = {
          name: "John Doe",
          email: "john.doe@example.com",
          capacityHoursPerWeek: 40,
        };

        const person = yield* service.create(input);

        assert.strictEqual(person.name, "John Doe");
        assert.strictEqual(person.email, "john.doe@example.com");
        assert.strictEqual(person.capacityHoursPerWeek, 40);
        assert.match(person.id, /^[0-9a-f-]{36}$/);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create - creates person with oktaUserId",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const input: typeof CreatePersonInput.Type = {
          name: "Jane Smith",
          email: "jane.smith@example.com",
          oktaUserId: "00u1234567890abcdef",
          capacityHoursPerWeek: 32,
        };

        const person = yield* service.create(input);

        assert.strictEqual(person.name, "Jane Smith");
        assert.strictEqual(person.oktaUserId, "00u1234567890abcdef");
        assert.strictEqual(person.capacityHoursPerWeek, 32);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create - fails with invalid email",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const input = {
          name: "Invalid Email",
          email: "not-an-email",
          capacityHoursPerWeek: 40,
        };

        const result = yield* Effect.either(service.create(input as any));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, ValidationError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "list - returns all people",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        // Create multiple people
        yield* service.create({
          name: "Alice",
          email: "alice@example.com",
          capacityHoursPerWeek: 40,
        });
        yield* service.create({
          name: "Bob",
          email: "bob@example.com",
          capacityHoursPerWeek: 35,
        });

        const people = yield* service.list();

        assert.strictEqual(people.length, 2);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "get - retrieves person by id",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const created = yield* service.create({
          name: "Charlie",
          email: "charlie@example.com",
          capacityHoursPerWeek: 40,
        });

        const retrieved = yield* service.get(created.id);

        assert.strictEqual(retrieved.id, created.id);
        assert.strictEqual(retrieved.name, "Charlie");
        assert.strictEqual(retrieved.email, "charlie@example.com");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "get - fails when person does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const result = yield* Effect.either(service.get("non-existent-id"));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
          if (result.left instanceof NotFoundError) {
            assert.strictEqual(result.left.entity, "Person");
          }
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "update - updates person fields",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* service.create({
          name: "Dave",
          email: "dave@example.com",
          capacityHoursPerWeek: 40,
        });

        const updated = yield* service.update(person.id, {
          name: "David",
          capacityHoursPerWeek: 35,
        });

        assert.strictEqual(updated.name, "David");
        assert.strictEqual(updated.capacityHoursPerWeek, 35);
        assert.strictEqual(updated.email, "dave@example.com"); // unchanged
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "update - fails when person does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const result = yield* Effect.either(
          service.update("non-existent-id", { name: "New Name" }),
        );

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );
});
