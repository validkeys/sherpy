/**
 * Documents API Integration Tests
 *
 * Comprehensive tests for all Documents API endpoints including:
 * - Generate document (POST)
 * - List documents (GET)
 * - Get document by type (GET)
 *
 * Tests cover success cases, error handling, 404 handling, and cache invalidation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, createElement } from 'react';
import { generateDocument, useGenerateDocument } from '../generate-document';
import { getDocuments, getDocumentsQueryOptions, useDocuments } from '../get-documents';
import { getDocument, getDocumentQueryOptions, useDocument } from '../get-document';
import type { Document } from '@sherpy/shared';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Documents API Integration Tests', () => {
  let queryClient: QueryClient;
  let mockApiGet: ReturnType<typeof vi.fn>;
  let mockApiPost: ReturnType<typeof vi.fn>;

  // Test wrapper with QueryClientProvider
  function createWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    };
  }

  // Mock document data
  const mockDocument: Document = {
    id: 'doc_123',
    projectId: 'proj_abc',
    documentType: 'business-requirements',
    format: 'yaml',
    content: 'project:\n  name: Test Project\n  goals:\n    - Goal 1',
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
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

  describe('generateDocument / useGenerateDocument', () => {
    it('generates document successfully', async () => {
      const mockResponse = { document: mockDocument };
      mockApiPost.mockResolvedValue(mockResponse);

      const input = {
        projectId: 'proj_abc',
        data: {
          documentType: 'business-requirements' as const,
          format: 'yaml' as const,
        },
      };

      const result = await generateDocument(input);

      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/projects/proj_abc/documents/generate',
        input.data
      );
      expect(result).toEqual(mockResponse);
    });

    it('validates input with Zod schema', async () => {
      const invalidInput = {
        projectId: 'proj_abc',
        data: {
          documentType: 'invalid-type' as any,
        },
      };

      await expect(generateDocument(invalidInput)).rejects.toThrow();
    });

    it('mutation hook invalidates documents cache on success', async () => {
      const mockResponse = { document: mockDocument };
      mockApiPost.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGenerateDocument(), {
        wrapper: createWrapper(),
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await waitFor(async () => {
        result.current.mutate({
          projectId: 'proj_abc',
          data: {
            documentType: 'business-requirements',
            format: 'yaml',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify cache invalidation for the project's documents
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents', 'proj_abc'] });
    });

    it('mutation hook calls custom onSuccess callback', async () => {
      const mockResponse = { document: mockDocument };
      mockApiPost.mockResolvedValue(mockResponse);
      const onSuccessMock = vi.fn();

      const { result } = renderHook(() => useGenerateDocument({ onSuccess: onSuccessMock }), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        result.current.mutate({
          projectId: 'proj_abc',
          data: {
            documentType: 'business-requirements',
            format: 'yaml',
          },
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
        data: expect.objectContaining({ documentType: 'business-requirements' }),
      });
    });

    it('handles API errors', async () => {
      const mockError = new Error('Failed to generate document');
      mockApiPost.mockRejectedValue(mockError);

      const { result } = renderHook(() => useGenerateDocument(), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        result.current.mutate({
          projectId: 'proj_abc',
          data: {
            documentType: 'business-requirements',
            format: 'yaml',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('getDocuments / useDocuments', () => {
    it('fetches documents list successfully', async () => {
      const mockResponse = {
        documents: [mockDocument],
      };
      mockApiGet.mockResolvedValue(mockResponse);

      const result = await getDocuments({ projectId: 'proj_abc' });

      expect(mockApiGet).toHaveBeenCalledWith('/api/projects/proj_abc/documents');
      expect(result).toEqual(mockResponse);
    });

    it('query hook returns documents data', async () => {
      const mockResponse = {
        documents: [mockDocument],
      };
      mockApiGet.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useDocuments({ projectId: 'proj_abc' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it('returns empty array for project with no documents', async () => {
      const mockResponse = {
        documents: [],
      };
      mockApiGet.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useDocuments({ projectId: 'proj_empty' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.documents).toEqual([]);
    });

    it('query hook handles errors', async () => {
      const mockError = new Error('Failed to fetch documents');
      mockApiGet.mockRejectedValue(mockError);

      const { result } = renderHook(() => useDocuments({ projectId: 'proj_abc' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('query is disabled when projectId is not provided', () => {
      const { result } = renderHook(() => useDocuments({ projectId: '' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApiGet).not.toHaveBeenCalled();
    });

    it('queryOptions factory creates correct query key', () => {
      const options = getDocumentsQueryOptions('proj_abc');

      expect(options.queryKey).toEqual(['documents', 'proj_abc']);
    });
  });

  describe('getDocument / useDocument', () => {
    it('fetches document by type successfully', async () => {
      const mockResponse = { document: mockDocument };
      mockApiGet.mockResolvedValue(mockResponse);

      const result = await getDocument({
        projectId: 'proj_abc',
        documentType: 'business-requirements',
      });

      expect(mockApiGet).toHaveBeenCalledWith(
        '/api/projects/proj_abc/documents/business-requirements'
      );
      expect(result).toEqual(mockResponse);
    });

    it('query hook returns document data', async () => {
      const mockResponse = { document: mockDocument };
      mockApiGet.mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () =>
          useDocument({
            projectId: 'proj_abc',
            documentType: 'business-requirements',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it('handles 404 gracefully when document does not exist', async () => {
      const mockError = new Error('Document not found');
      mockApiGet.mockRejectedValue(mockError);

      const { result } = renderHook(
        () =>
          useDocument({
            projectId: 'proj_abc',
            documentType: 'technical-requirements',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('query is disabled when projectId is not provided', () => {
      const { result } = renderHook(
        () =>
          useDocument({
            projectId: '',
            documentType: 'business-requirements',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApiGet).not.toHaveBeenCalled();
    });

    it('query is disabled when documentType is not provided', () => {
      const { result } = renderHook(
        () =>
          useDocument({
            projectId: 'proj_abc',
            documentType: '' as any,
          }),
        {
          wrapper: createWrapper(),
        }
      );

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApiGet).not.toHaveBeenCalled();
    });

    it('queryOptions factory creates correct query key', () => {
      const options = getDocumentQueryOptions('proj_abc', 'business-requirements');

      expect(options.queryKey).toEqual(['documents', 'proj_abc', 'business-requirements']);
    });
  });

  describe('Cache Management Integration', () => {
    it('generate mutation invalidates documents list, then list refetches', async () => {
      const generateResponse = { document: mockDocument };
      const listResponse = { documents: [mockDocument] };

      mockApiPost.mockResolvedValue(generateResponse);
      mockApiGet.mockResolvedValue(listResponse);

      // First, set up the list query
      const { result: listResult } = renderHook(() => useDocuments({ projectId: 'proj_abc' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(listResult.current.isSuccess).toBe(true);
      });

      // Clear the get call count
      mockApiGet.mockClear();

      // Now generate a new document
      const { result: generateResult } = renderHook(() => useGenerateDocument(), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        generateResult.current.mutate({
          projectId: 'proj_abc',
          data: {
            documentType: 'technical-requirements',
            format: 'yaml',
          },
        });
      });

      await waitFor(() => {
        expect(generateResult.current.isSuccess).toBe(true);
      });

      // List should refetch automatically
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalled();
      });
    });

    it('different projects use separate cache entries', async () => {
      const mockResponse1 = { documents: [mockDocument] };
      const mockResponse2 = {
        documents: [{ ...mockDocument, id: 'doc_456', projectId: 'proj_xyz' }],
      };

      mockApiGet.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      // First project
      const { result: result1 } = renderHook(() => useDocuments({ projectId: 'proj_abc' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second project
      const { result: result2 } = renderHook(() => useDocuments({ projectId: 'proj_xyz' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // Both should have been called with different project IDs
      expect(mockApiGet).toHaveBeenCalledTimes(2);
      expect(mockApiGet).toHaveBeenCalledWith('/api/projects/proj_abc/documents');
      expect(mockApiGet).toHaveBeenCalledWith('/api/projects/proj_xyz/documents');
    });
  });
});
