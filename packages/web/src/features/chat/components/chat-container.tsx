import { Thread, AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime } from '../hooks/use-chat-runtime';
import { StreamingIndicator } from './streaming-indicator';
import { CustomComposer } from './custom-composer';

interface ChatContainerProps {
  projectId: string;
}

/**
 * Main chat container component using @assistant-ui Thread component.
 * Handles WebSocket runtime initialization and displays the chat interface
 * with loading and streaming indicators. Supports hybrid mode with both
 * guided questions and free-form messages.
 */
export function ChatContainer({ projectId }: ChatContainerProps) {
  const runtime = useChatRuntime(projectId);
  const isRunning = runtime?.isRunning || false;

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Let's start the sherpy workflow. I'll guide you through each step.
            You can follow the guided questions or ask your own questions
            anytime.
          </p>
        </div>
        <div className="flex-1">
          <Thread runtime={runtime} components={{ Composer: CustomComposer }} />
          {isRunning && <StreamingIndicator />}
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
