/**
 * ChatService tests using @effect/vitest with real SQLite
 * Tests individual message persistence and cursor-based pagination
 */

import { Reactivity } from "@effect/experimental";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { LibsqlClient } from "@effect/sql-libsql";
import { assert, describe, expect, it } from "@effect/vitest";
import { NotFoundError, ValidationError } from "@sherpy/shared";
import { Effect, Layer } from "effect";
import { runMigrations } from "../db/migration-runner.js";
import { ChatService, ChatServiceLive } from "./chat-service.js";
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

describe("ChatService", () => {
  it.scoped(
    "sendMessage - saves user message to database",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const chatService = yield* ChatService.pipe(
          Effect.provide(
            Layer.mergeAll(ChatServiceLive, ProjectServiceLive).pipe(
              Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
            ),
          ),
        );

        // Create a test project
        const project = yield* projectService.create({
          name: "Test Project",
          description: "Test",
        });

        // Send a message
        const message = yield* chatService.sendMessage({
          projectId: project.id,
          role: "user",
          content: "Hello, AI!",
        });

        assert.strictEqual(message.projectId, project.id);
        assert.strictEqual(message.role, "user");
        assert.strictEqual(message.content, "Hello, AI!");
        assert.ok(message.id);
        assert.ok(message.createdAt);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "sendMessage - fails for non-existent project",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const chatService = yield* ChatService.pipe(
          Effect.provide(
            Layer.mergeAll(ChatServiceLive, ProjectServiceLive).pipe(
              Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
            ),
          ),
        );

        // Attempt to send message to non-existent project
        const result = yield* Effect.either(
          chatService.sendMessage({
            projectId: "non-existent-id",
            role: "user",
            content: "Hello",
          }),
        );

        assert.strictEqual(result._tag, "Left");
        if (result._tag === "Left") {
          assert.ok(result.left instanceof NotFoundError);
        }
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "getMessages - retrieves messages in chronological order",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const chatService = yield* ChatService.pipe(
          Effect.provide(
            Layer.mergeAll(ChatServiceLive, ProjectServiceLive).pipe(
              Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
            ),
          ),
        );

        const project = yield* projectService.create({
          name: "Test Project",
          description: "Test",
        });

        // Send multiple messages
        const msg1 = yield* chatService.sendMessage({
          projectId: project.id,
          role: "user",
          content: "First message",
        });

        const msg2 = yield* chatService.sendMessage({
          projectId: project.id,
          role: "assistant",
          content: "Response",
        });

        const msg3 = yield* chatService.sendMessage({
          projectId: project.id,
          role: "user",
          content: "Second message",
        });

        // Retrieve messages
        const result = yield* chatService.getMessages({
          projectId: project.id,
        });

        assert.strictEqual(result.messages.length, 3);
        assert.strictEqual(result.messages[0]!.content, "First message");
        assert.strictEqual(result.messages[1]!.content, "Response");
        assert.strictEqual(result.messages[2]!.content, "Second message");
        assert.strictEqual(result.hasMore, false);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "getMessages - supports cursor-based pagination",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const chatService = yield* ChatService.pipe(
          Effect.provide(
            Layer.mergeAll(ChatServiceLive, ProjectServiceLive).pipe(
              Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
            ),
          ),
        );

        const project = yield* projectService.create({
          name: "Test Project",
          description: "Test",
        });

        // Send 5 messages
        for (let i = 0; i < 5; i++) {
          yield* chatService.sendMessage({
            projectId: project.id,
            role: "user",
            content: `Message ${i + 1}`,
          });
        }

        // Get first 2 messages
        const page1 = yield* chatService.getMessages({
          projectId: project.id,
          limit: 2,
        });

        assert.strictEqual(page1.messages.length, 2);
        assert.strictEqual(page1.messages[0]!.content, "Message 1");
        assert.strictEqual(page1.messages[1]!.content, "Message 2");
        assert.strictEqual(page1.hasMore, true);
        assert.ok(page1.nextCursor);

        // Get next 2 messages
        const page2 = yield* chatService.getMessages({
          projectId: project.id,
          limit: 2,
          cursor: page1.nextCursor,
        });

        assert.strictEqual(page2.messages.length, 2);
        assert.strictEqual(page2.messages[0]!.content, "Message 3");
        assert.strictEqual(page2.messages[1]!.content, "Message 4");
        assert.strictEqual(page2.hasMore, true);

        // Get final message
        const page3 = yield* chatService.getMessages({
          projectId: project.id,
          limit: 2,
          cursor: page2.nextCursor,
        });

        assert.strictEqual(page3.messages.length, 1);
        assert.strictEqual(page3.messages[0]!.content, "Message 5");
        assert.strictEqual(page3.hasMore, false);
      }) as Effect.Effect<void>,
  );

  it.scoped(
    "getMessages - returns empty array for project with no messages",
    () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb;
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

        const projectService = yield* ProjectService.pipe(
          Effect.provide(
            ProjectServiceLive.pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql))),
          ),
        );

        const chatService = yield* ChatService.pipe(
          Effect.provide(
            Layer.mergeAll(ChatServiceLive, ProjectServiceLive).pipe(
              Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
            ),
          ),
        );

        const project = yield* projectService.create({
          name: "Empty Project",
          description: "Test",
        });

        const result = yield* chatService.getMessages({
          projectId: project.id,
        });

        assert.strictEqual(result.messages.length, 0);
        assert.strictEqual(result.hasMore, false);
      }) as Effect.Effect<void>,
  );
});
