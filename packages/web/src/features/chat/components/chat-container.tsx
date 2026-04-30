import { useAssistantRuntime } from '@assistant-ui/react';
import { Thread } from '@/shared/components/assistant-ui/thread';
import { useConnectionState } from '../hooks/use-connection-state';
import { StreamingIndicator } from './streaming-indicator';
import { CustomComposer } from './custom-composer';
import { ConnectionError } from './connection-error';

interface ChatContainerProps {
  projectId: string;
}

/**
 * Main chat container component using @assistant-ui Thread component.
 * Displays the chat interface with loading and streaming indicators.
 * Supports hybrid mode with both guided questions and free-form messages.
 * Shows connection errors and provides reconnection UI when WebSocket disconnects.
 *
 * NOTE: Expects to be rendered inside AssistantRuntimeProvider and AuiProvider
 * (provided by ProjectPage). Uses runtime from provider context (no duplicate creation).
 */
export function ChatContainer({ projectId }: ChatContainerProps) {
  const runtime = useAssistantRuntime();
  const { connectionState, manualRetry } = useConnectionState(projectId);
  const isRunning = runtime?.isRunning || false;
  const showError = !connectionState.isConnected || connectionState.error;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Let's start the sherpy workflow. I'll guide you through each step.
          You can follow the guided questions or ask your own questions anytime.
        </p>
      </div>

      {showError && (
        <ConnectionError
          onRetry={manualRetry}
          isReconnecting={connectionState.isReconnecting}
        />
      )}

      <div className="flex-1 relative">
        <Thread
          composer={
            connectionState.isConnected ? (
              <>
                <CustomComposer />
                {isRunning && <StreamingIndicator />}
              </>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
