/**
 * Tests for Get Documents API
 */

import { api } from '@/lib/api-client';
import { createTestQueryClient, renderHook, waitFor } from '@/test/utils';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Document } from '../types';
import { getDocuments, getDocumentsQueryOptions, useDocuments } from './get-documents';

vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    projectId: 'project-1',
    documentType: 'business-requirements',
    format: 'yaml',
    content: 'key: value',
    version: 1,
    createdAt: '2026-04-30T00:00:00Z',
    updatedAt: '2026-04-30T00:00:00Z',
  },
  {
    id: 'doc-2',
    projectId: 'project-1',
    documentType: 'technical-requirements',
    format: 'yaml',
    content: 'requirement: spec',
    version: 1,
    createdAt: '2026-04-30T00:00:00Z',
    updatedAt: '2026-04-30T00:00:00Z',
  },
];

describe('getDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call correct API endpoint and unwrap response', async () => {
    vi.mocked(api.get).mockResolvedValue({ documents: mockDocuments });

    const result = await getDocuments({ projectId: 'project-1' });

    expect(api.get).toHaveBeenCalledWith('/api/projects/project-1/documents');
    expect(result).toEqual(mockDocuments);
  });

  it('should handle API errors', async () => {
    const error = new Error('API Error');
    vi.mocked(api.get).mockRejectedValue(error);

    await expect(getDocuments({ projectId: 'project-1' })).rejects.toThrow('API Error');
  });
});

describe('getDocumentsQueryOptions', () => {
  it('should create query options with correct query key', () => {
    const options = getDocumentsQueryOptions('project-1');

    expect(options.queryKey).toEqual(['projects', 'project-1', 'documents']);
    expect(options.queryFn).toBeDefined();
  });
});

describe('useDocuments', () => {
  function createWrapper() {
    const queryClient = createTestQueryClient();
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch documents successfully', async () => {
    vi.mocked(api.get).mockResolvedValue({ documents: mockDocuments });

    const { result } = renderHook(() => useDocuments({ projectId: 'project-1' }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockDocuments);
    expect(api.get).toHaveBeenCalledWith('/api/projects/project-1/documents');
  });

  it('should handle error state', async () => {
    const error = new Error('Network error');
    vi.mocked(api.get).mockRejectedValue(error);

    const { result } = renderHook(() => useDocuments({ projectId: 'project-1' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });

  it('should accept custom query config', async () => {
    vi.mocked(api.get).mockResolvedValue({ documents: mockDocuments });

    const { result } = renderHook(
      () =>
        useDocuments({
          projectId: 'project-1',
          queryConfig: { enabled: false },
        }),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
