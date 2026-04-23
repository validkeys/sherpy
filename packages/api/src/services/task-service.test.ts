/**
 * TaskService tests using @effect/vitest with real SQLite (SA-008, SA-009)
 */

import { Reactivity } from "@effect/experimental";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { LibsqlClient } from "@effect/sql-libsql";
import { assert, describe, expect, it } from "@effect/vitest";
import { NotFoundError, Task, ValidationError } from "@sherpy/shared";
import { Effect, Either, Layer } from "effect";
import { runMigrations } from "../db/migration-runner.js";
import { MilestoneService, MilestoneServiceLive } from "./milestone-service.js";
import { ProjectService, ProjectServiceLive } from "./project-service.js";
import {
  type BulkUpdateStatusInput,
  type CreateTaskInput,
  type ListTaskFilters,
  type ReorderTasksInput,
  TaskService,
  TaskServiceLive,
  type UpdateTaskInput,
} from "./task-service.js";

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

describe("TaskService", () => {
  it.scoped(
    "create - creates task with automatic orderIndex",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* TaskService.pipe(
          Effect.provide(
            TaskServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        // Create a project and milestone first
        const project = yield* projectService.create({ name: "Test Project" });
        const milestone = yield* milestoneService.create({
          projectId: project.id,
          name: "Test Milestone",
        });

        const input: typeof CreateTaskInput.Type = {
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 1",
          description: "First task",
          priority: "high",
          estimatedHours: 4,
        };

        const task = yield* service.create(input);

        assert.strictEqual(task.name, "Task 1");
        assert.strictEqual(task.description, "First task");
        assert.strictEqual(task.milestoneId, milestone.id);
        assert.strictEqual(task.projectId, project.id);
        assert.strictEqual(task.status, "pending");
        assert.strictEqual(task.priority, "high");
        assert.strictEqual(task.estimatedHours, 4);
        assert.strictEqual(task.orderIndex, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create - fails when milestone does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* TaskService.pipe(
          Effect.provide(
            TaskServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });

        const input: typeof CreateTaskInput.Type = {
          milestoneId: "non-existent-id",
          projectId: project.id,
          name: "Task 1",
        };

        const result = yield* Effect.either(service.create(input));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
          if (result.left instanceof NotFoundError) {
            assert.strictEqual(result.left.entity, "Milestone");
          }
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create - fails when milestone does not belong to project",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* TaskService.pipe(
          Effect.provide(
            TaskServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        // Create two projects and a milestone in the first project
        const project1 = yield* projectService.create({ name: "Project 1" });
        const project2 = yield* projectService.create({ name: "Project 2" });
        const milestone = yield* milestoneService.create({
          projectId: project1.id,
          name: "Milestone 1",
        });

        // Try to create a task in project2 with milestone from project1
        const input: typeof CreateTaskInput.Type = {
          milestoneId: milestone.id,
          projectId: project2.id,
          name: "Task 1",
        };

        const result = yield* Effect.either(service.create(input));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, ValidationError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create - sets orderIndex sequentially within milestone",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* TaskService.pipe(
          Effect.provide(
            TaskServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });
        const milestone = yield* milestoneService.create({
          projectId: project.id,
          name: "Test Milestone",
        });

        // Create multiple tasks
        const t1 = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 1",
        });
        const t2 = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 2",
        });
        const t3 = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 3",
        });

        assert.strictEqual(t1.orderIndex, 0);
        assert.strictEqual(t2.orderIndex, 1);
        assert.strictEqual(t3.orderIndex, 2);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listByMilestone - returns tasks ordered by orderIndex",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* TaskService.pipe(
          Effect.provide(
            TaskServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });
        const milestone = yield* milestoneService.create({
          projectId: project.id,
          name: "Test Milestone",
        });

        // Create tasks
        yield* service.create({ milestoneId: milestone.id, projectId: project.id, name: "Task 1" });
        yield* service.create({ milestoneId: milestone.id, projectId: project.id, name: "Task 2" });
        yield* service.create({ milestoneId: milestone.id, projectId: project.id, name: "Task 3" });

        const tasks = yield* service.listByMilestone(milestone.id);

        assert.strictEqual(tasks.length, 3);
        assert.strictEqual(tasks[0]!.name, "Task 1");
        assert.strictEqual(tasks[1]!.name, "Task 2");
        assert.strictEqual(tasks[2]!.name, "Task 3");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listByProject - returns tasks with optional status filter",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* TaskService.pipe(
          Effect.provide(
            TaskServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });
        const milestone = yield* milestoneService.create({
          projectId: project.id,
          name: "Test Milestone",
        });

        // Create tasks with different priorities
        const t1 = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 1",
          priority: "high",
        });
        const t2 = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 2",
          priority: "low",
        });
        const t3 = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 3",
          priority: "medium",
        });

        // List all tasks (should be ordered by priority)
        const allTasks = yield* service.listByProject(project.id);
        assert.strictEqual(allTasks.length, 3);
        assert.strictEqual(allTasks[0]!.priority, "high");
        assert.strictEqual(allTasks[1]!.priority, "medium");
        assert.strictEqual(allTasks[2]!.priority, "low");

        // Update one task to in-progress
        yield* sql`UPDATE tasks SET status = 'in-progress' WHERE id = ${t1.id}`;

        // Filter by status
        const filters: typeof ListTaskFilters.Type = { status: "in-progress" };
        const filteredTasks = yield* service.listByProject(project.id, filters);
        assert.strictEqual(filteredTasks.length, 1);
        assert.strictEqual(filteredTasks[0]!.id, t1.id);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "get - returns task by ID",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* TaskService.pipe(
          Effect.provide(
            TaskServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });
        const milestone = yield* milestoneService.create({
          projectId: project.id,
          name: "Test Milestone",
        });
        const created = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Test Task",
        });
        const found = yield* service.get(created.id);

        assert.strictEqual(found.id, created.id);
        assert.strictEqual(found.name, "Test Task");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "get - fails when task does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* TaskService.pipe(
          Effect.provide(
            TaskServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const result = yield* Effect.either(service.get("non-existent-id"));

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
    "update - updates task fields",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* TaskService.pipe(
          Effect.provide(
            TaskServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });
        const milestone = yield* milestoneService.create({
          projectId: project.id,
          name: "Test Milestone",
        });
        const created = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Original Name",
          priority: "low",
        });

        const input: typeof UpdateTaskInput.Type = {
          name: "Updated Name",
          priority: "high",
          estimatedHours: 8,
        };

        const updated = yield* service.update(created.id, input);

        assert.strictEqual(updated.name, "Updated Name");
        assert.strictEqual(updated.priority, "high");
        assert.strictEqual(updated.estimatedHours, 8);
        assert.strictEqual(updated.milestoneId, milestone.id);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "reorder - reorders tasks within milestone atomically",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* TaskService.pipe(
          Effect.provide(
            TaskServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });
        const milestone = yield* milestoneService.create({
          projectId: project.id,
          name: "Test Milestone",
        });

        // Create tasks
        const t1 = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 1",
        });
        const t2 = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 2",
        });
        const t3 = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 3",
        });

        // Reorder: 3, 1, 2
        const input: typeof ReorderTasksInput.Type = {
          taskIds: [t3.id, t1.id, t2.id],
        };

        yield* service.reorder(milestone.id, input);

        // Verify new order
        const tasks = yield* service.listByMilestone(milestone.id);

        assert.strictEqual(tasks.length, 3);
        assert.strictEqual(tasks[0]!.id, t3.id);
        assert.strictEqual(tasks[0]!.orderIndex, 0);
        assert.strictEqual(tasks[1]!.id, t1.id);
        assert.strictEqual(tasks[1]!.orderIndex, 1);
        assert.strictEqual(tasks[2]!.id, t2.id);
        assert.strictEqual(tasks[2]!.orderIndex, 2);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "reorder - fails when task does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* TaskService.pipe(
          Effect.provide(
            TaskServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });
        const milestone = yield* milestoneService.create({
          projectId: project.id,
          name: "Test Milestone",
        });
        const t1 = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 1",
        });

        const input: typeof ReorderTasksInput.Type = {
          taskIds: [t1.id, "non-existent-id"],
        };

        const result = yield* Effect.either(service.reorder(milestone.id, input));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "reorder - fails when not all tasks are included",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* TaskService.pipe(
          Effect.provide(
            TaskServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });
        const milestone = yield* milestoneService.create({
          projectId: project.id,
          name: "Test Milestone",
        });
        const t1 = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 1",
        });
        const t2 = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 2",
        });

        // Only include one task when there are two
        const input: typeof ReorderTasksInput.Type = {
          taskIds: [t1.id],
        };

        const result = yield* Effect.either(service.reorder(milestone.id, input));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, ValidationError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "bulkUpdateStatus - updates multiple tasks atomically",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* TaskService.pipe(
          Effect.provide(
            TaskServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });
        const milestone = yield* milestoneService.create({
          projectId: project.id,
          name: "Test Milestone",
        });

        // Create tasks
        const t1 = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 1",
        });
        const t2 = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 2",
        });
        const t3 = yield* service.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 3",
        });

        // Bulk update status
        const input: typeof BulkUpdateStatusInput.Type = {
          taskIds: [t1.id, t2.id],
          status: "in-progress",
        };

        const updatedTasks = yield* service.bulkUpdateStatus(input);

        assert.strictEqual(updatedTasks.length, 2);
        assert.strictEqual(updatedTasks[0]!.status, "in-progress");
        assert.strictEqual(updatedTasks[1]!.status, "in-progress");

        // Verify t3 was not updated
        const t3Updated = yield* service.get(t3.id);
        assert.strictEqual(t3Updated.status, "pending");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "bulkUpdateStatus - fails when task does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* TaskService.pipe(
          Effect.provide(
            TaskServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const input: typeof BulkUpdateStatusInput.Type = {
          taskIds: ["non-existent-id"],
          status: "complete",
        };

        const result = yield* Effect.either(service.bulkUpdateStatus(input));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );
});
