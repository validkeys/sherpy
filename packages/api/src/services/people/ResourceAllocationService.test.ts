/**
 * ResourceAllocationService tests using @effect/vitest with real SQLite (SA-008)
 * Tests SQL aggregation for resource allocation across people and projects
 */

import { Reactivity } from "@effect/experimental";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { LibsqlClient } from "@effect/sql-libsql";
import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { runMigrations } from "../../db/migration-runner.js";
import { AssignmentService, AssignmentServiceLive } from "./AssignmentService.js";
import { PersonService, PersonServiceLive } from "./PersonService.js";
import {
  ResourceAllocationService,
  ResourceAllocationServiceLive,
} from "./ResourceAllocationService.js";

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

/**
 * Seed test data: 2 people, 2 projects, multiple tasks, and assignments
 */
const seedTestData = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const personService = yield* PersonService;
  const assignmentService = yield* AssignmentService;

  // Create people
  const alice = yield* personService.create({
    name: "Alice",
    email: "alice@example.com",
    capacityHoursPerWeek: 40,
  });

  const bob = yield* personService.create({
    name: "Bob",
    email: "bob@example.com",
    capacityHoursPerWeek: 40,
  });

  // Create projects
  yield* sql`
    INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
    VALUES
      ('project-1', 'project-1', 'Project Alpha', 'First project', 'active', '2024-01-01', '2024-01-01'),
      ('project-2', 'project-2', 'Project Beta', 'Second project', 'active', '2024-01-01', '2024-01-01')
  `;

  // Create milestones
  yield* sql`
    INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
    VALUES
      ('milestone-1', 'project-1', 'M1', 'Milestone 1', 'active', 0, '2024-01-01', '2024-01-01'),
      ('milestone-2', 'project-2', 'M2', 'Milestone 2', 'active', 0, '2024-01-01', '2024-01-01')
  `;

  // Create tasks for Project Alpha
  yield* sql`
    INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
    VALUES
      ('task-1', 'milestone-1', 'project-1', 'Task 1', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01'),
      ('task-2', 'milestone-1', 'project-1', 'Task 2', 'Description', 'pending', 'medium', 10, 1, '2024-01-01', '2024-01-01'),
      ('task-3', 'milestone-1', 'project-1', 'Task 3', 'Description', 'pending', 'medium', 10, 2, '2024-01-01', '2024-01-01')
  `;

  // Create tasks for Project Beta
  yield* sql`
    INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
    VALUES
      ('task-4', 'milestone-2', 'project-2', 'Task 4', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01'),
      ('task-5', 'milestone-2', 'project-2', 'Task 5', 'Description', 'pending', 'medium', 10, 1, '2024-01-01', '2024-01-01')
  `;

  // Create assignments:
  // Alice: 30% on task-1, 20% on task-2 (Project Alpha = 50%)
  // Alice: 40% on task-4 (Project Beta = 40%)
  // Bob: 50% on task-2, 30% on task-3 (Project Alpha = 80%)
  // Bob: 20% on task-5 (Project Beta = 20%)

  yield* assignmentService.assign({
    taskId: "task-1",
    personId: alice.id,
    allocationPercentage: 30,
  });

  yield* assignmentService.assign({
    taskId: "task-2",
    personId: alice.id,
    allocationPercentage: 20,
  });

  yield* assignmentService.assign({
    taskId: "task-4",
    personId: alice.id,
    allocationPercentage: 40,
  });

  yield* assignmentService.assign({
    taskId: "task-2",
    personId: bob.id,
    allocationPercentage: 50,
  });

  yield* assignmentService.assign({
    taskId: "task-3",
    personId: bob.id,
    allocationPercentage: 30,
  });

  yield* assignmentService.assign({
    taskId: "task-5",
    personId: bob.id,
    allocationPercentage: 20,
  });

  return { alice, bob };
});

describe("ResourceAllocationService", () => {
  it.scoped(
    "allocationByPerson - aggregates total allocation per person with assignment details",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personServiceLayer = PersonServiceLive.pipe(
          Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        );

        const assignmentServiceLayer = AssignmentServiceLive.pipe(
          Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        );

        const allocationServiceLayer = ResourceAllocationServiceLive.pipe(
          Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        );

        const { alice, bob } = yield* seedTestData.pipe(
          Effect.provide(
            Layer.mergeAll(
              Layer.succeed(SqlClient.SqlClient, sql),
              personServiceLayer,
              assignmentServiceLayer,
              allocationServiceLayer,
            ),
          ),
        );

        const allocationService = yield* ResourceAllocationService.pipe(
          Effect.provide(allocationServiceLayer),
        );

        const allocations = yield* allocationService.allocationByPerson();

        // Should have 2 people
        assert.strictEqual(allocations.length, 2);

        // Find Alice's allocation (90% total across 3 assignments)
        const aliceAllocation = allocations.find((a) => a.personId === alice.id);
        assert.ok(aliceAllocation, "Alice allocation should exist");
        assert.strictEqual(aliceAllocation!.personName, "Alice");
        assert.strictEqual(aliceAllocation!.totalAllocation, 90);
        assert.strictEqual(aliceAllocation!.assignments.length, 3);

        // Verify Alice's assignment details
        const aliceTask1 = aliceAllocation!.assignments.find((a) => a.taskId === "task-1");
        assert.ok(aliceTask1, "Alice's task-1 assignment should exist");
        assert.strictEqual(aliceTask1!.allocation, 30);
        assert.strictEqual(aliceTask1!.projectId, "project-1");
        assert.strictEqual(aliceTask1!.projectName, "Project Alpha");

        // Find Bob's allocation (100% total across 3 assignments)
        const bobAllocation = allocations.find((a) => a.personId === bob.id);
        assert.ok(bobAllocation, "Bob allocation should exist");
        assert.strictEqual(bobAllocation!.personName, "Bob");
        assert.strictEqual(bobAllocation!.totalAllocation, 100);
        assert.strictEqual(bobAllocation!.assignments.length, 3);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "allocationByProject - aggregates total allocation per project with person breakdown",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personServiceLayer = PersonServiceLive.pipe(
          Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        );

        const assignmentServiceLayer = AssignmentServiceLive.pipe(
          Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        );

        const allocationServiceLayer = ResourceAllocationServiceLive.pipe(
          Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        );

        const { alice, bob } = yield* seedTestData.pipe(
          Effect.provide(
            Layer.mergeAll(
              Layer.succeed(SqlClient.SqlClient, sql),
              personServiceLayer,
              assignmentServiceLayer,
              allocationServiceLayer,
            ),
          ),
        );

        const allocationService = yield* ResourceAllocationService.pipe(
          Effect.provide(allocationServiceLayer),
        );

        const allocations = yield* allocationService.allocationByProject();

        // Should have 2 projects
        assert.strictEqual(allocations.length, 2);

        // Find Project Alpha (130% total: Alice 50% + Bob 80%)
        const projectAlpha = allocations.find((a) => a.projectId === "project-1");
        assert.ok(projectAlpha, "Project Alpha should exist");
        assert.strictEqual(projectAlpha!.projectName, "Project Alpha");
        assert.strictEqual(projectAlpha!.totalAllocation, 130);
        assert.strictEqual(projectAlpha!.people.length, 2);

        // Verify Alice's allocation on Project Alpha
        const aliceOnAlpha = projectAlpha!.people.find((p) => p.personId === alice.id);
        assert.ok(aliceOnAlpha, "Alice on Project Alpha should exist");
        assert.strictEqual(aliceOnAlpha!.personName, "Alice");
        assert.strictEqual(aliceOnAlpha!.allocation, 50);
        assert.strictEqual(aliceOnAlpha!.assignmentCount, 2);

        // Verify Bob's allocation on Project Alpha
        const bobOnAlpha = projectAlpha!.people.find((p) => p.personId === bob.id);
        assert.ok(bobOnAlpha, "Bob on Project Alpha should exist");
        assert.strictEqual(bobOnAlpha!.personName, "Bob");
        assert.strictEqual(bobOnAlpha!.allocation, 80);
        assert.strictEqual(bobOnAlpha!.assignmentCount, 2);

        // Find Project Beta (60% total: Alice 40% + Bob 20%)
        const projectBeta = allocations.find((a) => a.projectId === "project-2");
        assert.ok(projectBeta, "Project Beta should exist");
        assert.strictEqual(projectBeta!.projectName, "Project Beta");
        assert.strictEqual(projectBeta!.totalAllocation, 60);
        assert.strictEqual(projectBeta!.people.length, 2);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "personAllocationByProject - returns allocation breakdown for a specific person",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personServiceLayer = PersonServiceLive.pipe(
          Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        );

        const assignmentServiceLayer = AssignmentServiceLive.pipe(
          Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        );

        const allocationServiceLayer = ResourceAllocationServiceLive.pipe(
          Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        );

        const { alice } = yield* seedTestData.pipe(
          Effect.provide(
            Layer.mergeAll(
              Layer.succeed(SqlClient.SqlClient, sql),
              personServiceLayer,
              assignmentServiceLayer,
              allocationServiceLayer,
            ),
          ),
        );

        const allocationService = yield* ResourceAllocationService.pipe(
          Effect.provide(allocationServiceLayer),
        );

        const allocations = yield* allocationService.personAllocationByProject(alice.id);

        // Alice has allocations on 2 projects
        assert.strictEqual(allocations.length, 2);

        // Project Alpha: 50% across 2 tasks
        const alphaAllocation = allocations.find((a) => a.projectId === "project-1");
        assert.ok(alphaAllocation, "Alpha allocation should exist");
        assert.strictEqual(alphaAllocation!.projectName, "Project Alpha");
        assert.strictEqual(alphaAllocation!.totalAllocation, 50);
        assert.strictEqual(alphaAllocation!.assignmentCount, 2);

        // Project Beta: 40% across 1 task
        const betaAllocation = allocations.find((a) => a.projectId === "project-2");
        assert.ok(betaAllocation, "Beta allocation should exist");
        assert.strictEqual(betaAllocation!.projectName, "Project Beta");
        assert.strictEqual(betaAllocation!.totalAllocation, 40);
        assert.strictEqual(betaAllocation!.assignmentCount, 1);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "personAllocationByProject - returns empty array for person with no assignments",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personServiceLayer = PersonServiceLive.pipe(
          Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        );

        const allocationServiceLayer = ResourceAllocationServiceLive.pipe(
          Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        );

        const personService = yield* PersonService.pipe(Effect.provide(personServiceLayer));

        const charlie = yield* personService.create({
          name: "Charlie",
          email: "charlie@example.com",
          capacityHoursPerWeek: 40,
        });

        const allocationService = yield* ResourceAllocationService.pipe(
          Effect.provide(allocationServiceLayer),
        );

        const allocations = yield* allocationService.personAllocationByProject(charlie.id);

        // Charlie has no assignments
        assert.strictEqual(allocations.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "personAllocationByProject - fails for non-existent person",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const allocationServiceLayer = ResourceAllocationServiceLive.pipe(
          Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        );

        const allocationService = yield* ResourceAllocationService.pipe(
          Effect.provide(allocationServiceLayer),
        );

        const result = yield* allocationService
          .personAllocationByProject("non-existent-id")
          .pipe(Effect.either);

        assert.deepStrictEqual(result._tag, "Left");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "allocationByPerson - handles people with no assignments",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personServiceLayer = PersonServiceLive.pipe(
          Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        );

        const allocationServiceLayer = ResourceAllocationServiceLive.pipe(
          Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        );

        const personService = yield* PersonService.pipe(Effect.provide(personServiceLayer));

        const charlie = yield* personService.create({
          name: "Charlie",
          email: "charlie@example.com",
          capacityHoursPerWeek: 40,
        });

        const allocationService = yield* ResourceAllocationService.pipe(
          Effect.provide(allocationServiceLayer),
        );

        const allocations = yield* allocationService.allocationByPerson();

        // Should include Charlie with 0% allocation
        const charlieAllocation = allocations.find((a) => a.personId === charlie.id);
        assert.ok(charlieAllocation, "Charlie allocation should exist");
        assert.strictEqual(charlieAllocation!.personName, "Charlie");
        assert.strictEqual(charlieAllocation!.totalAllocation, 0);
        assert.strictEqual(charlieAllocation!.assignments.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "allocationByProject - handles projects with no assignments",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const allocationServiceLayer = ResourceAllocationServiceLive.pipe(
          Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        );

        // Create a project with no assignments
        yield* sql`
          INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
          VALUES ('empty-project', 'empty-project', 'Empty Project', 'No tasks', 'active', '2024-01-01', '2024-01-01')
        `;

        const allocationService = yield* ResourceAllocationService.pipe(
          Effect.provide(allocationServiceLayer),
        );

        const allocations = yield* allocationService.allocationByProject();

        // Should include empty project with 0% allocation
        const emptyProject = allocations.find((a) => a.projectId === "empty-project");
        assert.ok(emptyProject, "Empty project should exist");
        assert.strictEqual(emptyProject!.projectName, "Empty Project");
        assert.strictEqual(emptyProject!.totalAllocation, 0);
        assert.strictEqual(emptyProject!.people.length, 0);
      }) as Effect.Effect<void>,
  );
});
