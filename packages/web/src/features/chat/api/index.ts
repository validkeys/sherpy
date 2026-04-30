/**
 * Chat API Layer
 *
 * Exports all chat-related API functions, query options, and hooks
 */

export {
  getChatMessages,
  getChatMessagesQueryOptions,
  useChatMessages,
  type UseChatMessagesOptions,
} from './get-chat-messages';

export {
  sendChatMessage,
  useSendChatMessage,
  type SendChatMessageInput,
  type UseSendChatMessageOptions,
} from './send-chat-message';
