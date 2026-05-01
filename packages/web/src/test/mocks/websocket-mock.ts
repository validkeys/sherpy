import { vi } from 'vitest';

export interface MockMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export interface MockWebSocketRuntime {
  append: ReturnType<typeof vi.fn>;
  switchToNewThread: ReturnType<typeof vi.fn>;
  messages: MockMessage[];
  isRunning: boolean;
  subscribe: ReturnType<typeof vi.fn>;
}

/**
 * Mock WebSocket runtime for testing @assistant-ui/react components
 * without establishing real WebSocket connections.
 */
export const createMockWebSocketRuntime = (): MockWebSocketRuntime => {
  return {
    append: vi.fn(async (message) => {
      return { id: 'mock-message-id', ...message };
    }),
    switchToNewThread: vi.fn(),
    messages: [],
    isRunning: false,
    subscribe: vi.fn(() => () => {}),
  };
};

/**
 * Mock implementation of useWebSocketRuntime hook
 */
export const mockUseWebSocketRuntime = vi.fn(() => createMockWebSocketRuntime());

/**
 * Helper: Simulate a streaming response by progressively updating message content
 *
 * @param runtime - The mock runtime to update
 * @param messageId - ID of the message being streamed
 * @param chunks - Array of content chunks to simulate streaming
 * @param delayMs - Optional delay between chunks (use with fake timers)
 *
 * @example
 * ```typescript
 * const runtime = createMockWebSocketRuntime();
 * simulateStreamingResponse(runtime, 'msg-1', [
 *   'Hello',
 *   'Hello, how',
 *   'Hello, how can I help you?'
 * ]);
 * ```
 */
export const simulateStreamingResponse = (
  runtime: MockWebSocketRuntime,
  messageId: string,
  chunks: string[],
  delayMs: number = 0
): void => {
  runtime.isRunning = true;

  chunks.forEach((content, index) => {
    const isLastChunk = index === chunks.length - 1;

    setTimeout(() => {
      const existingMessageIndex = runtime.messages.findIndex((m) => m.id === messageId);

      if (existingMessageIndex >= 0) {
        runtime.messages[existingMessageIndex].content = content;
      } else {
        runtime.messages.push({
          id: messageId,
          role: 'assistant',
          content,
        });
      }

      if (isLastChunk) {
        runtime.isRunning = false;
      }
    }, delayMs * index);
  });
};

/**
 * Helper: Simulate a connection error
 *
 * @param onError - The error handler function from runtime configuration
 * @param errorMessage - Error message to simulate
 *
 * @example
 * ```typescript
 * const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
 * simulateConnectionError(transportOptions.onError, 'Connection timeout');
 * ```
 */
export const simulateConnectionError = (
  onError: (error: Error) => void,
  errorMessage: string = 'WebSocket connection failed'
): void => {
  const error = new Error(errorMessage);
  onError(error);
};

/**
 * Helper: Simulate adding a message to the runtime
 *
 * @param runtime - The mock runtime to update
 * @param message - Message to add
 *
 * @example
 * ```typescript
 * const runtime = createMockWebSocketRuntime();
 * simulateIncomingMessage(runtime, {
 *   id: 'msg-1',
 *   role: 'assistant',
 *   content: 'Hello!'
 * });
 * ```
 */
export const simulateIncomingMessage = (
  runtime: MockWebSocketRuntime,
  message: MockMessage
): void => {
  runtime.messages.push(message);
};

/**
 * Helper: Simulate multiple messages in sequence
 *
 * @param runtime - The mock runtime to update
 * @param messages - Array of messages to add
 *
 * @example
 * ```typescript
 * simulateMessageSequence(runtime, [
 *   { id: '1', role: 'user', content: 'Hello' },
 *   { id: '2', role: 'assistant', content: 'Hi there!' }
 * ]);
 * ```
 */
export const simulateMessageSequence = (
  runtime: MockWebSocketRuntime,
  messages: MockMessage[]
): void => {
  messages.forEach((message) => {
    runtime.messages.push(message);
  });
};

/**
 * Helper: Create a mock message with defaults
 *
 * @param overrides - Optional overrides for message properties
 * @returns A complete mock message
 *
 * @example
 * ```typescript
 * const userMessage = createMockMessage({ role: 'user', content: 'Test' });
 * const assistantMessage = createMockMessage({ role: 'assistant' });
 * ```
 */
export const createMockMessage = (
  overrides: Partial<MockMessage> = {}
): MockMessage => {
  return {
    id: `msg-${Math.random().toString(36).substring(7)}`,
    role: 'user',
    content: 'Mock message content',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
};

/**
 * Helper: Reset runtime to initial state
 *
 * @param runtime - The mock runtime to reset
 *
 * @example
 * ```typescript
 * const runtime = createMockWebSocketRuntime();
 * // ... perform tests
 * resetRuntime(runtime);
 * ```
 */
export const resetRuntime = (runtime: MockWebSocketRuntime): void => {
  runtime.messages = [];
  runtime.isRunning = false;
  runtime.append.mockClear();
  runtime.switchToNewThread.mockClear();
  runtime.subscribe.mockClear();
};
