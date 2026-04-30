import { useMemo } from 'react';
import { type ChatModelAdapter, useLocalRuntime } from '@assistant-ui/react';

/**
 * Mock runtime hook for development and testing without a backend.
 * Uses @assistant-ui's useLocalRuntime to echo back messages with simulated AI responses.
 *
 * @param projectId - The project ID for the current session
 * @returns Mock runtime that processes messages client-side
 */
export function useMockRuntime(projectId: string) {
  // Create a stable mock adapter using useMemo
  const adapter: ChatModelAdapter = useMemo(
    () => ({
      async *run({ messages }) {
        // Simulate AI response delay (500ms)
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Get the last user message
        const lastMessage = messages[messages.length - 1];
        const userText =
          lastMessage?.content
            ?.filter((part) => part.type === 'text')
            .map((part) => ('text' in part ? part.text : ''))
            .join(' ') || 'No message';

        // Generate mock AI response
        const responseText = `Mock AI response to: "${userText}"\n\n**Project:** ${projectId}\n\n---\n\nThis is a development mock. The UI is working correctly - messages are being submitted, stored, and displayed as expected.\n\nTo connect to a real backend:\n1. Set \`VITE_BACKEND_URL\` in your environment\n2. Implement the backend chat endpoint\n3. Restart the dev server\n\nFor now, you can test the chat interface, message display, and UI interactions with this mock runtime.`;

        // Yield the complete response (for now, not streaming word by word)
        yield {
          content: [
            {
              type: 'text' as const,
              text: responseText,
            },
          ],
        };
      },
    }),
    [projectId]
  );

  const runtime = useLocalRuntime(adapter, {
    initialMessages: [],
    maxSteps: 10,
  });

  return {
    runtime,
  };
}
