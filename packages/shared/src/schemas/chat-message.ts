/**
 * ChatMessage domain schema for individual message persistence
 * Stores each chat message as a separate database row
 */

import { Model } from "@effect/sql";
import { Schema } from "effect";

/**
 * ChatMessageEntity - stores individual chat messages per project
 * Named with "Entity" suffix to distinguish from ChatMessage type in chat-session.ts
 */
export class ChatMessageEntity extends Model.Class<ChatMessageEntity>("ChatMessageEntity")({
  id: Model.Generated(Schema.String),
  projectId: Schema.String,
  role: Schema.Literal("user", "assistant"),
  content: Schema.String,
  createdAt: Model.DateTimeInsert,
}) {}
