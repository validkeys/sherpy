import { vi } from 'vitest';

/**
 * Mock WebSocket runtime for testing @assistant-ui/react components
 * without establishing real WebSocket connections.
 */
export const createMockWebSocketRuntime = () => {
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
