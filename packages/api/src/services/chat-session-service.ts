/**
 * ChatSessionService - Domain service for chat session management
 * Uses Effect.Service with Layer pattern (SA-001)
 * Uses Model.makeRepository for basic CRUD (SA-002)
 */

import { randomUUID } from "node:crypto";
import { Model, SqlClient } from "@effect/sql";
import {
  type ChatContextType,
  type ChatMessage,
  ChatSession,
  NotFoundError,
  ValidationError,
} from "@sherpy/shared";
import { Effect, Layer, Option, Schema } from "effect";
import { ProjectService } from "./project-service.js";

/**
 * Input for creating a chat session
 */
export class CreateChatSessionInput extends Schema.Class<CreateChatSessionInput>(
  "CreateChatSessionInput",
)({
  projectId: Schema.String,
  contextType: Schema.Literal("sherpy-flow", "general", "scheduling", "planning"),
}) {}

/**
 * Input for adding a message to a session
 */
export class AddMessageInput extends Schema.Class<AddMessageInput>("AddMessageInput")({
  sessionId: Schema.String,
  role: Schema.Literal("user", "assistant"),
  content: Schema.String,
}) {}

/**
 * ChatSessionService - Effect.Service for chat session operations
 */
export class ChatSessionService extends Effect.Service<ChatSessionService>()("ChatSessionService", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const projectService = yield* ProjectService;

    // Create repository using Model.makeRepository (SA-002)
    const repo = yield* Model.makeRepository(ChatSession, {
      tableName: "chat_sessions",
      idColumn: "id",
      spanPrefix: "ChatSessionRepository",
    });

    /**
     * Create a new chat session for a project
     */
    const create = (
      input: typeof CreateChatSessionInput.Type,
    ): Effect.Effect<typeof ChatSession.Type, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // Validate project exists
        yield* projectService.get(input.projectId);

        // Create session with empty messages
        const id = randomUUID();
        const now = new Date().toISOString();

        yield* sql`
            INSERT INTO chat_sessions (
              id, project_id, messages, context_type, created_at, updated_at
            ) VALUES (
              ${id}, ${input.projectId}, ${JSON.stringify([])},
              ${input.contextType}, ${now}, ${now}
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

        // Fetch the created session using the repository for proper schema decoding
        const session = yield* repo.findById(id);

        if (Option.isNone(session)) {
          return yield* new NotFoundError({
            entity: "ChatSession",
            id,
          });
        }

        return session.value;
      });

    /**
     * Add a message to a chat session
     */
    const addMessage = (
      input: typeof AddMessageInput.Type,
    ): Effect.Effect<typeof ChatSession.Type, NotFoundError> =>
      Effect.gen(function* () {
        // Retrieve existing session
        const existingOption = yield* repo.findById(input.sessionId);

        if (Option.isNone(existingOption)) {
          return yield* new NotFoundError({
            entity: "ChatSession",
            id: input.sessionId,
          });
        }

        const existing = existingOption.value;

        // Append message to existing messages array
        const newMessage: ChatMessage = {
          role: input.role,
          content: input.content,
          timestamp: new Date().toISOString(),
        };

        const updatedMessages = [...existing.messages, newMessage];

        // Update session with new messages
        const updated = yield* repo.update({
          id: existing.id,
          projectId: existing.projectId,
          messages: updatedMessages,
          contextType: existing.contextType,
          updatedAt: undefined, // Let Model.DateTimeUpdate handle this
        });

        return updated;
      });

    /**
     * Get full chat history for a session
     */
    const getHistory = (sessionId: string): Effect.Effect<typeof ChatSession.Type, NotFoundError> =>
      Effect.gen(function* () {
        const sessionOption = yield* repo.findById(sessionId);

        if (Option.isNone(sessionOption)) {
          return yield* new NotFoundError({
            entity: "ChatSession",
            id: sessionId,
          });
        }

        return sessionOption.value;
      });

    /**
     * List all chat sessions for a project (most recent first)
     */
    const listByProject = (
      projectId: string,
    ): Effect.Effect<ReadonlyArray<typeof ChatSession.Type>, never> =>
      Effect.gen(function* () {
        const sessions = yield* sql`
            SELECT * FROM chat_sessions
            WHERE project_id = ${projectId}
            ORDER BY updated_at DESC
          `.pipe(
          Effect.flatMap(Schema.decodeUnknown(Schema.Array(ChatSession))),
          Effect.catchAll(() => Effect.succeed([] as ReadonlyArray<typeof ChatSession.Type>)),
        );

        return sessions;
      });

    /**
     * Delete a chat session
     */
    const deleteSession = (sessionId: string): Effect.Effect<void, NotFoundError> =>
      Effect.gen(function* () {
        // Verify session exists
        const sessionOption = yield* repo.findById(sessionId);

        if (Option.isNone(sessionOption)) {
          return yield* new NotFoundError({
            entity: "ChatSession",
            id: sessionId,
          });
        }

        yield* repo.delete(sessionId);
      });

    return {
      create,
      addMessage,
      getHistory,
      listByProject,
      delete: deleteSession,
    } as const;
  }),
  dependencies: [ProjectService.Default],
}) {}

/**
 * Live layer for ChatSessionService with dependencies
 */
export const ChatSessionServiceLive = ChatSessionService.Default;
