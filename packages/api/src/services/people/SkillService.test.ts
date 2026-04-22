/**
 * SkillService tests using @effect/vitest with real SQLite (SA-008)
 */

import { Reactivity } from "@effect/experimental";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { LibsqlClient } from "@effect/sql-libsql";
import { assert, describe, expect, it } from "@effect/vitest";
import { ConflictError, NotFoundError, ValidationError } from "@sherpy/shared";
import { Effect, Either, Layer } from "effect";
import { runMigrations } from "../../db/migration-runner.js";
import {
  type CreateSkillInput,
  SkillService,
  SkillServiceLive,
  type UpdateSkillInput,
} from "./SkillService.js";

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

describe("SkillService", () => {
  it.scoped(
    "create - creates skill with name and category",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const input: typeof CreateSkillInput.Type = {
          name: "TypeScript",
          category: "Programming Languages",
        };

        const skill = yield* service.create(input);

        assert.strictEqual(skill.name, "TypeScript");
        assert.strictEqual(skill.category, "Programming Languages");
        assert.match(skill.id, /^[0-9a-f-]{36}$/);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create - creates skill without category",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const input: typeof CreateSkillInput.Type = {
          name: "React",
        };

        const skill = yield* service.create(input);

        assert.strictEqual(skill.name, "React");
        assert.isNull(skill.category);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create - fails when skill name already exists",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        // Create first skill
        yield* service.create({ name: "TypeScript", category: "Programming" });

        // Try to create duplicate
        const result = yield* Effect.either(
          service.create({ name: "TypeScript", category: "Languages" }),
        );

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, ConflictError);
          if (result.left instanceof ConflictError) {
            assert.strictEqual(result.left.resource, "Skill");
            assert.strictEqual(result.left.conflictType, "duplicate");
          }
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "list - returns all skills ordered by name",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        // Create skills in non-alphabetical order
        yield* service.create({ name: "Zod" });
        yield* service.create({ name: "Angular" });
        yield* service.create({ name: "Kubernetes" });

        const skills = yield* service.list();

        assert.strictEqual(skills.length, 3);
        assert.strictEqual(skills[0]!.name, "Angular");
        assert.strictEqual(skills[1]!.name, "Kubernetes");
        assert.strictEqual(skills[2]!.name, "Zod");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "get - retrieves skill by id",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const created = yield* service.create({ name: "Docker", category: "DevOps" });
        const retrieved = yield* service.get(created.id);

        assert.strictEqual(retrieved.id, created.id);
        assert.strictEqual(retrieved.name, "Docker");
        assert.strictEqual(retrieved.category, "DevOps");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "get - fails when skill does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const result = yield* Effect.either(service.get("non-existent-id"));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
          if (result.left instanceof NotFoundError) {
            assert.strictEqual(result.left.entity, "Skill");
          }
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "update - updates skill name",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const skill = yield* service.create({ name: "JS", category: "Programming" });
        const updated = yield* service.update(skill.id, { name: "JavaScript" });

        assert.strictEqual(updated.name, "JavaScript");
        assert.strictEqual(updated.category, "Programming");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "update - updates skill category",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const skill = yield* service.create({ name: "Python", category: "Scripting" });
        const updated = yield* service.update(skill.id, { category: "Programming Languages" });

        assert.strictEqual(updated.name, "Python");
        assert.strictEqual(updated.category, "Programming Languages");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "update - fails when new name conflicts with existing skill",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        yield* service.create({ name: "TypeScript" });
        const skill2 = yield* service.create({ name: "JavaScript" });

        const result = yield* Effect.either(service.update(skill2.id, { name: "TypeScript" }));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, ConflictError);
          if (result.left instanceof ConflictError) {
            assert.strictEqual(result.left.resource, "Skill");
          }
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "remove - deletes skill",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const skill = yield* service.create({ name: "Temporary" });
        yield* service.remove(skill.id);

        const result = yield* Effect.either(service.get(skill.id));
        assert.isTrue(Either.isLeft(result));
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "remove - cascades to person_skills associations",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        // Create skill and manually create a person and association
        const skill = yield* service.create({ name: "Testing" });

        // Insert a test person and association
        yield* sql`
            INSERT INTO people (id, name, email, capacity_hours_per_week, created_at, updated_at)
            VALUES ('test-person-id', 'Test Person', 'test@example.com', 40, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO person_skills (person_id, skill_id, proficiency)
            VALUES ('test-person-id', ${skill.id}, 'intermediate')
          `;

        // Verify association exists
        const beforeRemove = yield* sql`
            SELECT * FROM person_skills WHERE skill_id = ${skill.id}
          `;
        assert.strictEqual(beforeRemove.length, 1);

        // Remove the skill
        yield* service.remove(skill.id);

        // Verify association was removed
        const afterRemove = yield* sql`
            SELECT * FROM person_skills WHERE skill_id = ${skill.id}
          `;
        assert.strictEqual(afterRemove.length, 0);
      }) as Effect.Effect<void>,
  );
});
