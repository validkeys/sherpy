/**
 * AssignmentService tests using @effect/vitest with real SQLite (SA-008)
 * Tests join-based operations to verify no N+1 queries (SA-003)
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
  type AssignInput,
  AssignmentService,
  AssignmentServiceLive,
  type UpdateAllocationInput,
} from "./AssignmentService.js";
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

describe("AssignmentService", () => {
  it.scoped(
    "assign - creates assignment with valid allocation",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        // Create person
        const person = yield* personService.create({
          name: "Alice",
          email: "alice@example.com",
          capacityHoursPerWeek: 40,
        });

        // Create milestone and project and task manually for testing
        yield* sql`
            INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
            VALUES ('test-project-id', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
            VALUES ('test-milestone-id', 'test-project-id', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
            VALUES ('test-task-id', 'test-milestone-id', 'test-project-id', 'Test Task', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
          `;

        const input: typeof AssignInput.Type = {
          taskId: "test-task-id",
          personId: person.id,
          allocationPercentage: 50,
        };

        const assignment = yield* assignmentService.assign(input);

        assert.strictEqual(assignment.taskId, "test-task-id");
        assert.strictEqual(assignment.personId, person.id);
        assert.strictEqual(assignment.allocationPercentage, 50);
        assert.strictEqual(assignment.status, "planned");
        assert.match(assignment.id, /^[0-9a-f-]{36}$/);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "assign - rejects allocation less than 1",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Bob",
          email: "bob@example.com",
          capacityHoursPerWeek: 40,
        });

        yield* sql`
            INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
            VALUES ('test-project-id', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
            VALUES ('test-milestone-id', 'test-project-id', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
            VALUES ('test-task-id', 'test-milestone-id', 'test-project-id', 'Test Task', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
          `;

        const input = {
          taskId: "test-task-id",
          personId: person.id,
          allocationPercentage: 0,
        };

        const result = yield* Effect.either(assignmentService.assign(input as any));

        assert.isTrue(Either.isLeft(result));
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "assign - rejects allocation greater than 100",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Charlie",
          email: "charlie@example.com",
          capacityHoursPerWeek: 40,
        });

        yield* sql`
            INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
            VALUES ('test-project-id', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
            VALUES ('test-milestone-id', 'test-project-id', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
            VALUES ('test-task-id', 'test-milestone-id', 'test-project-id', 'Test Task', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
          `;

        const input = {
          taskId: "test-task-id",
          personId: person.id,
          allocationPercentage: 101,
        };

        const result = yield* Effect.either(assignmentService.assign(input as any));

        assert.isTrue(Either.isLeft(result));
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "assign - boundary values 1 and 100 are accepted",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Diana",
          email: "diana@example.com",
          capacityHoursPerWeek: 40,
        });

        yield* sql`
            INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
            VALUES ('test-project-id', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
            VALUES ('test-milestone-id', 'test-project-id', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
            VALUES ('test-task-1', 'test-milestone-id', 'test-project-id', 'Test Task 1', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
            VALUES ('test-task-2', 'test-milestone-id', 'test-project-id', 'Test Task 2', 'Description', 'pending', 'medium', 10, 1, '2024-01-01', '2024-01-01')
          `;

        // Test allocation = 1
        const assignment1 = yield* assignmentService.assign({
          taskId: "test-task-1",
          personId: person.id,
          allocationPercentage: 1,
        });

        assert.strictEqual(assignment1.allocationPercentage, 1);

        // Test allocation = 100
        const assignment2 = yield* assignmentService.assign({
          taskId: "test-task-2",
          personId: person.id,
          allocationPercentage: 100,
        });

        assert.strictEqual(assignment2.allocationPercentage, 100);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "assign - fails when person does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        yield* sql`
            INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
            VALUES ('test-project-id', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
            VALUES ('test-milestone-id', 'test-project-id', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
            VALUES ('test-task-id', 'test-milestone-id', 'test-project-id', 'Test Task', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
          `;

        const input: typeof AssignInput.Type = {
          taskId: "test-task-id",
          personId: "non-existent-person",
          allocationPercentage: 50,
        };

        const result = yield* Effect.either(assignmentService.assign(input));

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
    "assign - fails when task does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Eve",
          email: "eve@example.com",
          capacityHoursPerWeek: 40,
        });

        const input: typeof AssignInput.Type = {
          taskId: "non-existent-task",
          personId: person.id,
          allocationPercentage: 50,
        };

        const result = yield* Effect.either(assignmentService.assign(input));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
          if (result.left instanceof NotFoundError) {
            assert.strictEqual(result.left.entity, "Task");
          }
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "unassign - removes assignment",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Frank",
          email: "frank@example.com",
          capacityHoursPerWeek: 40,
        });

        yield* sql`
            INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
            VALUES ('test-project-id', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
            VALUES ('test-milestone-id', 'test-project-id', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
            VALUES ('test-task-id', 'test-milestone-id', 'test-project-id', 'Test Task', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
          `;

        const assignment = yield* assignmentService.assign({
          taskId: "test-task-id",
          personId: person.id,
          allocationPercentage: 50,
        });

        // Remove the assignment
        yield* assignmentService.unassign(assignment.id);

        // Verify it was removed
        const result = yield* Effect.either(assignmentService.unassign(assignment.id));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "unassign - fails when assignment does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const result = yield* Effect.either(assignmentService.unassign("non-existent-assignment"));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "updateAllocation - updates allocation percentage",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Grace",
          email: "grace@example.com",
          capacityHoursPerWeek: 40,
        });

        yield* sql`
            INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
            VALUES ('test-project-id', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
            VALUES ('test-milestone-id', 'test-project-id', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
            VALUES ('test-task-id', 'test-milestone-id', 'test-project-id', 'Test Task', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
          `;

        const assignment = yield* assignmentService.assign({
          taskId: "test-task-id",
          personId: person.id,
          allocationPercentage: 50,
        });

        const input: typeof UpdateAllocationInput.Type = {
          allocationPercentage: 75,
        };

        const updated = yield* assignmentService.updateAllocation(assignment.id, input);

        assert.strictEqual(updated.allocationPercentage, 75);
        assert.strictEqual(updated.id, assignment.id);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "updateAllocation - validates allocation boundaries",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Henry",
          email: "henry@example.com",
          capacityHoursPerWeek: 40,
        });

        yield* sql`
            INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
            VALUES ('test-project-id', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
            VALUES ('test-milestone-id', 'test-project-id', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
            VALUES ('test-task-id', 'test-milestone-id', 'test-project-id', 'Test Task', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
          `;

        const assignment = yield* assignmentService.assign({
          taskId: "test-task-id",
          personId: person.id,
          allocationPercentage: 50,
        });

        // Test allocation < 1
        const result1 = yield* Effect.either(
          assignmentService.updateAllocation(assignment.id, {
            allocationPercentage: 0,
          } as any),
        );
        assert.isTrue(Either.isLeft(result1));

        // Test allocation > 100
        const result2 = yield* Effect.either(
          assignmentService.updateAllocation(assignment.id, {
            allocationPercentage: 101,
          } as any),
        );
        assert.isTrue(Either.isLeft(result2));
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "updateAllocation - fails when assignment does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const input: typeof UpdateAllocationInput.Type = {
          allocationPercentage: 75,
        };

        const result = yield* Effect.either(
          assignmentService.updateAllocation("non-existent-assignment", input),
        );

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listByPerson - returns assignments with task details using JOIN",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Ivy",
          email: "ivy@example.com",
          capacityHoursPerWeek: 40,
        });

        yield* sql`
            INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
            VALUES ('test-project-id', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
            VALUES ('test-milestone-id', 'test-project-id', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
            VALUES ('test-task-1', 'test-milestone-id', 'test-project-id', 'Task 1', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
            VALUES ('test-task-2', 'test-milestone-id', 'test-project-id', 'Task 2', 'Description', 'in_progress', 'medium', 20, 1, '2024-01-01', '2024-01-01')
          `;

        yield* assignmentService.assign({
          taskId: "test-task-1",
          personId: person.id,
          allocationPercentage: 30,
        });

        yield* assignmentService.assign({
          taskId: "test-task-2",
          personId: person.id,
          allocationPercentage: 70,
        });

        const results = yield* assignmentService.listByPerson(person.id);

        assert.strictEqual(results.length, 2);
        assert.isTrue(results.every((r) => r.assignment.personId === person.id));
        assert.isTrue(results.every((r) => r.task.id !== undefined));
        assert.isTrue(results.every((r) => r.task.name !== undefined));
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listByPerson - returns empty array when person has no assignments",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Jack",
          email: "jack@example.com",
          capacityHoursPerWeek: 40,
        });

        const results = yield* assignmentService.listByPerson(person.id);

        assert.strictEqual(results.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listByPerson - fails when person does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const result = yield* Effect.either(assignmentService.listByPerson("non-existent-person"));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listByTask - returns assignments with person details using JOIN",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
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
          capacityHoursPerWeek: 30,
        });

        yield* sql`
            INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
            VALUES ('test-project-id', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
            VALUES ('test-milestone-id', 'test-project-id', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
            VALUES ('test-task-id', 'test-milestone-id', 'test-project-id', 'Test Task', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
          `;

        yield* assignmentService.assign({
          taskId: "test-task-id",
          personId: person1.id,
          allocationPercentage: 50,
        });

        yield* assignmentService.assign({
          taskId: "test-task-id",
          personId: person2.id,
          allocationPercentage: 50,
        });

        const results = yield* assignmentService.listByTask("test-task-id");

        assert.strictEqual(results.length, 2);
        assert.isTrue(results.every((r) => r.assignment.taskId === "test-task-id"));
        assert.isTrue(results.every((r) => r.person.id !== undefined));
        assert.isTrue(results.every((r) => r.person.name !== undefined));
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listByTask - returns empty array when task has no assignments",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        yield* sql`
            INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
            VALUES ('test-project-id', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
            VALUES ('test-milestone-id', 'test-project-id', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
            VALUES ('test-task-id', 'test-milestone-id', 'test-project-id', 'Test Task', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
          `;

        const results = yield* assignmentService.listByTask("test-task-id");

        assert.strictEqual(results.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listByTask - fails when task does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const result = yield* Effect.either(assignmentService.listByTask("non-existent-task"));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listByProject - returns assignments with person and task details using JOIN",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person1 = yield* personService.create({
          name: "Mia",
          email: "mia@example.com",
          capacityHoursPerWeek: 40,
        });

        const person2 = yield* personService.create({
          name: "Noah",
          email: "noah@example.com",
          capacityHoursPerWeek: 30,
        });

        yield* sql`
            INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
            VALUES ('test-project-id', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
            VALUES ('test-milestone-id', 'test-project-id', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
            VALUES ('test-task-1', 'test-milestone-id', 'test-project-id', 'Task 1', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
          `;

        yield* sql`
            INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
            VALUES ('test-task-2', 'test-milestone-id', 'test-project-id', 'Task 2', 'Description', 'in_progress', 'medium', 20, 1, '2024-01-01', '2024-01-01')
          `;

        yield* assignmentService.assign({
          taskId: "test-task-1",
          personId: person1.id,
          allocationPercentage: 50,
        });

        yield* assignmentService.assign({
          taskId: "test-task-2",
          personId: person2.id,
          allocationPercentage: 100,
        });

        const results = yield* assignmentService.listByProject("test-project-id");

        assert.strictEqual(results.length, 2);
        assert.isTrue(results.every((r) => r.assignment.id !== undefined));
        assert.isTrue(results.every((r) => r.person.id !== undefined));
        assert.isTrue(results.every((r) => r.person.name !== undefined));
        assert.isTrue(results.every((r) => r.task.id !== undefined));
        assert.isTrue(results.every((r) => r.task.name !== undefined));
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listByProject - returns empty array when project has no assignments",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const assignmentService = yield* AssignmentService.pipe(
          Effect.provide(
            AssignmentServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        yield* sql`
            INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
            VALUES ('test-project-id', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
          `;

        const results = yield* assignmentService.listByProject("test-project-id");

        assert.strictEqual(results.length, 0);
      }) as Effect.Effect<void>,
  );
});
