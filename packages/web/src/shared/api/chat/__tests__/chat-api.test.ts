/**
 * Chat Messages API Integration Tests
 *
 * Comprehensive tests for all Chat Messages API endpoints including:
 * - Send message (POST)
 * - Get messages (GET with pagination)
 *
 * Tests cover success cases, error handling, pagination, and cache invalidation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { sendMessage, useSendMessage } from '../send-message';
import { getMessages, getMessagesQueryOptions, useMessages } from '../get-messages';
import type { ChatMessage } from '../types';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Chat Messages API Integration Tests', () => {
  let queryClient: QueryClient;
  let mockApiGet: ReturnType<typeof vi.fn>;
  let mockApiPost: ReturnType<typeof vi.fn>;

  // Test wrapper with QueryClientProvider
  function createWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    };
  }

  // Mock message data
  const mockUserMessage: ChatMessage = {
    id: 'msg_123',
    projectId: 'proj_abc',
    role: 'user',
    content: 'Hello, assistant!',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockAssistantMessage: ChatMessage = {
    id: 'msg_456',
    projectId: 'proj_abc',
    role: 'assistant',
    content: 'Hello! How can I help you today?',
    createdAt: '2024-01-01T00:01:00Z',
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });

    // Get mocked API methods
    const apiClient = await import('@/lib/api-client');
    mockApiGet = apiClient.api.get as any;
    mockApiPost = apiClient.api.post as any;
  });

  describe('sendMessage / useSendMessage', () => {
    it('sends message successfully', async () => {
      const mockResponse = { message: mockUserMessage };
      mockApiPost.mockResolvedValue(mockResponse);

      const input = {
        projectId: 'proj_abc',
        data: {
          content: 'Hello, assistant!',
          role: 'user' as const,
        },
      };

      const result = await sendMessage(input);

      expect(mockApiPost).toHaveBeenCalledWith('/api/projects/proj_abc/chat/messages', input.data);
      expect(result).toEqual(mockResponse);
    });

    it('validates input with Zod schema', async () => {
      const invalidInput = {
        projectId: 'proj_abc',
        data: {
          content: '', // Empty content should fail validation
          role: 'user' as const,
        },
      };

      await expect(sendMessage(invalidInput)).rejects.toThrow();
    });

    it('mutation hook invalidates chat messages cache on success', async () => {
      const mockResponse = { message: mockUserMessage };
      mockApiPost.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSendMessage(), {
        wrapper: createWrapper(),
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await waitFor(async () => {
        result.current.mutate({
          projectId: 'proj_abc',
          data: { content: 'Test message', role: 'user' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify cache invalidation
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['chat', 'proj_abc', 'messages'] });
    });

    it('mutation hook calls custom onSuccess callback', async () => {
      const mockResponse = { message: mockUserMessage };
      mockApiPost.mockResolvedValue(mockResponse);
      const onSuccessMock = vi.fn();

      const { result } = renderHook(() => useSendMessage({ onSuccess: onSuccessMock }), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        result.current.mutate({
          projectId: 'proj_abc',
          data: { content: 'Test message', role: 'user' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify onSuccess was called with correct arguments
      expect(onSuccessMock).toHaveBeenCalled();
      const callArgs = onSuccessMock.mock.calls[0];
      expect(callArgs[0]).toEqual(mockResponse);
      expect(callArgs[1]).toMatchObject({
        projectId: 'proj_abc',
        data: expect.objectContaining({ content: 'Test message' }),
      });
    });

    it('handles API errors', async () => {
      const mockError = new Error('Failed to send message');
      mockApiPost.mockRejectedValue(mockError);

      const { result } = renderHook(() => useSendMessage(), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        result.current.mutate({
          projectId: 'proj_abc',
          data: { content: 'Test message', role: 'user' },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('getMessages / useMessages', () => {
    it('fetches messages successfully', async () => {
      const mockResponse = {
        messages: [mockUserMessage, mockAssistantMessage],
        hasMore: false,
      };
      mockApiGet.mockResolvedValue(mockResponse);

      const result = await getMessages('proj_abc');

      expect(mockApiGet).toHaveBeenCalledWith('/api/projects/proj_abc/chat/messages', {
        params: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('fetches messages with pagination parameters', async () => {
      const mockResponse = {
        messages: [mockUserMessage],
        hasMore: true,
        nextCursor: 'cursor_123',
      };
      mockApiGet.mockResolvedValue(mockResponse);

      const params = {
        limit: 20,
        cursor: 'cursor_abc',
      };

      await getMessages('proj_abc', params);

      expect(mockApiGet).toHaveBeenCalledWith('/api/projects/proj_abc/chat/messages', {
        params,
      });
    });

    it('query hook returns messages data', async () => {
      const mockResponse = {
        messages: [mockUserMessage, mockAssistantMessage],
        hasMore: false,
      };
      mockApiGet.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMessages({ projectId: 'proj_abc' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it('different pagination params use different cache entries', async () => {
      const mockResponse1 = {
        messages: [mockUserMessage],
        hasMore: true,
        nextCursor: 'cursor_page2',
      };
      const mockResponse2 = {
        messages: [mockAssistantMessage],
        hasMore: false,
      };

      mockApiGet.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      // First query with limit
      const { result: result1 } = renderHook(
        () => useMessages({ projectId: 'proj_abc', params: { limit: 10 } }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second query with cursor
      const { result: result2 } = renderHook(
        () =>
          useMessages({ projectId: 'proj_abc', params: { limit: 10, cursor: 'cursor_page2' } }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // Both should have been called
      expect(mockApiGet).toHaveBeenCalledTimes(2);
      expect(result1.current.data).toEqual(mockResponse1);
      expect(result2.current.data).toEqual(mockResponse2);
    });

    it('query hook handles errors', async () => {
      const mockError = new Error('Failed to fetch messages');
      mockApiGet.mockRejectedValue(mockError);

      const { result } = renderHook(() => useMessages({ projectId: 'proj_abc' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('query is disabled when projectId is not provided', () => {
      const { result } = renderHook(() => useMessages({ projectId: '' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApiGet).not.toHaveBeenCalled();
    });

    it('queryOptions factory creates correct query key', () => {
      const params = { limit: 20, cursor: 'cursor_abc' };
      const options = getMessagesQueryOptions('proj_abc', params);

      expect(options.queryKey).toEqual(['chat', 'proj_abc', 'messages', params]);
    });

    it('queryOptions factory creates correct query key with undefined params', () => {
      const options = getMessagesQueryOptions('proj_abc');

      expect(options.queryKey).toEqual(['chat', 'proj_abc', 'messages', {}]);
    });
  });

  describe('Pagination Behavior', () => {
    it('handles paginated message loading', async () => {
      const page1Response = {
        messages: [mockUserMessage],
        hasMore: true,
        nextCursor: 'cursor_page2',
      };

      const page2Response = {
        messages: [mockAssistantMessage],
        hasMore: false,
      };

      mockApiGet.mockResolvedValueOnce(page1Response).mockResolvedValueOnce(page2Response);

      // Load first page
      const { result: result1 } = renderHook(
        () => useMessages({ projectId: 'proj_abc', params: { limit: 1 } }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      expect(result1.current.data?.hasMore).toBe(true);
      expect(result1.current.data?.nextCursor).toBe('cursor_page2');

      // Load second page
      const { result: result2 } = renderHook(
        () =>
          useMessages({
            projectId: 'proj_abc',
            params: { limit: 1, cursor: 'cursor_page2' },
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      expect(result2.current.data?.hasMore).toBe(false);
      expect(result2.current.data?.messages).toHaveLength(1);
    });

    it('returns empty messages for project with no conversation history', async () => {
      const mockResponse = {
        messages: [],
        hasMore: false,
      };
      mockApiGet.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMessages({ projectId: 'proj_new' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.messages).toEqual([]);
      expect(result.current.data?.hasMore).toBe(false);
    });
  });

  describe('Cache Management Integration', () => {
    it('send mutation invalidates messages cache, then messages refetch', async () => {
      const sendResponse = { message: mockUserMessage };
      const messagesResponse = {
        messages: [mockUserMessage],
        hasMore: false,
      };

      mockApiPost.mockResolvedValue(sendResponse);
      mockApiGet.mockResolvedValue(messagesResponse);

      // First, set up the messages query
      const { result: messagesResult } = renderHook(
        () => useMessages({ projectId: 'proj_abc' }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(messagesResult.current.isSuccess).toBe(true);
      });

      // Clear the get call count
      mockApiGet.mockClear();

      // Now send a new message
      const { result: sendResult } = renderHook(() => useSendMessage(), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        sendResult.current.mutate({
          projectId: 'proj_abc',
          data: { content: 'New message', role: 'user' },
        });
      });

      await waitFor(() => {
        expect(sendResult.current.isSuccess).toBe(true);
      });

      // Messages should refetch automatically
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalled();
      });
    });

    it('different projects use separate cache entries', async () => {
      const mockResponse1 = {
        messages: [mockUserMessage],
        hasMore: false,
      };
      const mockResponse2 = {
        messages: [{ ...mockUserMessage, id: 'msg_789', projectId: 'proj_xyz' }],
        hasMore: false,
      };

      mockApiGet.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      // First project
      const { result: result1 } = renderHook(
        () => useMessages({ projectId: 'proj_abc' }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second project
      const { result: result2 } = renderHook(
        () => useMessages({ projectId: 'proj_xyz' }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // Both should have been called with different project IDs
      expect(mockApiGet).toHaveBeenCalledTimes(2);
      expect(mockApiGet).toHaveBeenCalledWith('/api/projects/proj_abc/chat/messages', {
        params: undefined,
      });
      expect(mockApiGet).toHaveBeenCalledWith('/api/projects/proj_xyz/chat/messages', {
        params: undefined,
      });
    });
  });
});
