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
import { useEffect, useMemo, useState, type ReactNode } from "react";

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

  // Load message history on mount
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
  }, [apiClient, projectId]);

  // Chat model adapter that sends messages to the API
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

        // Send user message to API
        await apiClient.sendChatMessage(projectId, "user", userContent);

        // For now, return a simple acknowledgment as assistant response
        // In the future, this would call an AI model
        const assistantResponse = `Message received: "${userContent}"`;

        // Save assistant response
        const { message } = await apiClient.sendChatMessage(
          projectId,
          "assistant",
          assistantResponse,
        );

        // Update local history
        setMessageHistory((prev) => [
          ...prev,
          { id: message.id, role: "user", content: userContent, createdAt: new Date().toISOString() },
          message,
        ]);

        return {
          content: [
            {
              type: "text" as const,
              text: assistantResponse,
            },
          ],
        };
      },
    }),
    [apiClient, projectId]
  );

  // Configure runtime with the API adapter
  const runtime = useLocalRuntime(adapter);

  // Show loading state while fetching history
  if (isLoading) {
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    );
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
