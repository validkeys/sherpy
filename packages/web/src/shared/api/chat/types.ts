/**
 * Chat Messages API Types
 *
 * Type definitions for Chat Messages API integration.
 * Provides types for sending messages and fetching chat history.
 */

/**
 * Message role enum
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Chat message entity
 */
export interface ChatMessage {
  id: string;
  projectId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

/**
 * Response type for sending a message
 * POST /api/projects/:projectId/chat/messages
 */
export interface SendMessageResponse {
  message: ChatMessage;
}

/**
 * Input for sending a message
 */
export interface SendMessageInput {
  content: string;
  role: MessageRole;
}

/**
 * Response type for getting messages list with pagination
 * GET /api/projects/:projectId/chat/messages
 */
export interface GetMessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Query parameters for fetching messages
 */
export interface GetMessagesParams extends Record<string, string | number | boolean | undefined> {
  limit?: number;
  cursor?: string;
}
