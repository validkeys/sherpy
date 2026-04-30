import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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

describe('useChatRuntime', () => {
  const mockProjectId = 'test-project-456';
  let mockRuntime: any;
  let mockUseAssistantTransportRuntime: ReturnType<typeof vi.fn>;
  let mockGetWebSocketUrl: ReturnType<typeof vi.fn>;
  let mockGetAuthToken: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
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
  });

  it('creates runtime with correct API endpoint', () => {
    renderHook(() => useChatRuntime(mockProjectId));

    expect(mockGetWebSocketUrl).toHaveBeenCalled();
    expect(mockUseAssistantTransportRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        api: 'ws://localhost:8080/chat',
      })
    );
  });

  it('initializes runtime with empty messages state', () => {
    renderHook(() => useChatRuntime(mockProjectId));

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
    renderHook(() => useChatRuntime(mockProjectId));

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

    renderHook(() => useChatRuntime(mockProjectId));

    const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
    const headers = await transportOptions.headers();

    expect(headers['Authorization']).toBe('');
  });

  it('configures converter function to transform state', () => {
    renderHook(() => useChatRuntime(mockProjectId));

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
    renderHook(() => useChatRuntime(mockProjectId));

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

    renderHook(() => useChatRuntime(mockProjectId));

    const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
    const mockError = new Error('Connection failed');

    transportOptions.onError(mockError);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Chat transport error:', mockError);

    consoleErrorSpy.mockRestore();
  });

  it('returns runtime instance with connection state', () => {
    const { result } = renderHook(() => useChatRuntime(mockProjectId));

    expect(result.current.runtime).toBe(mockRuntime);
    expect(result.current.runtime).toHaveProperty('append');
    expect(result.current.runtime).toHaveProperty('switchToNewThread');
    expect(result.current).toHaveProperty('connectionState');
    expect(result.current).toHaveProperty('manualRetry');
    expect(result.current.connectionState).toEqual({
      isConnected: true,
      error: null,
      isReconnecting: false,
    });
  });

  it('creates new runtime when projectId changes', () => {
    const { rerender } = renderHook(({ projectId }) => useChatRuntime(projectId), {
      initialProps: { projectId: mockProjectId },
    });

    expect(mockUseAssistantTransportRuntime).toHaveBeenCalledTimes(1);

    // Change project ID
    rerender({ projectId: 'different-project-789' });

    expect(mockUseAssistantTransportRuntime).toHaveBeenCalledTimes(2);

    // Verify new project ID in headers
    const secondCallOptions = mockUseAssistantTransportRuntime.mock.calls[1][0];
    secondCallOptions.headers().then((headers: Record<string, string>) => {
      expect(headers['X-Project-Id']).toBe('different-project-789');
    });
  });

  it('sets connection error state when error occurs', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useChatRuntime(mockProjectId));

    // Get the onError handler and simulate an error
    const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
    const mockError = new Error('WebSocket connection failed');

    // Use act to ensure state updates are flushed
    act(() => {
      transportOptions.onError(mockError);
    });

    // Check that connection state reflects the error
    expect(result.current.connectionState.isConnected).toBe(false);
    expect(result.current.connectionState.error).toBe(mockError);
    expect(result.current.connectionState.isReconnecting).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('schedules automatic reconnection after error', () => {
    vi.useFakeTimers();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useChatRuntime(mockProjectId));

    // Simulate error
    const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];

    act(() => {
      transportOptions.onError(new Error('Connection failed'));
    });

    // Should not be reconnecting immediately
    expect(result.current.connectionState.isReconnecting).toBe(false);

    // Fast-forward 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should now be in reconnecting state
    expect(result.current.connectionState.isReconnecting).toBe(true);

    consoleErrorSpy.mockRestore();
    vi.useRealTimers();
  });

  it('allows manual retry', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useChatRuntime(mockProjectId));

    // Simulate error
    const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];

    act(() => {
      transportOptions.onError(new Error('Connection failed'));
    });

    expect(result.current.connectionState.isConnected).toBe(false);

    // Manually retry
    act(() => {
      result.current.manualRetry();
    });

    // Should be marked as reconnecting and connected
    expect(result.current.connectionState.isConnected).toBe(true);
    expect(result.current.connectionState.error).toBe(null);

    consoleErrorSpy.mockRestore();
  });

  it('clears reconnection timeout on unmount', () => {
    vi.useFakeTimers();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useChatRuntime(mockProjectId));

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
});
