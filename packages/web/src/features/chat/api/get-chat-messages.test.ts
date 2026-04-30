import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import {
  getChatMessages,
  getChatMessagesQueryOptions,
  useChatMessages,
} from './get-chat-messages';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('getChatMessages', () => {
  const mockProjectId = 'project-123';
  let mockApiGet: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const apiClient = await import('@/lib/api-client');
    mockApiGet = apiClient.api.get as any;
  });

  it('calls API with correct endpoint and params', async () => {
    const mockResponse = {
      data: [
        {
          id: 'msg-1',
          projectId: mockProjectId,
          role: 'user' as const,
          content: 'Hello',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
      meta: { total: 1, page: 1, pageSize: 20, hasMore: false },
    };

    mockApiGet.mockResolvedValue(mockResponse);

    const result = await getChatMessages({ projectId: mockProjectId, page: 1 });

    expect(mockApiGet).toHaveBeenCalledWith('/chat/messages', {
      params: { projectId: mockProjectId, page: 1 },
    });
    expect(result).toEqual(mockResponse);
  });

  it('uses default page value when not provided', async () => {
    const mockResponse = {
      data: [],
      meta: { total: 0, page: 1, pageSize: 20, hasMore: false },
    };

    mockApiGet.mockResolvedValue(mockResponse);

    await getChatMessages({ projectId: mockProjectId });

    expect(mockApiGet).toHaveBeenCalledWith('/chat/messages', {
      params: { projectId: mockProjectId, page: 1 },
    });
  });

  it('handles API errors', async () => {
    const mockError = new Error('Network error');
    mockApiGet.mockRejectedValue(mockError);

    await expect(getChatMessages({ projectId: mockProjectId })).rejects.toThrow('Network error');
  });
});

describe('getChatMessagesQueryOptions', () => {
  const mockProjectId = 'project-456';

  it('returns query options with correct query key (with page)', () => {
    const options = getChatMessagesQueryOptions({ projectId: mockProjectId, page: 2 });

    expect(options.queryKey).toEqual(['chat-messages', mockProjectId, { page: 2 }]);
    expect(options.queryFn).toBeDefined();
  });

  it('returns query options with correct query key (without page)', () => {
    const options = getChatMessagesQueryOptions({ projectId: mockProjectId });

    expect(options.queryKey).toEqual(['chat-messages', mockProjectId]);
    expect(options.queryFn).toBeDefined();
  });

  it('query function calls getChatMessages with correct params', async () => {
    const mockResponse = {
      data: [],
      meta: { total: 0, page: 1, pageSize: 20, hasMore: false },
    };

    const apiClient = await import('@/lib/api-client');
    const mockApiGet = apiClient.api.get as any;
    mockApiGet.mockResolvedValue(mockResponse);

    const options = getChatMessagesQueryOptions({ projectId: mockProjectId, page: 3 });
    const result = await options.queryFn();

    expect(result).toEqual(mockResponse);
  });
});

describe('useChatMessages', () => {
  const mockProjectId = 'project-789';
  let queryClient: QueryClient;
  let mockApiGet: ReturnType<typeof vi.fn>;

  const wrapper = ({ children }: { children: ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const apiClient = await import('@/lib/api-client');
    mockApiGet = apiClient.api.get as any;
  });

  it('fetches chat messages successfully', async () => {
    const mockResponse = {
      data: [
        {
          id: 'msg-1',
          projectId: mockProjectId,
          role: 'user' as const,
          content: 'Test message',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
      meta: { total: 1, page: 1, pageSize: 20, hasMore: false },
    };

    mockApiGet.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useChatMessages({ projectId: mockProjectId }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(mockApiGet).toHaveBeenCalledWith('/chat/messages', {
      params: { projectId: mockProjectId, page: 1 },
    });
  });

  it('handles query with page parameter', async () => {
    const mockResponse = {
      data: [],
      meta: { total: 0, page: 2, pageSize: 20, hasMore: false },
    };

    mockApiGet.mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useChatMessages({ projectId: mockProjectId, page: 2 }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiGet).toHaveBeenCalledWith('/chat/messages', {
      params: { projectId: mockProjectId, page: 2 },
    });
  });

  it('handles API errors', async () => {
    mockApiGet.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useChatMessages({ projectId: mockProjectId }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('respects custom query config', async () => {
    const mockResponse = {
      data: [],
      meta: { total: 0, page: 1, pageSize: 20, hasMore: false },
    };

    mockApiGet.mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () =>
        useChatMessages({
          projectId: mockProjectId,
          queryConfig: { enabled: false },
        }),
      { wrapper }
    );

    // Query should not run because enabled: false
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('updates when projectId changes', async () => {
    const mockResponse1 = {
      data: [
        {
          id: 'msg-1',
          projectId: 'project-a',
          role: 'user' as const,
          content: 'Message A',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
      meta: { total: 1, page: 1, pageSize: 20, hasMore: false },
    };

    const mockResponse2 = {
      data: [
        {
          id: 'msg-2',
          projectId: 'project-b',
          role: 'user' as const,
          content: 'Message B',
          createdAt: '2024-01-02T00:00:00Z',
        },
      ],
      meta: { total: 1, page: 1, pageSize: 20, hasMore: false },
    };

    mockApiGet.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

    const { result, rerender } = renderHook(
      ({ projectId }: { projectId: string }) => useChatMessages({ projectId }),
      {
        wrapper,
        initialProps: { projectId: 'project-a' },
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockResponse1);

    // Change project ID
    rerender({ projectId: 'project-b' });

    await waitFor(() => expect(result.current.data).toEqual(mockResponse2));
    expect(mockApiGet).toHaveBeenCalledTimes(2);
  });
});
