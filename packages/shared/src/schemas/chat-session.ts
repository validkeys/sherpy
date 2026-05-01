/**
 * ChatSession domain schema using @effect/sql Model.Class
 * Represents per-project AI chat sessions
 */

import { Model } from "@effect/sql";
import { Schema } from "effect";
import { DateTimeInsertWithOpenApi, DateTimeUpdateWithOpenApi, GeneratedUuidWithOpenApi } from "./openapi-helpers.js";

/**
 * Chat message structure (stored as JSON array)
 */
export const ChatMessage = Schema.Struct({
  role: Schema.Literal("user", "assistant"),
  content: Schema.String,
  timestamp: Schema.String,
});

export type ChatMessage = typeof ChatMessage.Type;

/**
 * Chat context type enum
 */
export const ChatContextType = Schema.Literal("sherpy-flow", "general", "scheduling", "planning");

export type ChatContextType = typeof ChatContextType.Type;

/**
 * ChatSession entity - stores AI conversation history per project
 */
export class ChatSession extends Model.Class<ChatSession>("ChatSession")({
  id: GeneratedUuidWithOpenApi,
  projectId: Schema.String,
  messages: Model.JsonFromString(Schema.Array(ChatMessage)),
  contextType: ChatContextType,
  createdAt: DateTimeInsertWithOpenApi,
  updatedAt: DateTimeUpdateWithOpenApi,
}) {}
