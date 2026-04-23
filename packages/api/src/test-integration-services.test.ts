/**
 * Integration tests for all services working together against real SQLite
 * Tests cross-service interactions and full workflows (SA-008, SA-009)
 */

import { Reactivity } from "@effect/experimental";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { LibsqlClient } from "@effect/sql-libsql";
import { assert, describe, expect, it } from "@effect/vitest";
import { ConflictError, NotFoundError } from "@sherpy/shared";
import { Effect, Layer } from "effect";
import { runMigrations } from "./db/migration-runner.js";
import { ChatSessionService, ChatSessionServiceLive } from "./services/chat-session-service.js";
import { MilestoneService, MilestoneServiceLive } from "./services/milestone-service.js";
import { ProjectService, ProjectServiceLive } from "./services/project-service.js";
import { TagService, TagServiceLive } from "./services/tag-service.js";
import { TaskService, TaskServiceLive } from "./services/task-service.js";

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
 * Full service layer stack with all dependencies
 */
const makeServiceLayer = (sql: SqlClient.SqlClient) =>
  Layer.mergeAll(
    ProjectServiceLive,
    MilestoneServiceLive,
    TaskServiceLive,
    TagServiceLive,
    ChatSessionServiceLive,
  ).pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)));

describe("Service Integration Tests", () => {
  it.scoped(
    "create project → create milestone → create tasks → verify ordering",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)));
        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(makeServiceLayer(sql)),
        );
        const taskService = yield* TaskService.pipe(Effect.provide(makeServiceLayer(sql)));

        // Create project
        const project = yield* projectService.create({
          name: "Full Project",
          description: "Testing full hierarchy",
        });

        // Create milestones
        const m1 = yield* milestoneService.create({
          projectId: project.id,
          name: "Milestone 1",
          estimatedDays: 5,
        });

        const m2 = yield* milestoneService.create({
          projectId: project.id,
          name: "Milestone 2",
          estimatedDays: 10,
        });

        // Verify milestone ordering
        const milestones = yield* milestoneService.listByProject(project.id);
        assert.strictEqual(milestones.length, 2);
        assert.strictEqual(milestones[0]!.orderIndex, 0);
        assert.strictEqual(milestones[1]!.orderIndex, 1);
        assert.strictEqual(milestones[0]!.name, "Milestone 1");

        // Create tasks for first milestone
        const t1 = yield* taskService.create({
          milestoneId: m1.id,
          projectId: project.id,
          name: "Task 1",
          priority: "high",
        });

        const t2 = yield* taskService.create({
          milestoneId: m1.id,
          projectId: project.id,
          name: "Task 2",
          priority: "medium",
        });

        // Verify task ordering
        const tasks = yield* taskService.listByMilestone(m1.id);
        assert.strictEqual(tasks.length, 2);
        assert.strictEqual(tasks[0]!.orderIndex, 0);
        assert.strictEqual(tasks[1]!.orderIndex, 1);
        assert.strictEqual(tasks[0]!.name, "Task 1");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create tags → assign to project → get project tags → verify",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)));
        const tagService = yield* TagService.pipe(Effect.provide(makeServiceLayer(sql)));

        // Create tags
        const tag1 = yield* tagService.create({
          name: "frontend",
          color: "#ff0000",
        });

        const tag2 = yield* tagService.create({
          name: "backend",
          color: "#00ff00",
        });

        // Create project with tags
        const project = yield* projectService.create({
          name: "Tagged Project",
          tags: ["frontend", "backend"],
        });

        // Verify tags assigned
        assert.deepStrictEqual(project.tags, ["frontend", "backend"]);

        // Get project again and verify tags persist
        const retrieved = yield* projectService.get(project.id);
        assert.deepStrictEqual(retrieved.tags, ["frontend", "backend"]);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create milestone → reorder → verify order persisted",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)));
        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(makeServiceLayer(sql)),
        );

        const project = yield* projectService.create({ name: "Reorder Test" });

        // Create three milestones
        const m1 = yield* milestoneService.create({
          projectId: project.id,
          name: "First",
        });

        const m2 = yield* milestoneService.create({
          projectId: project.id,
          name: "Second",
        });

        const m3 = yield* milestoneService.create({
          projectId: project.id,
          name: "Third",
        });

        // Reorder: put third first, then second, then first
        yield* milestoneService.reorder(project.id, {
          milestoneIds: [m3.id, m2.id, m1.id],
        });

        // Verify new order
        const milestones = yield* milestoneService.listByProject(project.id);
        assert.strictEqual(milestones.length, 3);
        assert.strictEqual(milestones[0]!.name, "Third");
        assert.strictEqual(milestones[1]!.name, "Second");
        assert.strictEqual(milestones[2]!.name, "First");
        assert.strictEqual(milestones[0]!.orderIndex, 0);
        assert.strictEqual(milestones[1]!.orderIndex, 1);
        assert.strictEqual(milestones[2]!.orderIndex, 2);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create tasks → bulk status update → verify all updated",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)));
        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(makeServiceLayer(sql)),
        );
        const taskService = yield* TaskService.pipe(Effect.provide(makeServiceLayer(sql)));

        const project = yield* projectService.create({ name: "Bulk Update Test" });
        const milestone = yield* milestoneService.create({
          projectId: project.id,
          name: "M1",
        });

        // Create multiple tasks
        const t1 = yield* taskService.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 1",
        });

        const t2 = yield* taskService.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 2",
        });

        const t3 = yield* taskService.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 3",
        });

        // Bulk update status
        const updated = yield* taskService.bulkUpdateStatus({
          taskIds: [t1.id, t2.id, t3.id],
          status: "in-progress",
        });

        // Verify all updated
        assert.strictEqual(updated.length, 3);
        for (const task of updated) {
          assert.strictEqual(task.status, "in-progress");
        }

        // Verify persisted in DB
        const tasks = yield* taskService.listByMilestone(milestone.id);
        for (const task of tasks) {
          assert.strictEqual(task.status, "in-progress");
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create project → create chat session → add messages → retrieve history",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)));
        const chatService = yield* ChatSessionService.pipe(Effect.provide(makeServiceLayer(sql)));

        const project = yield* projectService.create({ name: "Chat Test" });

        // Create chat session
        const session = yield* chatService.create({
          projectId: project.id,
          contextType: "general",
        });

        assert.strictEqual(session.contextType, "general");
        assert.strictEqual(session.messages.length, 0);

        // Add user message
        const session1 = yield* chatService.addMessage({
          sessionId: session.id,
          role: "user",
          content: "Hello, how do I create a milestone?",
        });

        assert.strictEqual(session1.messages.length, 1);
        assert.strictEqual(session1.messages[0]!.role, "user");
        assert.strictEqual(session1.messages[0]!.content, "Hello, how do I create a milestone?");

        // Add assistant message
        const session2 = yield* chatService.addMessage({
          sessionId: session.id,
          role: "assistant",
          content: "You can create a milestone using the milestone API endpoint.",
        });

        assert.strictEqual(session2.messages.length, 2);
        assert.strictEqual(session2.messages[1]!.role, "assistant");

        // Retrieve history
        const history = yield* chatService.getHistory(session.id);
        assert.strictEqual(history.messages.length, 2);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create tag → delete tag → verify removed",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const tagService = yield* TagService.pipe(Effect.provide(makeServiceLayer(sql)));

        // Create tag
        const tag = yield* tagService.create({
          name: "temp-tag",
          color: "#000000",
        });

        // Verify exists
        const retrieved = yield* tagService.get(tag.id);
        assert.strictEqual(retrieved.name, "temp-tag");

        // Delete tag
        yield* tagService.remove(tag.id);

        // Verify not found
        const result = yield* Effect.either(tagService.get(tag.id));
        assert.strictEqual(result._tag, "Left");
        if (result._tag === "Left") {
          assert.strictEqual(result.left._tag, "NotFoundError");
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "error: create milestone with non-existent project → NotFoundError",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(makeServiceLayer(sql)),
        );

        const result = yield* Effect.either(
          milestoneService.create({
            projectId: "non-existent-id",
            name: "Test Milestone",
          }),
        );

        assert.strictEqual(result._tag, "Left");
        if (result._tag === "Left") {
          assert.strictEqual(result.left._tag, "NotFoundError");
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "error: create task with non-existent milestone → NotFoundError",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)));
        const taskService = yield* TaskService.pipe(Effect.provide(makeServiceLayer(sql)));

        const project = yield* projectService.create({ name: "Test" });

        const result = yield* Effect.either(
          taskService.create({
            milestoneId: "non-existent-milestone",
            projectId: project.id,
            name: "Test Task",
          }),
        );

        assert.strictEqual(result._tag, "Left");
        if (result._tag === "Left") {
          assert.strictEqual(result.left._tag, "NotFoundError");
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "error: create duplicate tag name → ConflictError",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const tagService = yield* TagService.pipe(Effect.provide(makeServiceLayer(sql)));

        // Create first tag
        yield* tagService.create({
          name: "duplicate-tag",
          color: "#ff0000",
        });

        // Try to create duplicate
        const result = yield* Effect.either(
          tagService.create({
            name: "duplicate-tag",
            color: "#00ff00",
          }),
        );

        assert.strictEqual(result._tag, "Left");
        if (result._tag === "Left") {
          assert.strictEqual(result.left._tag, "ConflictError");
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "error: update non-existent project → NotFoundError",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)));

        const result = yield* Effect.either(
          projectService.update("non-existent-id", {
            name: "Updated Name",
          }),
        );

        assert.strictEqual(result._tag, "Left");
        if (result._tag === "Left") {
          assert.strictEqual(result.left._tag, "NotFoundError");
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "list chat sessions for project ordered by most recent",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)));
        const chatService = yield* ChatSessionService.pipe(Effect.provide(makeServiceLayer(sql)));

        const project = yield* projectService.create({ name: "Multi-Chat Test" });

        // Create multiple sessions
        const session1 = yield* chatService.create({
          projectId: project.id,
          contextType: "general",
        });

        const session2 = yield* chatService.create({
          projectId: project.id,
          contextType: "scheduling",
        });

        const session3 = yield* chatService.create({
          projectId: project.id,
          contextType: "planning",
        });

        // List sessions
        const sessions = yield* chatService.listByProject(project.id);
        assert.strictEqual(sessions.length, 3);

        // Should be ordered by most recent first
        assert.strictEqual(sessions[0]!.id, session3.id);
        assert.strictEqual(sessions[1]!.id, session2.id);
        assert.strictEqual(sessions[2]!.id, session1.id);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "task reordering within milestone",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)));
        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(makeServiceLayer(sql)),
        );
        const taskService = yield* TaskService.pipe(Effect.provide(makeServiceLayer(sql)));

        const project = yield* projectService.create({ name: "Task Reorder Test" });
        const milestone = yield* milestoneService.create({
          projectId: project.id,
          name: "M1",
        });

        // Create tasks
        const t1 = yield* taskService.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Alpha",
        });

        const t2 = yield* taskService.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Beta",
        });

        const t3 = yield* taskService.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Gamma",
        });

        // Reorder: reverse order
        yield* taskService.reorder(milestone.id, {
          taskIds: [t3.id, t2.id, t1.id],
        });

        // Verify new order
        const tasks = yield* taskService.listByMilestone(milestone.id);
        assert.strictEqual(tasks[0]!.name, "Gamma");
        assert.strictEqual(tasks[1]!.name, "Beta");
        assert.strictEqual(tasks[2]!.name, "Alpha");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "list tasks by project with status filter",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)));
        const milestoneService = yield* MilestoneService.pipe(
          Effect.provide(makeServiceLayer(sql)),
        );
        const taskService = yield* TaskService.pipe(Effect.provide(makeServiceLayer(sql)));

        const project = yield* projectService.create({ name: "Filter Test" });
        const milestone = yield* milestoneService.create({
          projectId: project.id,
          name: "M1",
        });

        // Create tasks with different statuses
        const t1 = yield* taskService.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 1",
        });

        const t2 = yield* taskService.create({
          milestoneId: milestone.id,
          projectId: project.id,
          name: "Task 2",
        });

        // Update one task to in-progress
        yield* taskService.bulkUpdateStatus({
          taskIds: [t1.id],
          status: "in-progress",
        });

        // List all tasks
        const allTasks = yield* taskService.listByProject(project.id, {});
        assert.strictEqual(allTasks.length, 2);

        // List only in-progress tasks
        const inProgressTasks = yield* taskService.listByProject(project.id, {
          status: "in-progress",
        });
        assert.strictEqual(inProgressTasks.length, 1);
        assert.strictEqual(inProgressTasks[0]!.name, "Task 1");

        // List only pending tasks
        const pendingTasks = yield* taskService.listByProject(project.id, {
          status: "pending",
        });
        assert.strictEqual(pendingTasks.length, 1);
        assert.strictEqual(pendingTasks[0]!.name, "Task 2");
      }) as Effect.Effect<void>,
  );
});
