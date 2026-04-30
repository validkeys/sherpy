import { useAssistantRuntime } from '@assistant-ui/react';

/**
 * Custom hook for programmatic chat control.
 *
 * Provides methods to send messages and control the chat thread
 * without user interaction via the UI. Used for auto-skill invocation
 * and programmatic message sending from other features.
 *
 * @returns Object with sendMessage, sendSystemMessage, and clearThread functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { sendMessage, clearThread } = useChatActions();
 *
 *   const handleStepClick = () => {
 *     sendMessage('/sherpy-flow business-requirements');
 *   };
 *
 *   return <button onClick={handleStepClick}>Start Business Requirements</button>;
 * }
 * ```
 */
export function useChatActions() {
  const runtime = useAssistantRuntime();

  /**
   * Send a user message to the chat.
   *
   * @param content - The message content to send
   */
  const sendMessage = (content: string) => {
    runtime.append({
      role: 'user',
      content: [{ type: 'text', text: content }],
    });
  };

  /**
   * Send a system message to the chat.
   *
   * System messages can be used for context or instructions
   * that should not appear as user messages.
   *
   * @param content - The system message content
   */
  const sendSystemMessage = (content: string) => {
    runtime.append({
      role: 'system',
      content: [{ type: 'text', text: content }],
    });
  };

  /**
   * Clear the current thread and start a new conversation.
   *
   * This will remove all messages from the current chat thread.
   */
  const clearThread = () => {
    runtime.switchToNewThread();
  };

  return {
    sendMessage,
    sendSystemMessage,
    clearThread,
  };
}
