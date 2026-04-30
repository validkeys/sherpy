/**
 * Chat types
 *
 * Domain types for chat messages and related entities.
 */

export interface ChatMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface ChatMessageMeta {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface GetChatMessagesResponse {
  data: ChatMessage[];
  meta: ChatMessageMeta;
}
