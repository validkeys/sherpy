/**
 * ChatAssistantUIProvider
 * Wraps assistant-ui's runtime provider with project-specific configuration
 */

import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  type ChatModelRunResult,
} from "@assistant-ui/react";
import { useMemo, type ReactNode } from "react";

interface ChatAssistantUIProviderProps {
  projectId: string;
  children: ReactNode;
}

/**
 * Provider component that configures assistant-ui runtime for project-scoped chat.
 * Uses local runtime for now - will be replaced with external store runtime
 * when backend API is implemented.
 */
export function ChatAssistantUIProvider({
  projectId,
  children,
}: ChatAssistantUIProviderProps) {
  // Simple chat model adapter that returns a placeholder message
  // Will be replaced with API integration in M6-006
  const adapter: ChatModelAdapter = useMemo(
    () => ({
      run: async (): Promise<ChatModelRunResult> => {
        return {
          content: [
            {
              type: "text" as const,
              text: `Project ${projectId}: Chat backend not yet implemented. This will connect to the API in M6-006.`,
            },
          ],
        };
      },
    }),
    [projectId]
  );

  // Configure runtime with project context
  // Using local runtime for now - will switch to useExternalStoreRuntime
  // when backend API endpoint is ready (M6-006)
  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
