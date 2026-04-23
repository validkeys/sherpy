/**
 * MilestoneService tests using @effect/vitest with real SQLite (SA-008, SA-009)
 */

import { Reactivity } from "@effect/experimental";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { LibsqlClient } from "@effect/sql-libsql";
import { assert, describe, expect, it } from "@effect/vitest";
import { Milestone, NotFoundError, ValidationError } from "@sherpy/shared";
import { Effect, Either, Layer } from "effect";
import { runMigrations } from "../db/migration-runner.js";
import {
  type CreateMilestoneInput,
  MilestoneService,
  MilestoneServiceLive,
  type ReorderMilestonesInput,
  type UpdateMilestoneInput,
} from "./milestone-service.js";
import { ProjectService, ProjectServiceLive } from "./project-service.js";

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

describe("MilestoneService", () => {
  it.scoped(
    "create - creates milestone with automatic orderIndex",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        // Create a project first
        const project = yield* projectService.create({ name: "Test Project" });

        const input: typeof CreateMilestoneInput.Type = {
          projectId: project.id,
          name: "Milestone 1",
          description: "First milestone",
          estimatedDays: 5,
          acceptanceCriteria: "All tests pass",
        };

        const milestone = yield* service.create(input);

        assert.strictEqual(milestone.name, "Milestone 1");
        assert.strictEqual(milestone.description, "First milestone");
        assert.strictEqual(milestone.projectId, project.id);
        assert.strictEqual(milestone.status, "pending");
        assert.strictEqual(milestone.orderIndex, 0);
        assert.strictEqual(milestone.estimatedDays, 5);
        assert.strictEqual(milestone.acceptanceCriteria, "All tests pass");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create - fails when project does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const input: typeof CreateMilestoneInput.Type = {
          projectId: "non-existent-id",
          name: "Milestone 1",
        };

        const result = yield* Effect.either(service.create(input));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
          if (result.left instanceof NotFoundError) {
            assert.strictEqual(result.left.entity, "Project");
          }
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create - sets orderIndex sequentially",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });

        // Create multiple milestones
        const m1 = yield* service.create({ projectId: project.id, name: "Milestone 1" });
        const m2 = yield* service.create({ projectId: project.id, name: "Milestone 2" });
        const m3 = yield* service.create({ projectId: project.id, name: "Milestone 3" });

        assert.strictEqual(m1.orderIndex, 0);
        assert.strictEqual(m2.orderIndex, 1);
        assert.strictEqual(m3.orderIndex, 2);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "listByProject - returns milestones ordered by orderIndex",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });

        // Create milestones
        yield* service.create({ projectId: project.id, name: "Milestone 1" });
        yield* service.create({ projectId: project.id, name: "Milestone 2" });
        yield* service.create({ projectId: project.id, name: "Milestone 3" });

        const milestones = yield* service.listByProject(project.id);

        assert.strictEqual(milestones.length, 3);
        assert.strictEqual(milestones[0]!.name, "Milestone 1");
        assert.strictEqual(milestones[1]!.name, "Milestone 2");
        assert.strictEqual(milestones[2]!.name, "Milestone 3");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "get - returns milestone by ID",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });
        const created = yield* service.create({ projectId: project.id, name: "Test Milestone" });
        const found = yield* service.get(created.id);

        assert.strictEqual(found.id, created.id);
        assert.strictEqual(found.name, "Test Milestone");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "get - fails when milestone does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const result = yield* Effect.either(service.get("non-existent-id"));

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
    "update - updates milestone name",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });
        const created = yield* service.create({ projectId: project.id, name: "Original Name" });

        const input: typeof UpdateMilestoneInput.Type = {
          name: "Updated Name",
        };

        const updated = yield* service.update(created.id, input);

        assert.strictEqual(updated.name, "Updated Name");
        assert.strictEqual(updated.projectId, project.id);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "update - updates milestone status",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });
        const created = yield* service.create({ projectId: project.id, name: "Test Milestone" });

        const input: typeof UpdateMilestoneInput.Type = {
          status: "in-progress",
        };

        const updated = yield* service.update(created.id, input);

        assert.strictEqual(updated.status, "in-progress");
        assert.strictEqual(updated.name, created.name);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "reorder - reorders milestones atomically",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });

        // Create milestones
        const m1 = yield* service.create({ projectId: project.id, name: "Milestone 1" });
        const m2 = yield* service.create({ projectId: project.id, name: "Milestone 2" });
        const m3 = yield* service.create({ projectId: project.id, name: "Milestone 3" });

        // Reorder: 3, 1, 2
        const input: typeof ReorderMilestonesInput.Type = {
          milestoneIds: [m3.id, m1.id, m2.id],
        };

        yield* service.reorder(project.id, input);

        // Verify new order
        const milestones = yield* service.listByProject(project.id);

        assert.strictEqual(milestones.length, 3);
        assert.strictEqual(milestones[0]!.id, m3.id);
        assert.strictEqual(milestones[0]!.orderIndex, 0);
        assert.strictEqual(milestones[1]!.id, m1.id);
        assert.strictEqual(milestones[1]!.orderIndex, 1);
        assert.strictEqual(milestones[2]!.id, m2.id);
        assert.strictEqual(milestones[2]!.orderIndex, 2);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "reorder - fails when milestone does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });
        const m1 = yield* service.create({ projectId: project.id, name: "Milestone 1" });

        const input: typeof ReorderMilestonesInput.Type = {
          milestoneIds: [m1.id, "non-existent-id"],
        };

        const result = yield* Effect.either(service.reorder(project.id, input));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "reorder - fails when not all milestones are included",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const service = yield* MilestoneService.pipe(
          Effect.provide(
            MilestoneServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });
        const m1 = yield* service.create({ projectId: project.id, name: "Milestone 1" });
        const m2 = yield* service.create({ projectId: project.id, name: "Milestone 2" });

        // Only include one milestone when there are two
        const input: typeof ReorderMilestonesInput.Type = {
          milestoneIds: [m1.id],
        };

        const result = yield* Effect.either(service.reorder(project.id, input));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, ValidationError);
        }
      }) as Effect.Effect<void>,
  );
});
