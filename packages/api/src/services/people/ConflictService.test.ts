/**
 * ConflictService tests using @effect/vitest with real SQLite (SA-008)
 * Tests conflict detection with realistic data scenarios and edge cases
 */

import { Reactivity } from "@effect/experimental";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { LibsqlClient } from "@effect/sql-libsql";
import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { runMigrations } from "../../db/migration-runner.js";
import { AvailabilityService, AvailabilityServiceLive } from "./AvailabilityService.js";
import { AssignmentService, AssignmentServiceLive } from "./AssignmentService.js";
import { ConflictService, ConflictServiceLive } from "./ConflictService.js";
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

describe("ConflictService", () => {
  it.scoped(
    "detectOverAllocation - detects when total allocation exceeds 100%",
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

        const conflictService = yield* ConflictService.pipe(
          Effect.provide(
            ConflictServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Alice",
          email: "alice@example.com",
          capacityHoursPerWeek: 40,
        });

        // Create project, milestone, and tasks
        yield* sql`
          INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
          VALUES ('test-project', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
        `;

        yield* sql`
          INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
          VALUES ('test-milestone', 'test-project', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
        `;

        yield* sql`
          INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
          VALUES ('task-1', 'test-milestone', 'test-project', 'Task 1', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
        `;

        yield* sql`
          INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
          VALUES ('task-2', 'test-milestone', 'test-project', 'Task 2', 'Description', 'pending', 'medium', 10, 1, '2024-01-01', '2024-01-01')
        `;

        yield* sql`
          INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
          VALUES ('task-3', 'test-milestone', 'test-project', 'Task 3', 'Description', 'pending', 'medium', 10, 2, '2024-01-01', '2024-01-01')
        `;

        // Create overlapping assignments that total 150%
        yield* assignmentService.assign({
          taskId: "task-1",
          personId: person.id,
          allocationPercentage: 50,
          startDate: "2024-06-01",
          endDate: "2024-06-30",
        });

        yield* assignmentService.assign({
          taskId: "task-2",
          personId: person.id,
          allocationPercentage: 60,
          startDate: "2024-06-10",
          endDate: "2024-06-25",
        });

        yield* assignmentService.assign({
          taskId: "task-3",
          personId: person.id,
          allocationPercentage: 40,
          startDate: "2024-06-15",
          endDate: "2024-06-20",
        });

        const conflicts = yield* conflictService.detectOverAllocation(
          person.id,
          "2024-06-15",
          "2024-06-20",
        );

        assert.strictEqual(conflicts.length, 1);
        assert.strictEqual(conflicts[0]?.type, "over_allocation");
        assert.strictEqual(conflicts[0]?.totalAllocation, 150);
        assert.strictEqual(conflicts[0]?.overAllocationDetails?.length, 3);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "detectOverAllocation - returns no conflicts when total equals exactly 100%",
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

        const conflictService = yield* ConflictService.pipe(
          Effect.provide(
            ConflictServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Bob",
          email: "bob@example.com",
          capacityHoursPerWeek: 40,
        });

        yield* sql`
          INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
          VALUES ('test-project', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
        `;

        yield* sql`
          INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
          VALUES ('test-milestone', 'test-project', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
        `;

        yield* sql`
          INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
          VALUES ('task-1', 'test-milestone', 'test-project', 'Task 1', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
        `;

        yield* sql`
          INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
          VALUES ('task-2', 'test-milestone', 'test-project', 'Task 2', 'Description', 'pending', 'medium', 10, 1, '2024-01-01', '2024-01-01')
        `;

        // Create overlapping assignments that total exactly 100%
        yield* assignmentService.assign({
          taskId: "task-1",
          personId: person.id,
          allocationPercentage: 60,
          startDate: "2024-06-01",
          endDate: "2024-06-30",
        });

        yield* assignmentService.assign({
          taskId: "task-2",
          personId: person.id,
          allocationPercentage: 40,
          startDate: "2024-06-10",
          endDate: "2024-06-25",
        });

        const conflicts = yield* conflictService.detectOverAllocation(
          person.id,
          "2024-06-10",
          "2024-06-25",
        );

        assert.strictEqual(conflicts.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "detectOverAllocation - returns no conflicts for non-overlapping assignments",
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

        const conflictService = yield* ConflictService.pipe(
          Effect.provide(
            ConflictServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Charlie",
          email: "charlie@example.com",
          capacityHoursPerWeek: 40,
        });

        yield* sql`
          INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
          VALUES ('test-project', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
        `;

        yield* sql`
          INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
          VALUES ('test-milestone', 'test-project', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
        `;

        yield* sql`
          INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
          VALUES ('task-1', 'test-milestone', 'test-project', 'Task 1', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
        `;

        yield* sql`
          INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
          VALUES ('task-2', 'test-milestone', 'test-project', 'Task 2', 'Description', 'pending', 'medium', 10, 1, '2024-01-01', '2024-01-01')
        `;

        // Create non-overlapping assignments, each at 100%
        yield* assignmentService.assign({
          taskId: "task-1",
          personId: person.id,
          allocationPercentage: 100,
          startDate: "2024-06-01",
          endDate: "2024-06-15",
        });

        yield* assignmentService.assign({
          taskId: "task-2",
          personId: person.id,
          allocationPercentage: 100,
          startDate: "2024-06-15",
          endDate: "2024-06-30",
        });

        // Check first period
        const conflicts1 = yield* conflictService.detectOverAllocation(
          person.id,
          "2024-06-01",
          "2024-06-10",
        );
        assert.strictEqual(conflicts1.length, 0);

        // Check second period
        const conflicts2 = yield* conflictService.detectOverAllocation(
          person.id,
          "2024-06-20",
          "2024-06-30",
        );
        assert.strictEqual(conflicts2.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "detectOverAllocation - returns empty array when person has no assignments",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const conflictService = yield* ConflictService.pipe(
          Effect.provide(
            ConflictServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Diana",
          email: "diana@example.com",
          capacityHoursPerWeek: 40,
        });

        const conflicts = yield* conflictService.detectOverAllocation(
          person.id,
          "2024-06-01",
          "2024-06-30",
        );

        assert.strictEqual(conflicts.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "detectAvailabilityConflicts - detects overlapping availability windows",
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

        const conflictService = yield* ConflictService.pipe(
          Effect.provide(
            ConflictServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Eve",
          email: "eve@example.com",
          capacityHoursPerWeek: 40,
        });

        // Create overlapping windows
        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-06-01",
          endDate: "2024-06-15",
          type: "pto",
          description: "Vacation",
        });

        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-06-10",
          endDate: "2024-06-20",
          type: "training",
          description: "Conference",
        });

        const conflicts = yield* conflictService.detectAvailabilityConflicts(person.id);

        assert.strictEqual(conflicts.length, 1);
        assert.strictEqual(conflicts[0]?.type, "availability_conflict");
        assert.strictEqual(conflicts[0]?.availabilityConflictDetails?.length, 2);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "detectAvailabilityConflicts - returns no conflicts for adjacent windows",
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

        const conflictService = yield* ConflictService.pipe(
          Effect.provide(
            ConflictServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Frank",
          email: "frank@example.com",
          capacityHoursPerWeek: 40,
        });

        // Create adjacent but non-overlapping windows
        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-06-01",
          endDate: "2024-06-15",
          type: "pto",
        });

        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-06-15",
          endDate: "2024-06-30",
          type: "training",
        });

        const conflicts = yield* conflictService.detectAvailabilityConflicts(person.id);

        assert.strictEqual(conflicts.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "detectAvailabilityConflicts - returns empty array when person has no windows",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const conflictService = yield* ConflictService.pipe(
          Effect.provide(
            ConflictServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Grace",
          email: "grace@example.com",
          capacityHoursPerWeek: 40,
        });

        const conflicts = yield* conflictService.detectAvailabilityConflicts(person.id);

        assert.strictEqual(conflicts.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "detectAvailabilityConflicts - detects multiple overlapping windows",
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

        const conflictService = yield* ConflictService.pipe(
          Effect.provide(
            ConflictServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Henry",
          email: "henry@example.com",
          capacityHoursPerWeek: 40,
        });

        // Create three windows with two pairs of overlaps
        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-06-01",
          endDate: "2024-06-15",
          type: "pto",
        });

        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-06-10",
          endDate: "2024-06-20",
          type: "training",
        });

        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-06-18",
          endDate: "2024-06-30",
          type: "other-project",
        });

        const conflicts = yield* conflictService.detectAvailabilityConflicts(person.id);

        // Should detect 2 conflicts: window1-window2 and window2-window3
        assert.strictEqual(conflicts.length, 2);
        assert.isTrue(conflicts.every((c) => c.type === "availability_conflict"));
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "detectAllConflictsForPerson - combines over-allocation and availability conflicts",
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

        const availabilityService = yield* AvailabilityService.pipe(
          Effect.provide(
            AvailabilityServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const conflictService = yield* ConflictService.pipe(
          Effect.provide(
            ConflictServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Ivy",
          email: "ivy@example.com",
          capacityHoursPerWeek: 40,
        });

        // Setup project/milestone/tasks
        yield* sql`
          INSERT INTO projects (id, slug, name, description, pipeline_status, created_at, updated_at)
          VALUES ('test-project', 'test-project', 'Test Project', 'Description', 'active', '2024-01-01', '2024-01-01')
        `;

        yield* sql`
          INSERT INTO milestones (id, project_id, name, description, status, order_index, created_at, updated_at)
          VALUES ('test-milestone', 'test-project', 'Test Milestone', 'Description', 'active', 0, '2024-01-01', '2024-01-01')
        `;

        yield* sql`
          INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
          VALUES ('task-1', 'test-milestone', 'test-project', 'Task 1', 'Description', 'pending', 'medium', 10, 0, '2024-01-01', '2024-01-01')
        `;

        yield* sql`
          INSERT INTO tasks (id, milestone_id, project_id, name, description, status, priority, estimated_hours, order_index, created_at, updated_at)
          VALUES ('task-2', 'test-milestone', 'test-project', 'Task 2', 'Description', 'pending', 'medium', 10, 1, '2024-01-01', '2024-01-01')
        `;

        // Create over-allocation
        yield* assignmentService.assign({
          taskId: "task-1",
          personId: person.id,
          allocationPercentage: 70,
          startDate: "2024-06-01",
          endDate: "2024-06-30",
        });

        yield* assignmentService.assign({
          taskId: "task-2",
          personId: person.id,
          allocationPercentage: 50,
          startDate: "2024-06-10",
          endDate: "2024-06-25",
        });

        // Create overlapping availability windows
        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-07-01",
          endDate: "2024-07-15",
          type: "pto",
        });

        yield* availabilityService.create({
          personId: person.id,
          startDate: "2024-07-10",
          endDate: "2024-07-20",
          type: "training",
        });

        const conflicts = yield* conflictService.detectAllConflictsForPerson(
          person.id,
          "2024-06-01",
          "2024-06-30",
        );

        // Should have both over-allocation and availability conflicts
        assert.isTrue(conflicts.length >= 2);
        assert.isTrue(conflicts.some((c) => c.type === "over_allocation"));
        assert.isTrue(conflicts.some((c) => c.type === "availability_conflict"));
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "detectAllConflictsForPerson - returns empty array when no conflicts exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const personService = yield* PersonService.pipe(
          Effect.provide(
            PersonServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const conflictService = yield* ConflictService.pipe(
          Effect.provide(
            ConflictServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const person = yield* personService.create({
          name: "Jack",
          email: "jack@example.com",
          capacityHoursPerWeek: 40,
        });

        const conflicts = yield* conflictService.detectAllConflictsForPerson(
          person.id,
          "2024-06-01",
          "2024-06-30",
        );

        assert.strictEqual(conflicts.length, 0);
      }) as Effect.Effect<void>,
  );
});
