import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { sendChatMessage, useSendChatMessage } from './send-chat-message';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    post: vi.fn(),
  },
}));

describe('sendChatMessage', () => {
  const mockProjectId = 'project-123';
  let mockApiPost: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const apiClient = await import('@/lib/api-client');
    mockApiPost = apiClient.api.post as any;
  });

  it('calls API with correct endpoint and data', async () => {
    const mockInput = {
      projectId: mockProjectId,
      content: 'Hello, assistant!',
      role: 'user' as const,
    };

    const mockResponse = {
      id: 'msg-1',
      projectId: mockProjectId,
      role: 'user' as const,
      content: 'Hello, assistant!',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockApiPost.mockResolvedValue(mockResponse);

    const result = await sendChatMessage({ data: mockInput });

    expect(mockApiPost).toHaveBeenCalledWith('/chat/messages', mockInput);
    expect(result).toEqual(mockResponse);
  });

  it('handles system messages', async () => {
    const mockInput = {
      projectId: mockProjectId,
      content: 'System notification',
      role: 'system' as const,
    };

    const mockResponse = {
      id: 'msg-2',
      projectId: mockProjectId,
      role: 'system' as const,
      content: 'System notification',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockApiPost.mockResolvedValue(mockResponse);

    const result = await sendChatMessage({ data: mockInput });

    expect(result.role).toBe('system');
    expect(result.content).toBe('System notification');
  });

  it('handles API errors', async () => {
    const mockError = new Error('Network error');
    mockApiPost.mockRejectedValue(mockError);

    await expect(
      sendChatMessage({
        data: { projectId: mockProjectId, content: 'Test' },
      })
    ).rejects.toThrow('Network error');
  });
});

describe('useSendChatMessage', () => {
  const mockProjectId = 'project-456';
  let queryClient: QueryClient;
  let mockApiPost: ReturnType<typeof vi.fn>;

  const wrapper = ({ children }: { children: ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
        },
      },
    });

    const apiClient = await import('@/lib/api-client');
    mockApiPost = apiClient.api.post as any;
  });

  it('sends message successfully', async () => {
    const mockResponse = {
      id: 'msg-1',
      projectId: mockProjectId,
      role: 'user' as const,
      content: 'Test message',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockApiPost.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useSendChatMessage(), { wrapper });

    result.current.mutate({
      data: {
        projectId: mockProjectId,
        content: 'Test message',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(mockApiPost).toHaveBeenCalledWith('/chat/messages', {
      projectId: mockProjectId,
      content: 'Test message',
    });
  });

  it('invalidates chat messages query on success', async () => {
    const mockResponse = {
      id: 'msg-1',
      projectId: mockProjectId,
      role: 'user' as const,
      content: 'Test message',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockApiPost.mockResolvedValue(mockResponse);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSendChatMessage(), { wrapper });

    result.current.mutate({
      data: {
        projectId: mockProjectId,
        content: 'Test message',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify cache invalidation was called with correct query key
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['chat-messages', mockProjectId],
    });
  });

  it('calls custom onSuccess callback', async () => {
    const mockResponse = {
      id: 'msg-1',
      projectId: mockProjectId,
      role: 'user' as const,
      content: 'Test message',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockApiPost.mockResolvedValue(mockResponse);

    const onSuccessMock = vi.fn();

    const { result } = renderHook(
      () =>
        useSendChatMessage({
          mutationConfig: {
            onSuccess: onSuccessMock,
          },
        }),
      { wrapper }
    );

    result.current.mutate({
      data: {
        projectId: mockProjectId,
        content: 'Test message',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onSuccessMock).toHaveBeenCalledWith(
      mockResponse,
      { data: { projectId: mockProjectId, content: 'Test message' } },
      undefined
    );
  });

  it('handles mutation errors', async () => {
    mockApiPost.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useSendChatMessage(), { wrapper });

    result.current.mutate({
      data: {
        projectId: mockProjectId,
        content: 'Test message',
      },
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('calls custom onError callback', async () => {
    const mockError = new Error('API Error');
    mockApiPost.mockRejectedValue(mockError);

    const onErrorMock = vi.fn();

    const { result } = renderHook(
      () =>
        useSendChatMessage({
          mutationConfig: {
            onError: onErrorMock,
          },
        }),
      { wrapper }
    );

    result.current.mutate({
      data: {
        projectId: mockProjectId,
        content: 'Test message',
      },
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onErrorMock).toHaveBeenCalledTimes(1);
    const [error, variables] = onErrorMock.mock.calls[0];
    expect(error.message).toBe('API Error');
    expect(variables.data.projectId).toBe(mockProjectId);
    expect(variables.data.content).toBe('Test message');
  });

  it('calls custom onSettled callback', async () => {
    const mockResponse = {
      id: 'msg-1',
      projectId: mockProjectId,
      role: 'user' as const,
      content: 'Test message',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockApiPost.mockResolvedValue(mockResponse);

    const onSettledMock = vi.fn();

    const { result } = renderHook(
      () =>
        useSendChatMessage({
          mutationConfig: {
            onSettled: onSettledMock,
          },
        }),
      { wrapper }
    );

    result.current.mutate({
      data: {
        projectId: mockProjectId,
        content: 'Test message',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onSettledMock).toHaveBeenCalledTimes(1);
    const [data, error, variables] = onSettledMock.mock.calls[0];
    expect(data).toEqual(mockResponse);
    expect(error).toBeNull();
    expect(variables.data.projectId).toBe(mockProjectId);
    expect(variables.data.content).toBe('Test message');
  });

  it('can send multiple messages sequentially', async () => {
    const mockResponse1 = {
      id: 'msg-1',
      projectId: mockProjectId,
      role: 'user' as const,
      content: 'First message',
      createdAt: '2024-01-01T00:00:00Z',
    };

    const mockResponse2 = {
      id: 'msg-2',
      projectId: mockProjectId,
      role: 'user' as const,
      content: 'Second message',
      createdAt: '2024-01-01T00:01:00Z',
    };

    mockApiPost.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

    const { result } = renderHook(() => useSendChatMessage(), { wrapper });

    // Send first message
    result.current.mutate({
      data: {
        projectId: mockProjectId,
        content: 'First message',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockResponse1);

    // Send second message
    result.current.mutate({
      data: {
        projectId: mockProjectId,
        content: 'Second message',
      },
    });

    await waitFor(() => expect(result.current.data).toEqual(mockResponse2));

    expect(mockApiPost).toHaveBeenCalledTimes(2);
  });
});
