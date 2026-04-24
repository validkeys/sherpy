/**
 * Chat RPC endpoint handlers
 * Implements chat session and message operations
 */

import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { ChatSession, NotFoundError, ValidationError } from "@sherpy/shared";
import { Schema } from "effect";

/**
 * Request/Response schemas for chat endpoints
 */

// POST /api/projects/:projectId/chat/sessions - Create chat session
export class CreateChatSessionParams extends Schema.Class<CreateChatSessionParams>(
  "CreateChatSessionParams",
)({
  projectId: Schema.String,
}) {}

export class CreateChatSessionRequest extends Schema.Class<CreateChatSessionRequest>(
  "CreateChatSessionRequest",
)({
  contextType: Schema.Literal("sherpy-flow", "general", "scheduling", "planning"),
}) {}

export class CreateChatSessionResponse extends Schema.Class<CreateChatSessionResponse>(
  "CreateChatSessionResponse",
)({
  session: Schema.typeSchema(ChatSession),
}) {}

// GET /api/projects/:projectId/chat/sessions - List chat sessions
export class ListChatSessionsParams extends Schema.Class<ListChatSessionsParams>(
  "ListChatSessionsParams",
)({
  projectId: Schema.String,
}) {}

export class ListChatSessionsResponse extends Schema.Class<ListChatSessionsResponse>(
  "ListChatSessionsResponse",
)({
  sessions: Schema.Array(Schema.typeSchema(ChatSession)),
}) {}

// GET /api/chat/sessions/:sessionId - Get chat history
export class GetChatHistoryParams extends Schema.Class<GetChatHistoryParams>(
  "GetChatHistoryParams",
)({
  sessionId: Schema.String,
}) {}

export class GetChatHistoryResponse extends Schema.Class<GetChatHistoryResponse>(
  "GetChatHistoryResponse",
)({
  session: Schema.typeSchema(ChatSession),
}) {}

// POST /api/chat/sessions/:sessionId/messages - Send message
export class SendMessageParams extends Schema.Class<SendMessageParams>("SendMessageParams")({
  sessionId: Schema.String,
}) {}

export class SendMessageRequest extends Schema.Class<SendMessageRequest>("SendMessageRequest")({
  role: Schema.Literal("user", "assistant"),
  content: Schema.String,
}) {}

export class SendMessageResponse extends Schema.Class<SendMessageResponse>("SendMessageResponse")({
  session: Schema.typeSchema(ChatSession),
}) {}

// DELETE /api/chat/sessions/:sessionId - Delete chat session
export class DeleteChatSessionParams extends Schema.Class<DeleteChatSessionParams>(
  "DeleteChatSessionParams",
)({
  sessionId: Schema.String,
}) {}

export class DeleteChatSessionResponse extends Schema.Class<DeleteChatSessionResponse>(
  "DeleteChatSessionResponse",
)({
  success: Schema.Literal(true),
}) {}

// POST /api/projects/:projectId/chat/messages - Send message
export class SendChatMessageParams extends Schema.Class<SendChatMessageParams>(
  "SendChatMessageParams",
)({
  projectId: Schema.String,
}) {}

export class SendChatMessageRequest extends Schema.Class<SendChatMessageRequest>(
  "SendChatMessageRequest",
)({
  role: Schema.Literal("user", "assistant"),
  content: Schema.String,
}) {}

export class ChatMessageResponse extends Schema.Class<ChatMessageResponse>("ChatMessageResponse")({
  id: Schema.String,
  projectId: Schema.String,
  role: Schema.Literal("user", "assistant"),
  content: Schema.String,
  createdAt: Schema.String,
}) {}

export class SendChatMessageResponse extends Schema.Class<SendChatMessageResponse>(
  "SendChatMessageResponse",
)({
  message: ChatMessageResponse,
}) {}

// GET /api/projects/:projectId/chat/messages - Get message history
export class GetChatMessagesParams extends Schema.Class<GetChatMessagesParams>(
  "GetChatMessagesParams",
)({
  projectId: Schema.String,
}) {}

export class GetChatMessagesQuery extends Schema.Class<GetChatMessagesQuery>(
  "GetChatMessagesQuery",
)({
  limit: Schema.optional(Schema.NumberFromString.pipe(Schema.int(), Schema.positive())),
  cursor: Schema.optional(Schema.String),
}) {}

export class GetChatMessagesResponse extends Schema.Class<GetChatMessagesResponse>(
  "GetChatMessagesResponse",
)({
  messages: Schema.Array(ChatMessageResponse),
  hasMore: Schema.Boolean,
  nextCursor: Schema.optional(Schema.String),
}) {}

/**
 * Chat API Group - defines all chat endpoints
 * All endpoints require Authentication middleware
 */
export class ChatApi extends HttpApiGroup.make("chat")
  .add(
    HttpApiEndpoint.post("createChatSession", "/projects/:projectId/chat/sessions")
      .addSuccess(CreateChatSessionResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(CreateChatSessionParams)
      .setPayload(CreateChatSessionRequest),
  )
  .add(
    HttpApiEndpoint.get("listChatSessions", "/projects/:projectId/chat/sessions")
      .addSuccess(ListChatSessionsResponse)
      .addError(ValidationError)
      .setPath(ListChatSessionsParams),
  )
  .add(
    HttpApiEndpoint.get("getChatHistory", "/chat/sessions/:sessionId")
      .addSuccess(GetChatHistoryResponse)
      .addError(NotFoundError)
      .setPath(GetChatHistoryParams),
  )
  .add(
    HttpApiEndpoint.post("sendMessage", "/chat/sessions/:sessionId/messages")
      .addSuccess(SendMessageResponse)
      .addError(NotFoundError)
      .setPath(SendMessageParams)
      .setPayload(SendMessageRequest),
  )
  .add(
    HttpApiEndpoint.del("deleteChatSession", "/chat/sessions/:sessionId")
      .addSuccess(DeleteChatSessionResponse)
      .addError(NotFoundError)
      .setPath(DeleteChatSessionParams),
  )
  .add(
    HttpApiEndpoint.post("sendChatMessage", "/projects/:projectId/chat/messages")
      .addSuccess(SendChatMessageResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(SendChatMessageParams)
      .setPayload(SendChatMessageRequest),
  )
  .add(
    HttpApiEndpoint.get("getChatMessages", "/projects/:projectId/chat/messages")
      .addSuccess(GetChatMessagesResponse)
      .addError(ValidationError)
      .setPath(GetChatMessagesParams)
      .setUrlParams(GetChatMessagesQuery),
  )
  .prefix("/api") {}
