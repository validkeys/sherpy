/**
 * Generate Document Mutation Tests
 *
 * Integration tests for document generation mutation hook.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { generateDocument, useGenerateDocument } from './generate-document';
import type { DocumentResponse, GenerateDocumentInput } from './types';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    post: vi.fn(),
  },
}));

import { api } from '@/lib/api-client';

const mockApiPost = vi.mocked(api.post);

describe('generateDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate input and call API with correct parameters', async () => {
    const projectId = 'proj-123';
    const data: GenerateDocumentInput = {
      documentType: 'business-requirements',
      format: 'yaml',
      metadata: { author: 'test-user' },
    };

    const mockResponse: DocumentResponse = {
      document: {
        id: 'doc-456',
        projectId,
        documentType: 'business-requirements',
        format: 'yaml',
        content: '# Business Requirements\n\nContent here...',
        version: 1,
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:00:00.000Z',
      },
    };

    mockApiPost.mockResolvedValueOnce(mockResponse);

    const result = await generateDocument({ projectId, data });

    expect(mockApiPost).toHaveBeenCalledWith(`/api/projects/${projectId}/documents/generate`, data);
    expect(result).toEqual(mockResponse);
  });

  it('should validate input with only required fields', async () => {
    const projectId = 'proj-123';
    const data: GenerateDocumentInput = {
      documentType: 'technical-requirements',
    };

    const mockResponse: DocumentResponse = {
      document: {
        id: 'doc-789',
        projectId,
        documentType: 'technical-requirements',
        format: 'markdown',
        content: 'Content...',
        version: 1,
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:00:00.000Z',
      },
    };

    mockApiPost.mockResolvedValueOnce(mockResponse);

    const result = await generateDocument({ projectId, data });

    expect(result).toEqual(mockResponse);
  });

  it('should reject invalid document type', async () => {
    const projectId = 'proj-123';
    const data = {
      documentType: 'invalid-type',
    } as GenerateDocumentInput;

    await expect(generateDocument({ projectId, data })).rejects.toThrow();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('should reject invalid format', async () => {
    const projectId = 'proj-123';
    const data = {
      documentType: 'business-requirements',
      format: 'pdf',
    } as unknown as GenerateDocumentInput;

    await expect(generateDocument({ projectId, data })).rejects.toThrow();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('should propagate API errors', async () => {
    const projectId = 'proj-123';
    const data: GenerateDocumentInput = {
      documentType: 'business-requirements',
    };

    const mockError = new Error('API Error: Generation failed');
    mockApiPost.mockRejectedValueOnce(mockError);

    await expect(generateDocument({ projectId, data })).rejects.toThrow('API Error');
  });
});

describe('useGenerateDocument', () => {
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

  it('should successfully generate document and invalidate cache', async () => {
    const projectId = 'proj-123';
    const data: GenerateDocumentInput = {
      documentType: 'implementation-plan',
      format: 'yaml',
    };

    const mockResponse: DocumentResponse = {
      document: {
        id: 'doc-101',
        projectId,
        documentType: 'implementation-plan',
        format: 'yaml',
        content: 'milestone: m1\nname: Setup',
        version: 1,
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:00:00.000Z',
      },
    };

    mockApiPost.mockResolvedValueOnce(mockResponse);

    // Spy on invalidateQueries
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useGenerateDocument(), { wrapper });

    // Trigger mutation
    result.current.mutate({ projectId, data });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify API was called
    expect(mockApiPost).toHaveBeenCalledWith(`/api/projects/${projectId}/documents/generate`, data);

    // Verify cache was invalidated
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['documents', projectId],
    });

    // Verify response data
    expect(result.current.data).toEqual(mockResponse);
  });

  it('should call onSuccess callback', async () => {
    const projectId = 'proj-123';
    const data: GenerateDocumentInput = {
      documentType: 'qa-test-plan',
    };

    const mockResponse: DocumentResponse = {
      document: {
        id: 'doc-202',
        projectId,
        documentType: 'qa-test-plan',
        format: 'yaml',
        content: 'test_suites: []',
        version: 1,
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:00:00.000Z',
      },
    };

    mockApiPost.mockResolvedValueOnce(mockResponse);

    const onSuccess = vi.fn();

    const { result } = renderHook(
      () =>
        useGenerateDocument({
          onSuccess,
        }),
      { wrapper }
    );

    result.current.mutate({ projectId, data });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify onSuccess was called
    expect(onSuccess).toHaveBeenCalled();
    const calls = onSuccess.mock.calls[0];
    expect(calls[0]).toEqual(mockResponse); // data
    expect(calls[1]).toEqual({ projectId, data }); // variables
  });

  it('should handle errors and call onError callback', async () => {
    const projectId = 'proj-123';
    const data: GenerateDocumentInput = {
      documentType: 'business-requirements',
    };

    const mockError = new Error('Document generation failed');
    mockApiPost.mockRejectedValueOnce(mockError);

    const onError = vi.fn();

    const { result } = renderHook(
      () =>
        useGenerateDocument({
          onError,
        }),
      { wrapper }
    );

    result.current.mutate({ projectId, data });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Verify onError was called
    expect(onError).toHaveBeenCalled();
    const calls = onError.mock.calls[0];
    expect(calls[0]).toEqual(mockError); // error
    expect(calls[1]).toEqual({ projectId, data }); // variables

    // Verify error is exposed
    expect(result.current.error).toEqual(mockError);
  });

  it('should track loading state', async () => {
    const projectId = 'proj-123';
    const data: GenerateDocumentInput = {
      documentType: 'delivery-timeline',
    };

    const mockResponse: DocumentResponse = {
      document: {
        id: 'doc-303',
        projectId,
        documentType: 'delivery-timeline',
        format: 'yaml',
        content: 'timeline: []',
        version: 1,
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:00:00.000Z',
      },
    };

    // Create a delayed promise to test loading state
    let resolvePromise: (value: DocumentResponse) => void;
    const delayedPromise = new Promise<DocumentResponse>((resolve) => {
      resolvePromise = resolve;
    });

    mockApiPost.mockReturnValueOnce(delayedPromise);

    const { result } = renderHook(() => useGenerateDocument(), { wrapper });

    expect(result.current.isPending).toBe(false);

    // Trigger mutation
    result.current.mutate({ projectId, data });

    // Should be pending immediately
    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    // Resolve the promise
    resolvePromise!(mockResponse);

    // Should complete
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should support mutateAsync for async/await usage', async () => {
    const projectId = 'proj-123';
    const data: GenerateDocumentInput = {
      documentType: 'executive-summary',
    };

    const mockResponse: DocumentResponse = {
      document: {
        id: 'doc-404',
        projectId,
        documentType: 'executive-summary',
        format: 'markdown',
        content: '# Executive Summary',
        version: 1,
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:00:00.000Z',
      },
    };

    mockApiPost.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useGenerateDocument(), { wrapper });

    // Use mutateAsync for async/await pattern
    const response = await result.current.mutateAsync({ projectId, data });

    expect(response).toEqual(mockResponse);

    // Wait for success state to update
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
