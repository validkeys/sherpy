import { useLocalRuntime } from '@assistant-ui/react';

/**
 * Mock runtime hook for development and testing without a backend.
 * Uses @assistant-ui's useLocalRuntime to echo back messages with simulated AI responses.
 *
 * @param projectId - The project ID for the current session
 * @returns Mock runtime that processes messages client-side
 */
export function useMockRuntime(projectId: string) {
  const runtime = useLocalRuntime({
    initialMessages: [],
    maxSteps: 10,
    onNew: async (message) => {
      // Simulate AI response delay (500ms)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Extract user message text
      const userText = message.content
        .filter((content) => content.type === 'text')
        .map((content) => content.text)
        .join(' ');

      // Echo back user message with mock AI response
      return {
        role: 'assistant' as const,
        content: [
          {
            type: 'text' as const,
            text: `Mock AI response to: "${userText}"\n\n**Project:** ${projectId}\n\n---\n\nThis is a development mock. The UI is working correctly - messages are being submitted, stored, and displayed as expected.\n\nTo connect to a real backend:\n1. Set \`VITE_BACKEND_URL\` in your environment\n2. Implement the backend chat endpoint\n3. Restart the dev server\n\nFor now, you can test the chat interface, message display, and UI interactions with this mock runtime.`,
          },
        ],
      };
    },
  });

  return {
    runtime,
  };
}
