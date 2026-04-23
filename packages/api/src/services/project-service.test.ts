/**
 * ProjectService tests using @effect/vitest with real SQLite (SA-008, SA-009)
 */

import { Reactivity } from "@effect/experimental";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { LibsqlClient } from "@effect/sql-libsql";
import { assert, describe, expect, it } from "@effect/vitest";
import { ConflictError, NotFoundError, Project } from "@sherpy/shared";
import { Effect, Layer } from "effect";
import { runMigrations } from "../db/migration-runner.js";
import {
  type CreateProjectInput,
  ProjectService,
  ProjectServiceLive,
  type UpdateProjectInput,
} from "./project-service.js";

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

describe("ProjectService", () => {
  it.scoped(
    "create - creates project with generated slug",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const input: typeof CreateProjectInput.Type = {
          name: "My Test Project",
          description: "A test project",
          priority: "high",
          tags: ["test", "demo"],
        };

        const project = yield* service.create(input);

        assert.strictEqual(project.name, "My Test Project");
        assert.strictEqual(project.slug, "my-test-project");
        assert.strictEqual(project.description, "A test project");
        assert.strictEqual(project.priority, "high");
        assert.strictEqual(project.pipelineStatus, "intake");
        assert.deepStrictEqual(project.tags, ["test", "demo"]);
        assert.deepStrictEqual(project.assignedPeople, []);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create - creates project with provided slug",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const input: typeof CreateProjectInput.Type = {
          name: "Custom Slug Project",
          slug: "custom-slug",
        };

        const project = yield* service.create(input);

        assert.strictEqual(project.slug, "custom-slug");
        assert.strictEqual(project.name, "Custom Slug Project");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "list - returns all projects",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        // Create projects
        yield* service.create({ name: "Project 1" });
        yield* service.create({ name: "Project 2" });

        const projects = yield* service.list();

        assert.strictEqual(projects.length, 2);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "get - returns project by ID",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const created = yield* service.create({ name: "Test Project" });
        const found = yield* service.get(created.id);

        assert.strictEqual(found.id, created.id);
        assert.strictEqual(found.name, "Test Project");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "update - updates project name",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const created = yield* service.create({ name: "Original Name" });

        const input: typeof UpdateProjectInput.Type = {
          name: "Updated Name",
        };

        const updated = yield* service.update(created.id, input);

        assert.strictEqual(updated.name, "Updated Name");
        assert.strictEqual(updated.slug, created.slug); // Slug unchanged
      }) as Effect.Effect<void>,
  );
});
