/**
 * Chat API request/response schemas using Schema.Class
 */

import { Schema } from "effect";
import { ChatMessage, ChatSession } from "../chat-session.js";

/**
 * Chat Request
 */
export class ChatRequest extends Schema.Class<ChatRequest>("ChatRequest")({
  projectId: Schema.String,
  message: Schema.String.pipe(Schema.minLength(1)),
  contextType: Schema.optional(Schema.Literal("sherpy-flow", "general", "scheduling", "planning")),
}) {}

/**
 * Chat Response
 */
export class ChatResponse extends Schema.Class<ChatResponse>("ChatResponse")({
  sessionId: Schema.String,
  response: Schema.String,
  timestamp: Schema.String,
}) {}

/**
 * Get Chat History Request
 */
export class GetChatHistoryRequest extends Schema.Class<GetChatHistoryRequest>(
  "GetChatHistoryRequest",
)({
  projectId: Schema.String,
  sessionId: Schema.optional(Schema.String),
  limit: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.positive())),
}) {}

/**
 * Get Chat History Response
 */
export class GetChatHistoryResponse extends Schema.Class<GetChatHistoryResponse>(
  "GetChatHistoryResponse",
)({
  session: Schema.typeSchema(ChatSession),
  messages: Schema.Array(ChatMessage),
}) {}
