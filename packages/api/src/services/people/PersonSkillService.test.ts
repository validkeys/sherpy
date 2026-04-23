/**
 * PersonSkillService tests using @effect/vitest with real SQLite (SA-008)
 * Tests join-based operations to verify no N+1 queries (SA-003)
 */

import { Reactivity } from "@effect/experimental";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { LibsqlClient } from "@effect/sql-libsql";
import { assert, describe, it } from "@effect/vitest";
import { ConflictError, NotFoundError } from "@sherpy/shared";
import { Effect, Either, Layer } from "effect";
import { runMigrations } from "../../db/migration-runner.js";
import { PersonService, PersonServiceLive } from "./PersonService.js";
import {
  type AddSkillInput,
  PersonSkillService,
  PersonSkillServiceLive,
} from "./PersonSkillService.js";
import { SkillService, SkillServiceLive } from "./SkillService.js";

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

describe("PersonSkillService", () => {
  it.scoped(
    "addSkill - adds skill to person with proficiency",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const skillService = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const personSkillService = yield* PersonSkillService.pipe(
          Effect.provide(
            PersonSkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Alice",
          email: "alice@example.com",
          capacityHoursPerWeek: 40,
        });

        const skill = yield* skillService.create({ name: "TypeScript" });

        const input: typeof AddSkillInput.Type = {
          personId: person.id,
          skillId: skill.id,
          proficiency: "advanced",
        };

        const personSkill = yield* personSkillService.addSkill(input);

        assert.strictEqual(personSkill.personId, person.id);
        assert.strictEqual(personSkill.skillId, skill.id);
        assert.strictEqual(personSkill.proficiency, "advanced");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "addSkill - fails when person does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const skillService = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const personSkillService = yield* PersonSkillService.pipe(
          Effect.provide(
            PersonSkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const skill = yield* skillService.create({ name: "React" });

        const input: typeof AddSkillInput.Type = {
          personId: "non-existent-person",
          skillId: skill.id,
          proficiency: "beginner",
        };

        const result = yield* Effect.either(personSkillService.addSkill(input));

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
    "addSkill - fails when skill does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const personSkillService = yield* PersonSkillService.pipe(
          Effect.provide(
            PersonSkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Bob",
          email: "bob@example.com",
          capacityHoursPerWeek: 40,
        });

        const input: typeof AddSkillInput.Type = {
          personId: person.id,
          skillId: "non-existent-skill",
          proficiency: "beginner",
        };

        const result = yield* Effect.either(personSkillService.addSkill(input));

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
    "addSkill - fails when person already has the skill",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const skillService = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const personSkillService = yield* PersonSkillService.pipe(
          Effect.provide(
            PersonSkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Charlie",
          email: "charlie@example.com",
          capacityHoursPerWeek: 40,
        });

        const skill = yield* skillService.create({ name: "Python" });

        // Add skill first time
        yield* personSkillService.addSkill({
          personId: person.id,
          skillId: skill.id,
          proficiency: "intermediate",
        });

        // Try to add again
        const result = yield* Effect.either(
          personSkillService.addSkill({
            personId: person.id,
            skillId: skill.id,
            proficiency: "advanced",
          }),
        );

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, ConflictError);
          if (result.left instanceof ConflictError) {
            assert.strictEqual(result.left.resource, "PersonSkill");
          }
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "removeSkill - removes skill from person",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const skillService = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const personSkillService = yield* PersonSkillService.pipe(
          Effect.provide(
            PersonSkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Diana",
          email: "diana@example.com",
          capacityHoursPerWeek: 40,
        });

        const skill = yield* skillService.create({ name: "Docker" });

        yield* personSkillService.addSkill({
          personId: person.id,
          skillId: skill.id,
          proficiency: "beginner",
        });

        // Remove the skill
        yield* personSkillService.removeSkill(person.id, skill.id);

        // Verify it was removed
        const result = yield* Effect.either(personSkillService.removeSkill(person.id, skill.id));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "removeSkill - fails when association does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const skillService = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const personSkillService = yield* PersonSkillService.pipe(
          Effect.provide(
            PersonSkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Eve",
          email: "eve@example.com",
          capacityHoursPerWeek: 40,
        });

        const skill = yield* skillService.create({ name: "Kubernetes" });

        const result = yield* Effect.either(personSkillService.removeSkill(person.id, skill.id));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listSkillsForPerson - returns all skills with proficiency using JOIN",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const skillService = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const personSkillService = yield* PersonSkillService.pipe(
          Effect.provide(
            PersonSkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Frank",
          email: "frank@example.com",
          capacityHoursPerWeek: 40,
        });

        const skill1 = yield* skillService.create({ name: "TypeScript", category: "Programming" });
        const skill2 = yield* skillService.create({ name: "React", category: "Frontend" });
        const skill3 = yield* skillService.create({ name: "Node.js", category: "Backend" });

        yield* personSkillService.addSkill({
          personId: person.id,
          skillId: skill1.id,
          proficiency: "expert",
        });

        yield* personSkillService.addSkill({
          personId: person.id,
          skillId: skill2.id,
          proficiency: "advanced",
        });

        yield* personSkillService.addSkill({
          personId: person.id,
          skillId: skill3.id,
          proficiency: "intermediate",
        });

        const result = yield* personSkillService.listSkillsForPerson(person.id);

        assert.strictEqual(result.person.id, person.id);
        assert.strictEqual(result.skills.length, 3);

        // Verify ordered by name
        assert.strictEqual(result.skills[0]!.skill.name, "Node.js");
        assert.strictEqual(result.skills[0]!.proficiency, "intermediate");

        assert.strictEqual(result.skills[1]!.skill.name, "React");
        assert.strictEqual(result.skills[1]!.proficiency, "advanced");

        assert.strictEqual(result.skills[2]!.skill.name, "TypeScript");
        assert.strictEqual(result.skills[2]!.proficiency, "expert");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listSkillsForPerson - returns empty array when person has no skills",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const personSkillService = yield* PersonSkillService.pipe(
          Effect.provide(
            PersonSkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Grace",
          email: "grace@example.com",
          capacityHoursPerWeek: 40,
        });

        const result = yield* personSkillService.listSkillsForPerson(person.id);

        assert.strictEqual(result.person.id, person.id);
        assert.strictEqual(result.skills.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listSkillsForPerson - fails when person does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personSkillService = yield* PersonSkillService.pipe(
          Effect.provide(
            PersonSkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const result = yield* Effect.either(
          personSkillService.listSkillsForPerson("non-existent-person"),
        );

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listPeopleForSkill - returns all people with proficiency using JOIN",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const skillService = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const personSkillService = yield* PersonSkillService.pipe(
          Effect.provide(
            PersonSkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const skill = yield* skillService.create({ name: "Rust" });

        const person1 = yield* personService.create({
          name: "Zara",
          email: "zara@example.com",
          capacityHoursPerWeek: 40,
        });

        const person2 = yield* personService.create({
          name: "Alice",
          email: "alice2@example.com",
          capacityHoursPerWeek: 30,
        });

        const person3 = yield* personService.create({
          name: "Mike",
          email: "mike@example.com",
          capacityHoursPerWeek: 35,
        });

        yield* personSkillService.addSkill({
          personId: person1.id,
          skillId: skill.id,
          proficiency: "beginner",
        });

        yield* personSkillService.addSkill({
          personId: person2.id,
          skillId: skill.id,
          proficiency: "expert",
        });

        yield* personSkillService.addSkill({
          personId: person3.id,
          skillId: skill.id,
          proficiency: "intermediate",
        });

        const result = yield* personSkillService.listPeopleForSkill(skill.id);

        assert.strictEqual(result.skill.id, skill.id);
        assert.strictEqual(result.people.length, 3);

        // Verify ordered by person name
        assert.strictEqual(result.people[0]!.person.name, "Alice");
        assert.strictEqual(result.people[0]!.proficiency, "expert");

        assert.strictEqual(result.people[1]!.person.name, "Mike");
        assert.strictEqual(result.people[1]!.proficiency, "intermediate");

        assert.strictEqual(result.people[2]!.person.name, "Zara");
        assert.strictEqual(result.people[2]!.proficiency, "beginner");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listPeopleForSkill - returns empty array when skill has no people",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const skillService = yield* SkillService.pipe(
          Effect.provide(
            SkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const personSkillService = yield* PersonSkillService.pipe(
          Effect.provide(
            PersonSkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const skill = yield* skillService.create({ name: "Elixir" });

        const result = yield* personSkillService.listPeopleForSkill(skill.id);

        assert.strictEqual(result.skill.id, skill.id);
        assert.strictEqual(result.people.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listPeopleForSkill - fails when skill does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personSkillService = yield* PersonSkillService.pipe(
          Effect.provide(
            PersonSkillServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const result = yield* Effect.either(
          personSkillService.listPeopleForSkill("non-existent-skill"),
        );

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );
});
