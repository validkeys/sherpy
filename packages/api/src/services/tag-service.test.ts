/**
 * TagService tests using @effect/vitest with real SQLite (SA-008, SA-009)
 */

import { Reactivity } from "@effect/experimental";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { LibsqlClient } from "@effect/sql-libsql";
import { assert, describe, expect, it } from "@effect/vitest";
import { ConflictError, NotFoundError, Tag, ValidationError } from "@sherpy/shared";
import { Effect, Either, Layer } from "effect";
import { runMigrations } from "../db/migration-runner.js";
import { ProjectService, ProjectServiceLive } from "./project-service.js";
import {
  type CreateTagInput,
  TagService,
  TagServiceLive,
  type UpdateTagInput,
} from "./tag-service.js";

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

describe("TagService", () => {
  it.scoped(
    "create - creates tag with name and color",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const input: typeof CreateTagInput.Type = {
          name: "Frontend",
          color: "#ff6b6b",
        };

        const tag = yield* service.create(input);

        assert.strictEqual(tag.name, "Frontend");
        assert.strictEqual(tag.color, "#ff6b6b");
        assert.match(tag.id, /^[0-9a-f-]{36}$/);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create - creates tag without color",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const input: typeof CreateTagInput.Type = {
          name: "Backend",
        };

        const tag = yield* service.create(input);

        assert.strictEqual(tag.name, "Backend");
        assert.isNull(tag.color);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "create - fails when tag name already exists",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        // Create first tag
        yield* service.create({ name: "Frontend", color: "#ff6b6b" });

        // Try to create duplicate
        const result = yield* Effect.either(service.create({ name: "Frontend", color: "#00ff00" }));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, ConflictError);
          if (result.left instanceof ConflictError) {
            assert.strictEqual(result.left.resource, "Tag");
            assert.strictEqual(result.left.conflictType, "duplicate");
          }
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "list - returns all tags ordered by name",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        // Create tags in non-alphabetical order
        yield* service.create({ name: "Zulu" });
        yield* service.create({ name: "Alpha" });
        yield* service.create({ name: "Mike" });

        const tags = yield* service.list();

        assert.strictEqual(tags.length, 3);
        assert.strictEqual(tags[0]!.name, "Alpha");
        assert.strictEqual(tags[1]!.name, "Mike");
        assert.strictEqual(tags[2]!.name, "Zulu");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "get - retrieves tag by id",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const created = yield* service.create({ name: "DevOps", color: "#4ecdc4" });
        const retrieved = yield* service.get(created.id);

        assert.strictEqual(retrieved.id, created.id);
        assert.strictEqual(retrieved.name, "DevOps");
        assert.strictEqual(retrieved.color, "#4ecdc4");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "get - fails when tag does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const result = yield* Effect.either(service.get("non-existent-id"));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
          if (result.left instanceof NotFoundError) {
            assert.strictEqual(result.left.entity, "Tag");
          }
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "update - updates tag name",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const tag = yield* service.create({ name: "Backend", color: "#95e1d3" });
        const updated = yield* service.update(tag.id, { name: "Backend Services" });

        assert.strictEqual(updated.name, "Backend Services");
        assert.strictEqual(updated.color, "#95e1d3");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "update - updates tag color",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const tag = yield* service.create({ name: "Frontend", color: "#ff6b6b" });
        const updated = yield* service.update(tag.id, { color: "#00ff00" });

        assert.strictEqual(updated.name, "Frontend");
        assert.strictEqual(updated.color, "#00ff00");
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "update - fails when new name conflicts with existing tag",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        yield* service.create({ name: "Frontend" });
        const tag2 = yield* service.create({ name: "Backend" });

        const result = yield* Effect.either(service.update(tag2.id, { name: "Frontend" }));

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, ConflictError);
          if (result.left instanceof ConflictError) {
            assert.strictEqual(result.left.resource, "Tag");
          }
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "remove - deletes tag",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const service = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const tag = yield* service.create({ name: "Temporary" });
        yield* service.remove(tag.id);

        const result = yield* Effect.either(service.get(tag.id));
        assert.isTrue(Either.isLeft(result));
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "remove - removes tag from all projects",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const tagService = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        // Create tag and projects
        const tag = yield* tagService.create({ name: "Testing" });
        const project1 = yield* projectService.create({ name: "Project 1" });
        const project2 = yield* projectService.create({ name: "Project 2" });

        // Assign tag to both projects
        yield* tagService.assignToProject(tag.id, project1.id);
        yield* tagService.assignToProject(tag.id, project2.id);

        // Remove the tag
        yield* tagService.remove(tag.id);

        // Verify tag is removed from projects
        const updated1 = yield* projectService.get(project1.id);
        const updated2 = yield* projectService.get(project2.id);

        const tags1 = typeof updated1.tags === "string" ? JSON.parse(updated1.tags) : updated1.tags;
        const tags2 = typeof updated2.tags === "string" ? JSON.parse(updated2.tags) : updated2.tags;

        assert.strictEqual(tags1.length, 0);
        assert.strictEqual(tags2.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "assignToProject - adds tag to project",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const tagService = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const tag = yield* tagService.create({ name: "Frontend" });
        const project = yield* projectService.create({ name: "Test Project" });

        const updated = yield* tagService.assignToProject(tag.id, project.id);

        const tagIds = typeof updated.tags === "string" ? JSON.parse(updated.tags) : updated.tags;

        assert.isTrue(Array.isArray(tagIds));
        assert.strictEqual(tagIds.length, 1);
        assert.strictEqual(tagIds[0], tag.id);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "assignToProject - is idempotent",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const tagService = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const tag = yield* tagService.create({ name: "Frontend" });
        const project = yield* projectService.create({ name: "Test Project" });

        // Assign twice
        yield* tagService.assignToProject(tag.id, project.id);
        const updated = yield* tagService.assignToProject(tag.id, project.id);

        const tagIds = typeof updated.tags === "string" ? JSON.parse(updated.tags) : updated.tags;

        assert.strictEqual(tagIds.length, 1);
        assert.strictEqual(tagIds[0], tag.id);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "assignToProject - fails when tag does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const tagService = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });

        const result = yield* Effect.either(
          tagService.assignToProject("non-existent-tag", project.id),
        );

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "assignToProject - fails when project does not exist",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const tagService = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const tag = yield* tagService.create({ name: "Frontend" });

        const result = yield* Effect.either(
          tagService.assignToProject(tag.id, "non-existent-project"),
        );

        assert.isTrue(Either.isLeft(result));
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "removeFromProject - removes tag from project",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const tagService = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const tag = yield* tagService.create({ name: "Frontend" });
        const project = yield* projectService.create({ name: "Test Project" });

        yield* tagService.assignToProject(tag.id, project.id);
        const updated = yield* tagService.removeFromProject(tag.id, project.id);

        const tagIds = typeof updated.tags === "string" ? JSON.parse(updated.tags) : updated.tags;

        assert.strictEqual(tagIds.length, 0);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "getProjectTags - returns all tags for a project",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const tagService = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const tag1 = yield* tagService.create({ name: "Frontend" });
        const tag2 = yield* tagService.create({ name: "Backend" });
        const project = yield* projectService.create({ name: "Test Project" });

        yield* tagService.assignToProject(tag1.id, project.id);
        yield* tagService.assignToProject(tag2.id, project.id);

        const tags = yield* tagService.getProjectTags(project.id);

        assert.strictEqual(tags.length, 2);
        const tagNames = tags.map((t) => t.name).sort();
        assert.deepStrictEqual(tagNames, ["Backend", "Frontend"]);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "getProjectTags - returns empty array when project has no tags",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const tagService = yield* TagService.pipe(
          Effect.provide(
            TagServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const project = yield* projectService.create({ name: "Test Project" });
        const tags = yield* tagService.getProjectTags(project.id);

        assert.strictEqual(tags.length, 0);
      }) as Effect.Effect<void>,
  );
});
