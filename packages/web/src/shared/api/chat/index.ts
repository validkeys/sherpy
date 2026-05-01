/**
 * Chat Messages API
 *
 * Centralized exports for all Chat Messages API integration.
 * Import from this file to access types, schemas, and hooks.
 *
 * @example
 * ```ts
 * import { useMessages, useSendMessage, type ChatMessage } from '@/shared/api/chat';
 * ```
 */

// Types
export type {
  ChatMessage,
  MessageRole,
  SendMessageResponse,
  SendMessageInput,
  GetMessagesResponse,
  GetMessagesParams,
} from './types';

// Schemas
export {
  messageRoleSchema,
  sendMessageInputSchema,
  getMessagesParamsSchema,
} from './schemas';

// Send Message
export { sendMessage, useSendMessage, type SendMessageVariables } from './send-message';

// Get Messages
export { getMessages, getMessagesQueryOptions, useMessages } from './get-messages';
