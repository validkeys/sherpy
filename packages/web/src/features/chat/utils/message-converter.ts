/**
 * Message Converter
 *
 * Converts between ChatMessage (API format) and ThreadMessageLike (assistant-ui format).
 */

import type { ThreadMessageLike } from '@assistant-ui/react';
import type { ChatMessage } from '../types';

/**
 * Converts a single ChatMessage from API format to assistant-ui ThreadMessageLike format.
 *
 * API format: { content: string }
 * assistant-ui format: { content: [{ type: 'text', text: string }] }
 *
 * @param message - ChatMessage from API
 * @returns ThreadMessageLike for assistant-ui runtime
 */
export function convertToThreadMessage(
  message: ChatMessage
): ThreadMessageLike {
  return {
    id: message.id,
    role: message.role,
    content: [
      {
        type: 'text',
        text: message.content,
      },
    ],
    createdAt: new Date(message.createdAt),
  };
}

/**
 * Converts an array of ChatMessages to ThreadMessageLike format.
 *
 * @param messages - Array of ChatMessages from API
 * @returns Array of ThreadMessageLike for assistant-ui runtime
 */
export function convertMessagesToThread(
  messages: ChatMessage[]
): ThreadMessageLike[] {
  return messages.map(convertToThreadMessage);
}
