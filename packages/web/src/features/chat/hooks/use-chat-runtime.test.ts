import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
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

  it('returns runtime instance', () => {
    const { result } = renderHook(() => useChatRuntime(mockProjectId));

    expect(result.current).toBe(mockRuntime);
    expect(result.current).toHaveProperty('append');
    expect(result.current).toHaveProperty('switchToNewThread');
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
});
