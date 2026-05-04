/**
 * Chat History Component
 *
 * Displays historical messages from database (via React Query)
 * Separate from streaming runtime to avoid initialization issues.
 */

import { useMessages } from '@/shared/api/chat/get-messages';
import type { ChatMessage } from '@/shared/api/chat/types';

interface ChatHistoryProps {
  projectId: string;
}

/**
 * Renders historical chat messages from the database
 *
 * This component displays messages loaded via REST API (React Query).
 * New streaming messages from the runtime are handled separately.
 *
 * @param projectId - The project ID to load messages for
 */
export function ChatHistory({ projectId }: ChatHistoryProps) {
  const enabled = !!projectId;

  const { data, isLoading, error } = useMessages({
    projectId,
    queryConfig: {
      enabled,
      staleTime: Infinity, // Only fetch once
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">Loading chat history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-destructive">
          Failed to load chat history: {error.message}
        </div>
      </div>
    );
  }

  const messages = data?.messages || [];

  if (messages.length === 0) {
    return null; // No history to show
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => (
        <ChatHistoryMessage key={message.id} message={message} />
      ))}
    </div>
  );
}

/**
 * Individual message display component
 */
function ChatHistoryMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      data-message-id={message.id}
      data-role={message.role}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        <div className="mt-1 text-xs opacity-70">
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
