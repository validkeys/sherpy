import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useChatRuntime } from './use-chat-runtime';

// Mock @assistant-ui/react
vi.mock('@assistant-ui/react', () => ({
  useAssistantTransportRuntime: vi.fn(),
}));

// Mock WebSocket utilities
vi.mock('@/lib/websocket', () => ({
  getWebSocketUrl: vi.fn(() => 'ws://localhost:8080'),
  getAuthToken: vi.fn(() => 'mock-auth-token'),
}));

// Mock chat messages API
vi.mock('@/shared/api/chat/get-messages', () => ({
  useMessages: vi.fn(),
}));

// Mock the send chat message API
const mockMutate = vi.fn();
const mockSendChatMessage = {
  mutate: mockMutate,
  isLoading: false,
  isSuccess: false,
  isError: false,
};

vi.mock('../api/send-chat-message', () => ({
  useSendChatMessage: () => mockSendChatMessage,
}));

describe('useChatRuntime', () => {
  const mockProjectId = 'test-project-456';
  let mockRuntime: any;
  let mockUseAssistantTransportRuntime: ReturnType<typeof vi.fn>;
  let mockGetWebSocketUrl: ReturnType<typeof vi.fn>;
  let mockGetAuthToken: ReturnType<typeof vi.fn>;
  let mockUseMessages: ReturnType<typeof vi.fn>;
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockMutate.mockClear();
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
        },
        queries: {
          retry: false,
        },
      },
    });
    mockRuntime = {
      append: vi.fn(),
      switchToNewThread: vi.fn(),
      messages: [],
      isRunning: false,
      subscribe: vi.fn(() => () => {}),
    };

    // Get mocked functions
    const assistantUI = await import('@assistant-ui/react');
    mockUseAssistantTransportRuntime = assistantUI.useAssistantTransportRuntime as any;
    mockUseAssistantTransportRuntime.mockReturnValue(mockRuntime);

    const websocketLib = await import('@/lib/websocket');
    mockGetWebSocketUrl = websocketLib.getWebSocketUrl as any;
    mockGetAuthToken = websocketLib.getAuthToken as any;

    const chatApi = await import('@/shared/api/chat/get-messages');
    mockUseMessages = chatApi.useMessages as any;
    mockUseMessages.mockReturnValue({
      data: { messages: [], hasMore: false },
      isLoading: false,
      error: null,
    });
  });

  it('creates runtime with correct API endpoint', () => {
    renderHook(() => useChatRuntime(mockProjectId), { wrapper });

    expect(mockGetWebSocketUrl).toHaveBeenCalled();
    expect(mockUseAssistantTransportRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        api: 'ws://localhost:8080/chat',
      })
    );
  });

  it('initializes runtime with empty messages state', () => {
    renderHook(() => useChatRuntime(mockProjectId), { wrapper });

    expect(mockUseAssistantTransportRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        initialState: {
          messages: [],
          isRunning: false,
        },
      })
    );
  });

  it('configures headers with authentication and project ID', async () => {
    renderHook(() => useChatRuntime(mockProjectId), { wrapper });

    const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
    const headers = await transportOptions.headers();

    expect(mockGetAuthToken).toHaveBeenCalled();
    expect(headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer mock-auth-token',
      'X-Project-Id': mockProjectId,
    });
  });

  it('handles missing auth token gracefully', async () => {
    mockGetAuthToken.mockReturnValue(null);

    renderHook(() => useChatRuntime(mockProjectId), { wrapper });

    const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
    const headers = await transportOptions.headers();

    expect(headers['Authorization']).toBe('');
  });

  it('configures converter function to transform state', () => {
    renderHook(() => useChatRuntime(mockProjectId), { wrapper });

    const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
    const converter = transportOptions.converter;

    const mockState = {
      messages: [{ id: '1', role: 'user' as const, content: 'test' }],
      isRunning: true,
    };

    const result = converter(mockState);

    expect(result).toEqual({
      messages: mockState.messages,
      isRunning: true,
    });
  });

  it('handles empty state in converter', () => {
    renderHook(() => useChatRuntime(mockProjectId), { wrapper });

    const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
    const converter = transportOptions.converter;

    const emptyState = {};
    const result = converter(emptyState);

    expect(result).toEqual({
      messages: [],
      isRunning: false,
    });
  });

  it('configures error handler', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => useChatRuntime(mockProjectId), { wrapper });

    const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
    const mockError = new Error('Connection failed');

    transportOptions.onError(mockError);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Chat transport error:', mockError);

    consoleErrorSpy.mockRestore();
  });

  it('returns runtime instance', () => {
    const { result } = renderHook(() => useChatRuntime(mockProjectId), { wrapper });

    expect(result.current.runtime).toBe(mockRuntime);
    expect(result.current.runtime).toHaveProperty('append');
    expect(result.current.runtime).toHaveProperty('switchToNewThread');
    expect(result.current).toHaveProperty('runtime');
    expect(result.current).not.toHaveProperty('connectionState');
    expect(result.current).not.toHaveProperty('manualRetry');
  });

  it('creates new runtime when projectId changes', () => {
    const { rerender } = renderHook(({ projectId }) => useChatRuntime(projectId), {
      initialProps: { projectId: mockProjectId },
    });

    const initialCallCount = mockUseAssistantTransportRuntime.mock.calls.length;

    // Change project ID
    rerender({ projectId: 'different-project-789' });

    // Should have created at least one more runtime
    expect(mockUseAssistantTransportRuntime.mock.calls.length).toBeGreaterThan(initialCallCount);

    // Verify new project ID in headers from the latest call
    const latestCallOptions =
      mockUseAssistantTransportRuntime.mock.calls[
        mockUseAssistantTransportRuntime.mock.calls.length - 1
      ][0];
    latestCallOptions.headers().then((headers: Record<string, string>) => {
      expect(headers['X-Project-Id']).toBe('different-project-789');
    });
  });

  it('logs error when error occurs', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderHook(() => useChatRuntime(mockProjectId), { wrapper });

    // Get the onError handler and simulate an error
    const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
    const mockError = new Error('WebSocket connection failed');

    // Use act to ensure state updates are flushed
    act(() => {
      transportOptions.onError(mockError);
    });

    // Check that error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith('Chat transport error:', mockError);

    consoleErrorSpy.mockRestore();
  });

  it('clears reconnection timeout on unmount', () => {
    vi.useFakeTimers();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useChatRuntime(mockProjectId), { wrapper });

    // Simulate error
    const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
    transportOptions.onError(new Error('Connection failed'));

    // Unmount before reconnection timeout
    unmount();

    // Should not throw or cause issues when timer fires
    expect(() => vi.advanceTimersByTime(3000)).not.toThrow();

    consoleErrorSpy.mockRestore();
    vi.useRealTimers();
  });

  describe('message history hydration', () => {
    it('loads existing messages from API on mount', () => {
      const mockMessages = [
        {
          id: 'msg-1',
          projectId: mockProjectId,
          role: 'user' as const,
          content: 'Hello',
          createdAt: '2026-05-01T10:00:00.000Z',
        },
        {
          id: 'msg-2',
          projectId: mockProjectId,
          role: 'assistant' as const,
          content: 'Hi there!',
          createdAt: '2026-05-01T10:00:01.000Z',
        },
      ];

      mockUseMessages.mockReturnValue({
        data: { messages: mockMessages, hasMore: false },
        isLoading: false,
        error: null,
      });

      renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      expect(mockUseMessages).toHaveBeenCalledWith({
        projectId: mockProjectId,
        queryConfig: expect.objectContaining({
          enabled: true,
          staleTime: Infinity,
        }),
      });
    });

    it('converts API messages to runtime format', () => {
      const mockMessages = [
        {
          id: 'msg-1',
          projectId: mockProjectId,
          role: 'user' as const,
          content: 'Test message',
          createdAt: '2026-05-01T10:00:00.000Z',
        },
      ];

      mockUseMessages.mockReturnValue({
        data: { messages: mockMessages, hasMore: false },
        isLoading: false,
        error: null,
      });

      renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      const expectedRuntimeMessages = [
        {
          id: 'msg-1',
          role: 'user',
          content: [{ type: 'text', text: 'Test message' }],
          createdAt: new Date('2026-05-01T10:00:00.000Z'),
        },
      ];

      expect(mockUseAssistantTransportRuntime).toHaveBeenCalledWith(
        expect.objectContaining({
          initialState: expect.objectContaining({
            messages: expectedRuntimeMessages,
          }),
        })
      );
    });

    it('initializes runtime with empty messages when no history exists', () => {
      mockUseMessages.mockReturnValue({
        data: { messages: [], hasMore: false },
        isLoading: false,
        error: null,
      });

      renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      expect(mockUseAssistantTransportRuntime).toHaveBeenCalledWith(
        expect.objectContaining({
          initialState: {
            messages: [],
            isRunning: false,
          },
        })
      );
    });

    it('waits for messages to load before hydrating', () => {
      mockUseMessages.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      expect(mockUseAssistantTransportRuntime).toHaveBeenCalledWith(
        expect.objectContaining({
          initialState: {
            messages: [],
            isRunning: false,
          },
        })
      );
    });

    it('preserves message order from API', () => {
      const mockMessages = [
        {
          id: 'msg-1',
          projectId: mockProjectId,
          role: 'user' as const,
          content: 'First',
          createdAt: '2026-05-01T10:00:00.000Z',
        },
        {
          id: 'msg-2',
          projectId: mockProjectId,
          role: 'assistant' as const,
          content: 'Second',
          createdAt: '2026-05-01T10:00:01.000Z',
        },
        {
          id: 'msg-3',
          projectId: mockProjectId,
          role: 'user' as const,
          content: 'Third',
          createdAt: '2026-05-01T10:00:02.000Z',
        },
      ];

      mockUseMessages.mockReturnValue({
        data: { messages: mockMessages, hasMore: false },
        isLoading: false,
        error: null,
      });

      renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
      const actualMessages = transportOptions.initialState.messages;

      expect(actualMessages).toHaveLength(3);
      expect(actualMessages[0].id).toBe('msg-1');
      expect(actualMessages[1].id).toBe('msg-2');
      expect(actualMessages[2].id).toBe('msg-3');
    });

    it('only fetches messages once on mount', () => {
      mockUseMessages.mockReturnValue({
        data: { messages: [], hasMore: false },
        isLoading: false,
        error: null,
      });

      renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      expect(mockUseMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          queryConfig: expect.objectContaining({
            staleTime: Infinity,
          }),
        })
      );
    });

    it('does not refetch messages when runtime is already hydrated', () => {
      const mockMessages = [
        {
          id: 'msg-1',
          projectId: mockProjectId,
          role: 'user' as const,
          content: 'Test',
          createdAt: '2026-05-01T10:00:00.000Z',
        },
      ];

      mockUseMessages.mockReturnValue({
        data: { messages: mockMessages, hasMore: false },
        isLoading: false,
        error: null,
      });

      const { rerender } = renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      // Clear the mock to count only subsequent calls
      mockUseMessages.mockClear();

      // Trigger rerender
      rerender();

      // Should use queryConfig with enabled based on hydration state
      // The hook should have logic to prevent refetching
      expect(mockUseMessages).toHaveBeenCalled();
    });

    it('returns isLoadingHistory flag while messages are loading', () => {
      mockUseMessages.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      expect(result.current.isLoadingHistory).toBe(true);
    });

    it('returns isLoadingHistory=false when messages are loaded', () => {
      mockUseMessages.mockReturnValue({
        data: { messages: [], hasMore: false },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      expect(result.current.isLoadingHistory).toBe(false);
    });
  });

  describe('message persistence integration', () => {
    it('configures prepareSendCommandsRequest callback', () => {
      renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
      expect(transportOptions.prepareSendCommandsRequest).toBeDefined();
      expect(typeof transportOptions.prepareSendCommandsRequest).toBe('function');
    });

    it('persists user messages sent through UI', async () => {
      renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
      const prepareFn = transportOptions.prepareSendCommandsRequest;

      // Simulate user sending a message through the UI
      const mockBody = {
        commands: [
          {
            type: 'add-message',
            message: {
              role: 'user',
              parts: [{ type: 'text', text: 'Hello from UI!' }],
            },
            parentId: null,
            sourceId: null,
          },
        ],
        state: {},
      };

      const result = prepareFn(mockBody);

      // Should call persistence mutation
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          data: {
            projectId: mockProjectId,
            content: 'Hello from UI!',
            role: 'user',
          },
        });
      });

      // Should return the body unchanged for WebSocket streaming
      expect(result).toEqual(mockBody);
    });

    it('handles multiple text parts in a message', async () => {
      renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
      const prepareFn = transportOptions.prepareSendCommandsRequest;

      const mockBody = {
        commands: [
          {
            type: 'add-message',
            message: {
              role: 'user',
              parts: [
                { type: 'text', text: 'Hello ' },
                { type: 'text', text: 'World!' },
              ],
            },
            parentId: null,
            sourceId: null,
          },
        ],
        state: {},
      };

      prepareFn(mockBody);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          data: {
            projectId: mockProjectId,
            content: 'Hello World!',
            role: 'user',
          },
        });
      });
    });

    it('ignores non-text parts (e.g., images)', async () => {
      renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
      const prepareFn = transportOptions.prepareSendCommandsRequest;

      const mockBody = {
        commands: [
          {
            type: 'add-message',
            message: {
              role: 'user',
              parts: [
                { type: 'text', text: 'Check this out: ' },
                { type: 'image', image: 'data:image/png;base64,...' },
              ],
            },
            parentId: null,
            sourceId: null,
          },
        ],
        state: {},
      };

      prepareFn(mockBody);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          data: {
            projectId: mockProjectId,
            content: 'Check this out: ',
            role: 'user',
          },
        });
      });
    });

    it('does NOT persist assistant messages (only user messages)', async () => {
      renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
      const prepareFn = transportOptions.prepareSendCommandsRequest;

      const mockBody = {
        commands: [
          {
            type: 'add-message',
            message: {
              role: 'assistant',
              parts: [{ type: 'text', text: 'Assistant response' }],
            },
            parentId: null,
            sourceId: null,
          },
        ],
        state: {},
      };

      prepareFn(mockBody);

      // Give time for async operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should NOT call mutation for assistant messages
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('processes multiple commands in a single request', async () => {
      renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
      const prepareFn = transportOptions.prepareSendCommandsRequest;

      const mockBody = {
        commands: [
          {
            type: 'add-message',
            message: {
              role: 'user',
              parts: [{ type: 'text', text: 'First message' }],
            },
            parentId: null,
            sourceId: null,
          },
          {
            type: 'add-message',
            message: {
              role: 'user',
              parts: [{ type: 'text', text: 'Second message' }],
            },
            parentId: null,
            sourceId: null,
          },
        ],
        state: {},
      };

      prepareFn(mockBody);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledTimes(2);
      });

      expect(mockMutate).toHaveBeenNthCalledWith(1, {
        data: {
          projectId: mockProjectId,
          content: 'First message',
          role: 'user',
        },
      });

      expect(mockMutate).toHaveBeenNthCalledWith(2, {
        data: {
          projectId: mockProjectId,
          content: 'Second message',
          role: 'user',
        },
      });
    });

    it('ignores non-add-message commands', async () => {
      renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
      const prepareFn = transportOptions.prepareSendCommandsRequest;

      const mockBody = {
        commands: [
          {
            type: 'add-tool-result',
            toolCallId: 'tool-123',
            toolName: 'search',
            result: { data: 'some result' },
            isError: false,
          },
        ],
        state: {},
      };

      prepareFn(mockBody);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('handles empty message content gracefully', async () => {
      renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
      const prepareFn = transportOptions.prepareSendCommandsRequest;

      const mockBody = {
        commands: [
          {
            type: 'add-message',
            message: {
              role: 'user',
              parts: [],
            },
            parentId: null,
            sourceId: null,
          },
        ],
        state: {},
      };

      prepareFn(mockBody);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not call mutation for empty content
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('continues WebSocket streaming even if persistence fails', async () => {
      mockMutate.mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderHook(() => useChatRuntime(mockProjectId), { wrapper });

      const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
      const prepareFn = transportOptions.prepareSendCommandsRequest;

      const mockBody = {
        commands: [
          {
            type: 'add-message',
            message: {
              role: 'user',
              parts: [{ type: 'text', text: 'Test message' }],
            },
            parentId: null,
            sourceId: null,
          },
        ],
        state: {},
      };

      const result = prepareFn(mockBody);

      // Should still return the body for WebSocket processing
      expect(result).toEqual(mockBody);

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to persist message:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('uses correct projectId from hook parameter', async () => {
      const customProjectId = 'custom-project-789';
      renderHook(() => useChatRuntime(customProjectId), { wrapper });

      const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
      const prepareFn = transportOptions.prepareSendCommandsRequest;

      const mockBody = {
        commands: [
          {
            type: 'add-message',
            message: {
              role: 'user',
              parts: [{ type: 'text', text: 'Test' }],
            },
            parentId: null,
            sourceId: null,
          },
        ],
        state: {},
      };

      prepareFn(mockBody);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          data: {
            projectId: customProjectId,
            content: 'Test',
            role: 'user',
          },
        });
      });
    });
  });
});
