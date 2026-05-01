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

    const mockMessage = {
      id: 'msg-1',
      projectId: mockProjectId,
      role: 'user' as const,
      content: 'Hello, assistant!',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockApiPost.mockResolvedValue({ message: mockMessage });

    const result = await sendChatMessage({ data: mockInput });

    expect(mockApiPost).toHaveBeenCalledWith(`/api/projects/${mockProjectId}/chat/messages`, {
      content: 'Hello, assistant!',
      role: 'user',
    });
    expect(result).toEqual(mockMessage);
  });

  it('defaults to user role when not specified', async () => {
    const mockInput = {
      projectId: mockProjectId,
      content: 'Test message',
    };

    const mockMessage = {
      id: 'msg-2',
      projectId: mockProjectId,
      role: 'user' as const,
      content: 'Test message',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockApiPost.mockResolvedValue({ message: mockMessage });

    const result = await sendChatMessage({ data: mockInput });

    expect(mockApiPost).toHaveBeenCalledWith(`/api/projects/${mockProjectId}/chat/messages`, {
      content: 'Test message',
      role: 'user',
    });
    expect(result.role).toBe('user');
    expect(result.content).toBe('Test message');
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
    const mockMessage = {
      id: 'msg-1',
      projectId: mockProjectId,
      role: 'user' as const,
      content: 'Test message',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockApiPost.mockResolvedValue({ message: mockMessage });

    const { result } = renderHook(() => useSendChatMessage(), { wrapper });

    result.current.mutate({
      data: {
        projectId: mockProjectId,
        content: 'Test message',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockMessage);
    expect(mockApiPost).toHaveBeenCalledWith(`/api/projects/${mockProjectId}/chat/messages`, {
      content: 'Test message',
      role: 'user',
    });
  });

  it('invalidates chat messages query on success', async () => {
    const mockMessage = {
      id: 'msg-1',
      projectId: mockProjectId,
      role: 'user' as const,
      content: 'Test message',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockApiPost.mockResolvedValue({ message: mockMessage });

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
      queryKey: ['chat-messages', mockProjectId, { cursor: undefined, limit: undefined }],
    });
  });

  it('calls custom onSuccess callback', async () => {
    const mockMessage = {
      id: 'msg-1',
      projectId: mockProjectId,
      role: 'user' as const,
      content: 'Test message',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockApiPost.mockResolvedValue({ message: mockMessage });

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
      mockMessage,
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
    const mockMessage = {
      id: 'msg-1',
      projectId: mockProjectId,
      role: 'user' as const,
      content: 'Test message',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockApiPost.mockResolvedValue({ message: mockMessage });

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
    expect(data).toEqual(mockMessage);
    expect(error).toBeNull();
    expect(variables.data.projectId).toBe(mockProjectId);
    expect(variables.data.content).toBe('Test message');
  });

  it('can send multiple messages sequentially', async () => {
    const mockMessage1 = {
      id: 'msg-1',
      projectId: mockProjectId,
      role: 'user' as const,
      content: 'First message',
      createdAt: '2024-01-01T00:00:00Z',
    };

    const mockMessage2 = {
      id: 'msg-2',
      projectId: mockProjectId,
      role: 'user' as const,
      content: 'Second message',
      createdAt: '2024-01-01T00:01:00Z',
    };

    mockApiPost
      .mockResolvedValueOnce({ message: mockMessage1 })
      .mockResolvedValueOnce({ message: mockMessage2 });

    const { result } = renderHook(() => useSendChatMessage(), { wrapper });

    // Send first message
    result.current.mutate({
      data: {
        projectId: mockProjectId,
        content: 'First message',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMessage1);

    // Send second message
    result.current.mutate({
      data: {
        projectId: mockProjectId,
        content: 'Second message',
      },
    });

    await waitFor(() => expect(result.current.data).toEqual(mockMessage2));

    expect(mockApiPost).toHaveBeenCalledTimes(2);
  });
});
