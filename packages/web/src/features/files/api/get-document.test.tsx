/**
 * Tests for Get Document API
 */

import { api } from '@/lib/api-client';
import { ApiError } from '@/shared/types/api';
import { createTestQueryClient, renderHook, waitFor } from '@/test/utils';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Document } from '../types';
import { DocumentType } from '../types';
import { getDocument, getDocumentQueryOptions, useDocument } from './get-document';

vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockDocument: Document = {
  id: 'doc-1',
  projectId: 'project-1',
  documentType: DocumentType.BUSINESS_REQUIREMENTS,
  format: 'yaml',
  content: 'key: value\nrequirements:\n  - item1\n  - item2',
  version: 1,
  createdAt: '2026-04-30T00:00:00Z',
  updatedAt: '2026-04-30T00:00:00Z',
};

describe('getDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call correct API endpoint with document type', async () => {
    vi.mocked(api.get).mockResolvedValue(mockDocument);

    const result = await getDocument({
      projectId: 'project-1',
      documentType: DocumentType.BUSINESS_REQUIREMENTS,
    });

    expect(api.get).toHaveBeenCalledWith(
      '/api/projects/project-1/documents/business-requirements'
    );
    expect(result).toEqual(mockDocument);
  });

  it('should handle API errors', async () => {
    const error = new Error('API Error');
    vi.mocked(api.get).mockRejectedValue(error);

    await expect(
      getDocument({
        projectId: 'project-1',
        documentType: DocumentType.BUSINESS_REQUIREMENTS,
      })
    ).rejects.toThrow('API Error');
  });

  it('should handle 404 not found error', async () => {
    const error = new ApiError('Document not found', 404, { message: 'Not found' });
    vi.mocked(api.get).mockRejectedValue(error);

    await expect(
      getDocument({
        projectId: 'project-1',
        documentType: DocumentType.MILESTONES,
      })
    ).rejects.toThrow('Document not found');
  });
});

describe('getDocumentQueryOptions', () => {
  it('should create query options with correct query key', () => {
    const options = getDocumentQueryOptions('project-1', DocumentType.TECHNICAL_REQUIREMENTS);

    expect(options.queryKey).toEqual([
      'projects',
      'project-1',
      'documents',
      'technical-requirements',
    ]);
    expect(options.queryFn).toBeDefined();
  });
});

describe('useDocument', () => {
  function createWrapper() {
    const queryClient = createTestQueryClient();
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch document successfully', async () => {
    vi.mocked(api.get).mockResolvedValue(mockDocument);

    const { result } = renderHook(
      () =>
        useDocument({
          projectId: 'project-1',
          documentType: DocumentType.BUSINESS_REQUIREMENTS,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockDocument);
    expect(api.get).toHaveBeenCalledWith(
      '/api/projects/project-1/documents/business-requirements'
    );
  });

  it('should handle error state', async () => {
    const error = new Error('Network error');
    vi.mocked(api.get).mockRejectedValue(error);

    const { result } = renderHook(
      () =>
        useDocument({
          projectId: 'project-1',
          documentType: DocumentType.BUSINESS_REQUIREMENTS,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });

  it('should handle 404 not found', async () => {
    const error = new ApiError('Not found', 404, {});
    vi.mocked(api.get).mockRejectedValue(error);

    const { result } = renderHook(
      () =>
        useDocument({
          projectId: 'project-1',
          documentType: DocumentType.DELIVERY_TIMELINE,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });

  it('should accept custom query config', async () => {
    vi.mocked(api.get).mockResolvedValue(mockDocument);

    const { result } = renderHook(
      () =>
        useDocument({
          projectId: 'project-1',
          documentType: DocumentType.BUSINESS_REQUIREMENTS,
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
