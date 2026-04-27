/**
 * ChatAssistantUIProvider
 * Wraps assistant-ui's runtime provider with project-specific configuration
 */

import { useApi } from "@/hooks/use-api";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  type ChatModelRunResult,
} from "@assistant-ui/react";
import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";

interface ChatAssistantUIProviderProps {
  projectId: string;
  children: ReactNode;
}

/**
 * Provider component that configures assistant-ui runtime for project-scoped chat.
 * Integrates with backend API for message persistence.
 */
export function ChatAssistantUIProvider({
  projectId,
  children,
}: ChatAssistantUIProviderProps) {
  const apiClient = useApi();
  const [messageHistory, setMessageHistory] = useState<
    Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      createdAt: string;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const renderCount = useRef(0);
  renderCount.current++;
  console.log(`[DIAG] ChatAssistantUIProvider render #${renderCount.current}, projectId=${projectId}, isLoading=${isLoading}`);

  useEffect(() => {
    console.log("[DIAG] ChatAssistantUIProvider MOUNTED");
    return () => {
      console.log("[DIAG] ChatAssistantUIProvider UNMOUNTING");
    };
  }, []);

  // Load message history on mount
  // IMPORTANT: Only run once per projectId change, not on apiClient changes to avoid loops
  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const response = await apiClient.getChatMessages(projectId, { limit: 50 });
        if (!cancelled) {
          setMessageHistory(response.messages);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Chat model adapter that sends messages to the API
  // IMPORTANT: Stable adapter - only recreate when projectId changes, not on apiClient changes
  const adapter: ChatModelAdapter = useMemo(
    () => ({
      run: async ({ messages }): Promise<ChatModelRunResult> => {
        // Get the last user message
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.role !== "user") {
          throw new Error("Invalid message state");
        }

        const userContent =
          typeof lastMessage.content === "string"
            ? lastMessage.content
            : lastMessage.content.map((part) => (part.type === "text" ? part.text : "")).join("");

        // Send user message to API - backend will generate and return assistant response via Bedrock/Claude
        const { message: assistantMessage } = await apiClient.sendChatMessage(projectId, "user", userContent);

        // Update local history with both messages
        setMessageHistory((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "user", content: userContent, createdAt: new Date().toISOString() },
          assistantMessage,
        ]);

        // Return assistant response from Bedrock/Claude
        return {
          content: [
            {
              type: "text" as const,
              text: assistantMessage.content,
            },
          ],
        };
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId]
  );

  // Configure runtime with the API adapter
  const runtime = useLocalRuntime(adapter);

  // IMPORTANT: Always render the same tree structure regardless of loading state
  // Conditional rendering here causes Suspense children to remount infinitely
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
