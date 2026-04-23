/**
 * AvailabilityService tests using @effect/vitest with real SQLite (SA-008)
 * Tests date range validation and overlap detection (SA-003)
 */

import { Reactivity } from "@effect/experimental";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { LibsqlClient } from "@effect/sql-libsql";
import { assert, describe, it } from "@effect/vitest";
import { NotFoundError, ValidationError } from "@sherpy/shared";
import { Effect, Either, Layer } from "effect";
import { runMigrations } from "../../db/migration-runner.js";
import {
  AvailabilityService,
  AvailabilityServiceLive,
  type CreateAvailabilityInput,
  type UpdateAvailabilityInput,
} from "./AvailabilityService.js";
import { PersonService, PersonServiceLive } from "./PersonService.js";

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

describe("AvailabilityService", () => {
  it.scoped(
    "create - creates availability window with valid dates",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Alice",
          email: "alice@example.com",
          capacityHoursPerWeek: 40,
        });

        const input: typeof CreateAvailabilityInput.Type = {
          personId: person.id,
          startDate: "2024-06-01",
          endDate: "2024-06-15",
          type: "pto",
          description: "Summer vacation",
        };

        const window = yield* availabilityService.create(input);

        assert.strictEqual(window.personId, person.id);
        assert.strictEqual(window.startDate, "2024-06-01");
        assert.strictEqual(window.endDate, "2024-06-15");
        assert.strictEqual(window.type, "pto");
        assert.strictEqual(window.description, "Summer vacation");
        assert.match(window.id, /^[0-9a-f-]{36}$/);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create - validates startDate must be before endDate",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Bob",
          email: "bob@example.com",
          capacityHoursPerWeek: 40,
        });

        const input: typeof CreateAvailabilityInput.Type = {
          personId: person.id,
          startDate: "2024-06-15",
          endDate: "2024-06-01",
          type: "pto",
        };

        const result = yield* Effect.either(availabilityService.create(input));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, ValidationError);
          if (result.left instanceof ValidationError) {
            assert.match(result.left.message, /startDate must be before endDate/);
          }
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create - rejects equal start and end dates",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Charlie",
          email: "charlie@example.com",
          capacityHoursPerWeek: 40,
        });

        const input: typeof CreateAvailabilityInput.Type = {
          personId: person.id,
          startDate: "2024-06-01",
          endDate: "2024-06-01",
          type: "pto",
        };

        const result = yield* Effect.either(availabilityService.create(input));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, ValidationError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create - fails when person does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const input: typeof CreateAvailabilityInput.Type = {
          personId: "non-existent-person",
          startDate: "2024-06-01",
          endDate: "2024-06-15",
          type: "pto",
        };

        const result = yield* Effect.either(availabilityService.create(input));

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
    "create - accepts all availability types",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Diana",
          email: "diana@example.com",
          capacityHoursPerWeek: 40,
        });

        const types: Array<"pto" | "other-project" | "training" | "unavailable"> = [
          "pto",
          "other-project",
          "training",
          "unavailable",
        ];

        for (const type of types) {
          const window = yield* availabilityService.create({
            personId: person.id,
            startDate: "2024-06-01",
            endDate: "2024-06-15",
            type,
          });

          assert.strictEqual(window.type, type);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "update - updates availability window fields",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Eve",
          email: "eve@example.com",
          capacityHoursPerWeek: 40,
        });

        const window = yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-06-01",
          endDate: "2024-06-15",
          type: "pto",
          description: "Original description",
        });

        const input: typeof UpdateAvailabilityInput.Type = {
          startDate: "2024-06-05",
          endDate: "2024-06-20",
          type: "training",
          description: "Updated description",
        };

        const updated = yield* availabilityService.update(window.id, input);

        assert.strictEqual(updated.id, window.id);
        assert.strictEqual(updated.startDate, "2024-06-05");
        assert.strictEqual(updated.endDate, "2024-06-20");
        assert.strictEqual(updated.type, "training");
        assert.strictEqual(updated.description, "Updated description");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "update - validates date range",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Frank",
          email: "frank@example.com",
          capacityHoursPerWeek: 40,
        });

        const window = yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-06-01",
          endDate: "2024-06-15",
          type: "pto",
        });

        const input: typeof UpdateAvailabilityInput.Type = {
          startDate: "2024-06-20",
          endDate: "2024-06-10",
        };

        const result = yield* Effect.either(availabilityService.update(window.id, input));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, ValidationError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "update - fails when window does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const input: typeof UpdateAvailabilityInput.Type = {
          startDate: "2024-06-05",
        };

        const result = yield* Effect.either(
          availabilityService.update("non-existent-window", input),
        );

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
          if (result.left instanceof NotFoundError) {
            assert.strictEqual(result.left.entity, "AvailabilityWindow");
          }
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "remove - removes availability window",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Grace",
          email: "grace@example.com",
          capacityHoursPerWeek: 40,
        });

        const window = yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-06-01",
          endDate: "2024-06-15",
          type: "pto",
        });

        yield* availabilityService.remove(window.id);

        // Verify it was removed
        const result = yield* Effect.either(availabilityService.remove(window.id));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "remove - fails when window does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const result = yield* Effect.either(availabilityService.remove("non-existent-window"));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listByPerson - returns windows for person ordered by start date",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Henry",
          email: "henry@example.com",
          capacityHoursPerWeek: 40,
        });

        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-08-01",
          endDate: "2024-08-15",
          type: "pto",
        });

        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-06-01",
          endDate: "2024-06-15",
          type: "training",
        });

        const windows = yield* availabilityService.listByPerson(person.id);

        assert.strictEqual(windows.length, 2);
        assert.strictEqual(windows[0]?.startDate, "2024-06-01");
        assert.strictEqual(windows[1]?.startDate, "2024-08-01");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listByPerson - returns empty array when person has no windows",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Ivy",
          email: "ivy@example.com",
          capacityHoursPerWeek: 40,
        });

        const windows = yield* availabilityService.listByPerson(person.id);

        assert.strictEqual(windows.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listByPerson - fails when person does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const result = yield* Effect.either(
          availabilityService.listByPerson("non-existent-person"),
        );

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listOverlapping - finds windows that overlap with date range",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Jack",
          email: "jack@example.com",
          capacityHoursPerWeek: 40,
        });

        // Window 1: 2024-06-01 to 2024-06-15
        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-06-01",
          endDate: "2024-06-15",
          type: "pto",
        });

        // Window 2: 2024-06-20 to 2024-06-30
        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-06-20",
          endDate: "2024-06-30",
          type: "training",
        });

        // Window 3: 2024-07-01 to 2024-07-15
        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-07-01",
          endDate: "2024-07-15",
          type: "other-project",
        });

        // Query: 2024-06-10 to 2024-06-25 should overlap with windows 1 and 2
        const overlapping = yield* availabilityService.listOverlapping("2024-06-10", "2024-06-25");

        assert.strictEqual(overlapping.length, 2);
        assert.strictEqual(overlapping[0]?.startDate, "2024-06-01");
        assert.strictEqual(overlapping[1]?.startDate, "2024-06-20");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listOverlapping - filters by personId when provided",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person1 = yield* personService.create({
          name: "Kate",
          email: "kate@example.com",
          capacityHoursPerWeek: 40,
        });

        const person2 = yield* personService.create({
          name: "Leo",
          email: "leo@example.com",
          capacityHoursPerWeek: 40,
        });

        // Person 1 window
        yield* availabilityService.create({
          personId: person1.id,
          startDate: "2024-06-01",
          endDate: "2024-06-15",
          type: "pto",
        });

        // Person 2 window
        yield* availabilityService.create({
          personId: person2.id,
          startDate: "2024-06-05",
          endDate: "2024-06-20",
          type: "training",
        });

        // Query for person1 only
        const overlapping = yield* availabilityService.listOverlapping(
          "2024-06-01",
          "2024-06-30",
          person1.id,
        );

        assert.strictEqual(overlapping.length, 1);
        assert.strictEqual(overlapping[0]?.personId, person1.id);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listOverlapping - returns empty array when no overlap",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Mia",
          email: "mia@example.com",
          capacityHoursPerWeek: 40,
        });

        // Window: 2024-06-01 to 2024-06-15
        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-06-01",
          endDate: "2024-06-15",
          type: "pto",
        });

        // Query: 2024-07-01 to 2024-07-15 (no overlap)
        const overlapping = yield* availabilityService.listOverlapping("2024-07-01", "2024-07-15");

        assert.strictEqual(overlapping.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listOverlapping - handles edge-adjacent ranges (no overlap)",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Noah",
          email: "noah@example.com",
          capacityHoursPerWeek: 40,
        });

        // Window: 2024-06-01 to 2024-06-15
        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-06-01",
          endDate: "2024-06-15",
          type: "pto",
        });

        // Query: 2024-06-15 to 2024-06-30 (starts exactly when window ends - no overlap)
        const overlapping = yield* availabilityService.listOverlapping("2024-06-15", "2024-06-30");

        assert.strictEqual(overlapping.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listOverlapping - validates query date range",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const result = yield* Effect.either(
          availabilityService.listOverlapping("2024-06-15", "2024-06-01"),
        );

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, ValidationError);
        }
      }) as Effect.Effect<void>,
  );
});
