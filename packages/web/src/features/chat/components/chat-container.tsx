import { useAssistantRuntime } from '@assistant-ui/react';
import { Thread } from '@/shared/components/assistant-ui/thread';
import { useConnectionState } from '../hooks/use-connection-state';
import { StreamingIndicator } from './streaming-indicator';
import { CustomComposer } from './custom-composer';
import { ConnectionError } from './connection-error';
import { ChatHistory } from './chat-history';

interface ChatContainerProps {
  projectId: string;
}

/**
 * Main chat container component with historical and streaming messages.
 *
 * Architecture:
 * - ChatHistory: Displays historical messages from database (React Query)
 * - Thread: Displays new streaming messages from runtime (WebSocket)
 *
 * This separation avoids runtime initialization issues when hydrating with
 * historical messages. Historical messages are loaded via REST API and displayed
 * separately, while the runtime handles only new streaming messages.
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
          Let's start the sherpy workflow. I'll guide you through each step. You can follow the
          guided questions or ask your own questions anytime.
        </p>
      </div>

      {showError && (
        <ConnectionError onRetry={manualRetry} isReconnecting={connectionState.isReconnecting} />
      )}

      <div className="flex-1 relative overflow-y-auto">
        <div className="p-4">
          {/* Historical messages from database */}
          <ChatHistory projectId={projectId} />

          {/* New streaming messages from runtime */}
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
    </div>
  );
}
