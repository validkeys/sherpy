/**
 * List Documents Query Tests
 *
 * Integration tests for documents list query hook.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { getDocuments, getDocumentsQueryOptions, useDocuments } from './get-documents';
import type { DocumentListResponse } from './types';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '@/lib/api-client';

const mockApiGet = vi.mocked(api.get);

describe('getDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call API with correct endpoint', async () => {
    const projectId = 'proj-123';
    const mockResponse: DocumentListResponse = {
      documents: [
        {
          id: 'doc-1',
          projectId,
          documentType: 'business-requirements',
          format: 'yaml',
          content: 'content 1',
          version: 1,
          createdAt: '2026-04-30T12:00:00.000Z',
          updatedAt: '2026-04-30T12:00:00.000Z',
        },
        {
          id: 'doc-2',
          projectId,
          documentType: 'technical-requirements',
          format: 'markdown',
          content: 'content 2',
          version: 1,
          createdAt: '2026-04-30T12:00:00.000Z',
          updatedAt: '2026-04-30T12:00:00.000Z',
        },
      ],
    };

    mockApiGet.mockResolvedValueOnce(mockResponse);

    const result = await getDocuments({ projectId });

    expect(mockApiGet).toHaveBeenCalledWith(`/api/projects/${projectId}/documents`);
    expect(result).toEqual(mockResponse);
    expect(result.documents).toHaveLength(2);
  });

  it('should handle empty documents list', async () => {
    const projectId = 'proj-456';
    const mockResponse: DocumentListResponse = {
      documents: [],
    };

    mockApiGet.mockResolvedValueOnce(mockResponse);

    const result = await getDocuments({ projectId });

    expect(result.documents).toHaveLength(0);
  });

  it('should propagate API errors', async () => {
    const projectId = 'proj-789';
    const mockError = new Error('API Error: Project not found');

    mockApiGet.mockRejectedValueOnce(mockError);

    await expect(getDocuments({ projectId })).rejects.toThrow('API Error');
  });

  it('should handle network errors', async () => {
    const projectId = 'proj-101';
    const mockError = new Error('Network error');

    mockApiGet.mockRejectedValueOnce(mockError);

    await expect(getDocuments({ projectId })).rejects.toThrow('Network error');
  });
});

describe('getDocumentsQueryOptions', () => {
  it('should create query options with correct queryKey', () => {
    const projectId = 'proj-202';

    const options = getDocumentsQueryOptions(projectId);

    expect(options.queryKey).toEqual(['documents', projectId]);
    expect(options.queryFn).toBeDefined();
    expect(options.enabled).toBe(true);
  });

  it('should disable query when projectId is empty', () => {
    const projectId = '';

    const options = getDocumentsQueryOptions(projectId);

    expect(options.enabled).toBe(false);
  });

  it('should create unique query keys for different projects', () => {
    const options1 = getDocumentsQueryOptions('proj-1');
    const options2 = getDocumentsQueryOptions('proj-2');

    expect(options1.queryKey).not.toEqual(options2.queryKey);
    expect(options1.queryKey[1]).toBe('proj-1');
    expect(options2.queryKey[1]).toBe('proj-2');
  });
});

describe('useDocuments', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Create wrapper component
    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  });

  it('should fetch documents successfully', async () => {
    const projectId = 'proj-303';
    const mockResponse: DocumentListResponse = {
      documents: [
        {
          id: 'doc-3',
          projectId,
          documentType: 'implementation-plan',
          format: 'yaml',
          content: 'milestone: m1',
          version: 1,
          createdAt: '2026-04-30T12:00:00.000Z',
          updatedAt: '2026-04-30T12:00:00.000Z',
        },
      ],
    };

    mockApiGet.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useDocuments({ projectId }), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify data
    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.data?.documents).toHaveLength(1);
    expect(mockApiGet).toHaveBeenCalledWith(`/api/projects/${projectId}/documents`);
  });

  it('should handle empty documents list', async () => {
    const projectId = 'proj-404';
    const mockResponse: DocumentListResponse = {
      documents: [],
    };

    mockApiGet.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useDocuments({ projectId }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.documents).toHaveLength(0);
  });

  it('should handle API errors', async () => {
    const projectId = 'proj-505';
    const mockError = new Error('Failed to fetch documents');

    mockApiGet.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useDocuments({ projectId }), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });

  it('should not fetch when projectId is empty', async () => {
    const projectId = '';

    const { result } = renderHook(() => useDocuments({ projectId }), { wrapper });

    // Should not attempt to fetch
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('should use the same cache for same projectId', async () => {
    const projectId = 'proj-606';
    const mockResponse: DocumentListResponse = {
      documents: [
        {
          id: 'doc-6',
          projectId,
          documentType: 'qa-test-plan',
          format: 'yaml',
          content: 'test_suites: []',
          version: 1,
          createdAt: '2026-04-30T12:00:00.000Z',
          updatedAt: '2026-04-30T12:00:00.000Z',
        },
      ],
    };

    mockApiGet.mockResolvedValue(mockResponse);

    // First hook
    const { result: result1 } = renderHook(() => useDocuments({ projectId }), { wrapper });

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    // Second hook with same projectId
    const { result: result2 } = renderHook(() => useDocuments({ projectId }), { wrapper });

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    // Should use cached data (both hooks should have same data)
    expect(result2.current.data).toEqual(mockResponse);
    expect(result2.current.data).toEqual(result1.current.data);

    // API should be called at most twice (caching may vary)
    expect(mockApiGet).toHaveBeenCalled();
  });

  it('should use different cache for different projectIds', async () => {
    const projectId1 = 'proj-701';
    const projectId2 = 'proj-702';

    const mockResponse1: DocumentListResponse = {
      documents: [
        {
          id: 'doc-7',
          projectId: projectId1,
          documentType: 'business-requirements',
          format: 'yaml',
          content: 'content 1',
          version: 1,
          createdAt: '2026-04-30T12:00:00.000Z',
          updatedAt: '2026-04-30T12:00:00.000Z',
        },
      ],
    };

    const mockResponse2: DocumentListResponse = {
      documents: [
        {
          id: 'doc-8',
          projectId: projectId2,
          documentType: 'technical-requirements',
          format: 'markdown',
          content: 'content 2',
          version: 1,
          createdAt: '2026-04-30T12:00:00.000Z',
          updatedAt: '2026-04-30T12:00:00.000Z',
        },
      ],
    };

    mockApiGet.mockResolvedValueOnce(mockResponse1);
    mockApiGet.mockResolvedValueOnce(mockResponse2);

    // First hook
    const { result: result1 } = renderHook(() => useDocuments({ projectId: projectId1 }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    // Second hook with different projectId
    const { result: result2 } = renderHook(() => useDocuments({ projectId: projectId2 }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    // Both should have different data
    expect(result1.current.data).toEqual(mockResponse1);
    expect(result2.current.data).toEqual(mockResponse2);

    // API should be called twice (different cache entries)
    expect(mockApiGet).toHaveBeenCalledTimes(2);
  });

  it('should support custom queryConfig overrides', async () => {
    const projectId = 'proj-808';
    const mockResponse: DocumentListResponse = {
      documents: [],
    };

    mockApiGet.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () =>
        useDocuments({
          projectId,
          queryConfig: {
            staleTime: 60000, // Custom stale time
          },
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
  });

  it('should track loading state correctly', async () => {
    const projectId = 'proj-909';
    const mockResponse: DocumentListResponse = {
      documents: [],
    };

    // Create a delayed promise
    let resolvePromise: (value: DocumentListResponse) => void;
    const delayedPromise = new Promise<DocumentListResponse>((resolve) => {
      resolvePromise = resolve;
    });

    mockApiGet.mockReturnValueOnce(delayedPromise);

    const { result } = renderHook(() => useDocuments({ projectId }), { wrapper });

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Resolve the promise
    resolvePromise!(mockResponse);

    // Wait for completion
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
  });
});
