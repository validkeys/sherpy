/**
 * Get Document by Type Query Tests
 *
 * Integration tests for single document query hook.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { getDocument, getDocumentQueryOptions, useDocument } from './get-document';
import type { DocumentResponse, DocumentType } from './types';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '@/lib/api-client';

const mockApiGet = vi.mocked(api.get);

describe('getDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call API with correct endpoint', async () => {
    const projectId = 'proj-123';
    const documentType: DocumentType = 'business-requirements';

    const mockResponse: DocumentResponse = {
      document: {
        id: 'doc-1',
        projectId,
        documentType,
        format: 'yaml',
        content: '# Business Requirements\n\nContent here...',
        version: 1,
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:00:00.000Z',
      },
    };

    mockApiGet.mockResolvedValueOnce(mockResponse);

    const result = await getDocument({ projectId, documentType });

    expect(mockApiGet).toHaveBeenCalledWith(
      `/api/projects/${projectId}/documents/${documentType}`
    );
    expect(result).toEqual(mockResponse);
    expect(result.document.documentType).toBe(documentType);
  });

  it('should fetch different document types', async () => {
    const projectId = 'proj-456';
    const documentTypes: DocumentType[] = [
      'technical-requirements',
      'implementation-plan',
      'qa-test-plan',
    ];

    for (const documentType of documentTypes) {
      const mockResponse: DocumentResponse = {
        document: {
          id: `doc-${documentType}`,
          projectId,
          documentType,
          format: 'yaml',
          content: `Content for ${documentType}`,
          version: 1,
          createdAt: '2026-04-30T12:00:00.000Z',
          updatedAt: '2026-04-30T12:00:00.000Z',
        },
      };

      mockApiGet.mockResolvedValueOnce(mockResponse);

      const result = await getDocument({ projectId, documentType });

      expect(result.document.documentType).toBe(documentType);
    }
  });

  it('should handle 404 errors for non-existent documents', async () => {
    const projectId = 'proj-789';
    const documentType: DocumentType = 'business-requirements';

    const mockError = new Error('Document not found');
    Object.assign(mockError, { status: 404 });

    mockApiGet.mockRejectedValueOnce(mockError);

    await expect(getDocument({ projectId, documentType })).rejects.toThrow(
      'Document not found'
    );
  });

  it('should propagate API errors', async () => {
    const projectId = 'proj-101';
    const documentType: DocumentType = 'implementation-plan';
    const mockError = new Error('API Error: Internal server error');

    mockApiGet.mockRejectedValueOnce(mockError);

    await expect(getDocument({ projectId, documentType })).rejects.toThrow('API Error');
  });
});

describe('getDocumentQueryOptions', () => {
  it('should create query options with correct queryKey', () => {
    const projectId = 'proj-202';
    const documentType: DocumentType = 'business-requirements';

    const options = getDocumentQueryOptions(projectId, documentType);

    expect(options.queryKey).toEqual(['documents', projectId, documentType]);
    expect(options.queryFn).toBeDefined();
    expect(options.enabled).toBe(true);
  });

  it('should disable query when projectId is empty', () => {
    const projectId = '';
    const documentType: DocumentType = 'business-requirements';

    const options = getDocumentQueryOptions(projectId, documentType);

    expect(options.enabled).toBe(false);
  });

  it('should create unique query keys for different document types', () => {
    const projectId = 'proj-303';

    const options1 = getDocumentQueryOptions(projectId, 'business-requirements');
    const options2 = getDocumentQueryOptions(projectId, 'technical-requirements');

    expect(options1.queryKey).not.toEqual(options2.queryKey);
    expect(options1.queryKey[2]).toBe('business-requirements');
    expect(options2.queryKey[2]).toBe('technical-requirements');
  });

  it('should create unique query keys for different projects', () => {
    const documentType: DocumentType = 'implementation-plan';

    const options1 = getDocumentQueryOptions('proj-1', documentType);
    const options2 = getDocumentQueryOptions('proj-2', documentType);

    expect(options1.queryKey).not.toEqual(options2.queryKey);
    expect(options1.queryKey[1]).toBe('proj-1');
    expect(options2.queryKey[1]).toBe('proj-2');
  });
});

describe('useDocument', () => {
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

  it('should fetch document successfully', async () => {
    const projectId = 'proj-404';
    const documentType: DocumentType = 'business-requirements';

    const mockResponse: DocumentResponse = {
      document: {
        id: 'doc-4',
        projectId,
        documentType,
        format: 'yaml',
        content: 'business_goals:\n  - Goal 1\n  - Goal 2',
        version: 1,
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:00:00.000Z',
      },
    };

    mockApiGet.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useDocument({ projectId, documentType }), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify data
    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.data?.document.content).toContain('business_goals');
    expect(mockApiGet).toHaveBeenCalledWith(
      `/api/projects/${projectId}/documents/${documentType}`
    );
  });

  it('should handle 404 errors gracefully', async () => {
    const projectId = 'proj-505';
    const documentType: DocumentType = 'technical-requirements';

    const mockError = new Error('Document not found');
    Object.assign(mockError, { status: 404 });

    mockApiGet.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useDocument({ projectId, documentType }), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
    expect((result.current.error as any).message).toBe('Document not found');
  });

  it('should handle API errors', async () => {
    const projectId = 'proj-606';
    const documentType: DocumentType = 'implementation-plan';

    const mockError = new Error('Failed to fetch document');
    mockApiGet.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useDocument({ projectId, documentType }), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });

  it('should not fetch when projectId is empty', async () => {
    const projectId = '';
    const documentType: DocumentType = 'business-requirements';

    const { result } = renderHook(() => useDocument({ projectId, documentType }), { wrapper });

    // Should not attempt to fetch
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('should cache documents independently by type', async () => {
    const projectId = 'proj-707';

    const mockResponse1: DocumentResponse = {
      document: {
        id: 'doc-7a',
        projectId,
        documentType: 'business-requirements',
        format: 'yaml',
        content: 'business content',
        version: 1,
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:00:00.000Z',
      },
    };

    const mockResponse2: DocumentResponse = {
      document: {
        id: 'doc-7b',
        projectId,
        documentType: 'technical-requirements',
        format: 'markdown',
        content: 'technical content',
        version: 1,
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:00:00.000Z',
      },
    };

    mockApiGet.mockResolvedValueOnce(mockResponse1);
    mockApiGet.mockResolvedValueOnce(mockResponse2);

    // First hook for business-requirements
    const { result: result1 } = renderHook(
      () => useDocument({ projectId, documentType: 'business-requirements' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    // Second hook for technical-requirements
    const { result: result2 } = renderHook(
      () => useDocument({ projectId, documentType: 'technical-requirements' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    // Both should have different data
    expect(result1.current.data).toEqual(mockResponse1);
    expect(result2.current.data).toEqual(mockResponse2);
    expect(result1.current.data?.document.content).not.toEqual(
      result2.current.data?.document.content
    );

    // API should be called twice (different cache entries)
    expect(mockApiGet).toHaveBeenCalledTimes(2);
  });

  it('should support custom queryConfig overrides', async () => {
    const projectId = 'proj-808';
    const documentType: DocumentType = 'qa-test-plan';

    const mockResponse: DocumentResponse = {
      document: {
        id: 'doc-8',
        projectId,
        documentType,
        format: 'yaml',
        content: 'test_suites: []',
        version: 1,
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:00:00.000Z',
      },
    };

    mockApiGet.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () =>
        useDocument({
          projectId,
          documentType,
          queryConfig: {
            staleTime: 120000, // Custom stale time
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
    const documentType: DocumentType = 'delivery-timeline';

    const mockResponse: DocumentResponse = {
      document: {
        id: 'doc-9',
        projectId,
        documentType,
        format: 'yaml',
        content: 'timeline: []',
        version: 1,
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:00:00.000Z',
      },
    };

    // Create a delayed promise
    let resolvePromise: (value: DocumentResponse) => void;
    const delayedPromise = new Promise<DocumentResponse>((resolve) => {
      resolvePromise = resolve;
    });

    mockApiGet.mockReturnValueOnce(delayedPromise);

    const { result } = renderHook(() => useDocument({ projectId, documentType }), { wrapper });

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

  it('should handle multiple versions (latest returned)', async () => {
    const projectId = 'proj-1010';
    const documentType: DocumentType = 'implementation-plan';

    // API returns latest version (version 3)
    const mockResponse: DocumentResponse = {
      document: {
        id: 'doc-10',
        projectId,
        documentType,
        format: 'yaml',
        content: 'milestone: m3\nversion: latest',
        version: 3, // Latest version
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T14:00:00.000Z',
      },
    };

    mockApiGet.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useDocument({ projectId, documentType }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should return the latest version
    expect(result.current.data?.document.version).toBe(3);
    expect(result.current.data?.document.content).toContain('version: latest');
  });
});
