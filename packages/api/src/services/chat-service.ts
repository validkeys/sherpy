/**
 * ChatService - Domain service for individual chat message persistence
 * Uses Effect.Service with Layer pattern (SA-001)
 * Handles message CRUD and cursor-based pagination
 */

import { randomUUID } from "node:crypto";
import { Model, SqlClient } from "@effect/sql";
import { ChatMessageEntity, NotFoundError, ValidationError } from "@sherpy/shared";
import { Effect, Layer, Schema } from "effect";
import { ProjectService } from "./project-service.js";

/**
 * Input for sending a message
 */
export class SendMessageInput extends Schema.Class<SendMessageInput>("SendMessageInput")({
  projectId: Schema.String,
  role: Schema.Literal("user", "assistant"),
  content: Schema.String,
}) {}

/**
 * Input for retrieving messages
 */
export class GetMessagesInput extends Schema.Class<GetMessagesInput>("GetMessagesInput")({
  projectId: Schema.String,
  limit: Schema.optional(Schema.Number),
  cursor: Schema.optional(Schema.String),
}) {}

/**
 * ChatService - Effect.Service for chat message operations
 */
export class ChatService extends Effect.Service<ChatService>()("ChatService", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const projectService = yield* ProjectService;

    // Create repository using Model.makeRepository (SA-002)
    const repo = yield* Model.makeRepository(ChatMessageEntity, {
      tableName: "chat_messages",
      idColumn: "id",
      spanPrefix: "ChatMessageRepository",
    });

    /**
     * Send a message and persist it to the database
     */
    const sendMessage = (
      input: typeof SendMessageInput.Type,
    ): Effect.Effect<typeof ChatMessageEntity.Type, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // Validate project exists
        yield* projectService.get(input.projectId);

        // Create message
        const id = randomUUID();
        const now = new Date().toISOString();

        yield* sql`
            INSERT INTO chat_messages (
              id, project_id, role, content, created_at
            ) VALUES (
              ${id}, ${input.projectId}, ${input.role}, ${input.content}, ${now}
            )
          `.pipe(
          Effect.catchTag("SqlError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Database error: ${error.message ?? "Unknown error"}`,
              }),
            ),
          ),
        );

        // Fetch the created message with proper column aliasing
        const rows = yield* sql
          .unsafe(`
          SELECT
            id,
            project_id as "projectId",
            role,
            content,
            created_at as "createdAt"
          FROM chat_messages
          WHERE id = '${id.replace(/'/g, "''")}'
        `)
          .pipe(
            Effect.catchTag("SqlError", (error) =>
              Effect.fail(
                new ValidationError({
                  message: `Database error: ${error.message ?? "Unknown error"}`,
                }),
              ),
            ),
          );

        if (rows.length === 0) {
          return yield* new NotFoundError({
            entity: "ChatMessage",
            id,
          });
        }

        // Return the raw row data (already has correct field names from aliasing)
        return rows[0] as typeof ChatMessageEntity.Type;
      });

    /**
     * Get messages for a project with cursor-based pagination
     * Messages are returned in chronological order (oldest first)
     */
    const getMessages = (
      input: typeof GetMessagesInput.Type,
    ): Effect.Effect<
      {
        messages: ReadonlyArray<typeof ChatMessageEntity.Type>;
        hasMore: boolean;
        nextCursor?: string;
      },
      ValidationError
    > =>
      Effect.gen(function* () {
        const limit = input.limit ?? 50;
        const cursor = input.cursor;

        // Build query with cursor-based pagination
        // Use OFFSET-based pagination for simplicity (cursor is the offset number)
        const fetchLimit = limit + 1;
        const projectIdEscaped = input.projectId.replace(/'/g, "''");
        const offset = cursor ? Number.parseInt(String(cursor), 10) : 0;

        const query = `
          SELECT
            id,
            project_id as "projectId",
            role,
            content,
            created_at as "createdAt"
          FROM chat_messages
          WHERE project_id = '${projectIdEscaped}'
          ORDER BY created_at ASC, id ASC
          LIMIT ${fetchLimit} OFFSET ${offset}
        `;

        const rows = yield* sql.unsafe(query).pipe(
          Effect.catchTag("SqlError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Database error: ${error.message ?? "Unknown error"}`,
              }),
            ),
          ),
        );

        // Return rows directly (already have correct field names from aliasing)
        // Don't use Schema.decodeUnknown to avoid DateTime object conversion
        const messages = rows as Array<typeof ChatMessageEntity.Type>;

        // Check if there are more messages beyond the limit
        const hasMore = messages.length > limit;
        const finalMessages = hasMore ? messages.slice(0, limit) : messages;

        // The next cursor is the offset for the next page
        const nextCursor = hasMore ? String(offset + limit) : undefined;

        return {
          messages: finalMessages,
          hasMore,
          nextCursor,
        };
      });

    return {
      sendMessage,
      getMessages,
    } as const;
  }),
  dependencies: [ProjectService.Default],
}) {}

/**
 * Live layer for ChatService with dependencies
 */
export const ChatServiceLive = ChatService.Default;
