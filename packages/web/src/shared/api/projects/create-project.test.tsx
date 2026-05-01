/**
 * Tests for Create Project Mutation
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api-client';
import { createProject, useCreateProject } from './create-project';
import type { ProjectResponse } from './types';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    post: vi.fn(),
  },
}));

describe('createProject fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call API with validated data', async () => {
    const mockResponse: ProjectResponse = {
      project: {
        id: '123',
        slug: 'test-project',
        name: 'Test Project',
        description: 'Test description',
        pipelineStatus: 'intake',
        assignedPeople: [],
        tags: ['test'],
        priority: 'medium',
        createdAt: '2026-04-30T00:00:00Z',
        updatedAt: '2026-04-30T00:00:00Z',
      },
    };

    vi.mocked(api.post).mockResolvedValue(mockResponse);

    const input = {
      name: 'Test Project',
      slug: 'test-project',
      tags: ['test'],
      priority: 'medium' as const,
    };

    const result = await createProject(input);

    expect(api.post).toHaveBeenCalledWith('/api/projects', input);
    expect(result).toEqual(mockResponse);
  });

  it('should reject invalid input', async () => {
    const invalidInput = {
      name: '', // Empty name should fail validation
    };

    await expect(createProject(invalidInput as any)).rejects.toThrow();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('should reject invalid slug format', async () => {
    const invalidInput = {
      name: 'Test Project',
      slug: 'Invalid_Slug', // Uppercase and underscore not allowed
    };

    await expect(createProject(invalidInput)).rejects.toThrow();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('useCreateProject hook', () => {
  let queryClient: QueryClient;

  function createWrapper() {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create project successfully', async () => {
    const mockResponse: ProjectResponse = {
      project: {
        id: '123',
        slug: 'test-project',
        name: 'Test Project',
        description: undefined,
        pipelineStatus: 'intake',
        assignedPeople: [],
        tags: [],
        priority: 'medium',
        createdAt: '2026-04-30T00:00:00Z',
        updatedAt: '2026-04-30T00:00:00Z',
      },
    };

    vi.mocked(api.post).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'Test Project',
      priority: 'medium',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(api.post).toHaveBeenCalledWith('/api/projects', expect.objectContaining({
      name: 'Test Project',
      priority: 'medium',
    }));
  });

  it('should invalidate projects cache on success', async () => {
    const mockResponse: ProjectResponse = {
      project: {
        id: '123',
        slug: 'test-project',
        name: 'Test Project',
        description: undefined,
        pipelineStatus: 'intake',
        assignedPeople: [],
        tags: [],
        priority: 'medium',
        createdAt: '2026-04-30T00:00:00Z',
        updatedAt: '2026-04-30T00:00:00Z',
      },
    };

    vi.mocked(api.post).mockResolvedValue(mockResponse);

    const wrapper = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateProject(), { wrapper });

    result.current.mutate({
      name: 'Test Project',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
  });

  it('should call custom onSuccess callback', async () => {
    const mockResponse: ProjectResponse = {
      project: {
        id: '123',
        slug: 'test-project',
        name: 'Test Project',
        description: undefined,
        pipelineStatus: 'intake',
        assignedPeople: [],
        tags: [],
        priority: 'medium',
        createdAt: '2026-04-30T00:00:00Z',
        updatedAt: '2026-04-30T00:00:00Z',
      },
    };

    vi.mocked(api.post).mockResolvedValue(mockResponse);

    const onSuccess = vi.fn();

    const { result } = renderHook(
      () => useCreateProject({ onSuccess }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({
      name: 'Test Project',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onSuccess).toHaveBeenCalledWith(
      mockResponse,
      { name: 'Test Project' },
      undefined
    );
  });

  it('should handle API errors', async () => {
    const mockError = new Error('API Error');
    vi.mocked(api.post).mockRejectedValue(mockError);

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'Test Project',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(mockError);
  });
});
