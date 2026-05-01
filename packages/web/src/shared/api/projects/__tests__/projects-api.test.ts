/**
 * Projects API Integration Tests
 *
 * Comprehensive tests for all Projects API endpoints including:
 * - Create project (POST)
 * - List projects (GET with filters)
 * - Get project by ID (GET)
 * - Update project (PATCH)
 *
 * Tests cover success cases, error handling, and cache invalidation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { createProject, useCreateProject } from '../create-project';
import { getProjects, getProjectsQueryOptions, useProjects } from '../get-projects';
import { getProject, getProjectQueryOptions, useProject } from '../get-project';
import { updateProject, useUpdateProject } from '../update-project';
import type { Project } from '@sherpy/shared';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('Projects API Integration Tests', () => {
  let queryClient: QueryClient;
  let mockApiGet: ReturnType<typeof vi.fn>;
  let mockApiPost: ReturnType<typeof vi.fn>;
  let mockApiPatch: ReturnType<typeof vi.fn>;

  // Test wrapper with QueryClientProvider
  function createWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    };
  }

  // Mock project data
  const mockProject: Project = {
    id: 'proj_123',
    slug: 'test-project',
    name: 'Test Project',
    description: 'A test project for integration tests',
    pipelineStatus: 'intake',
    tags: ['test', 'integration'],
    priority: 'high',
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
    mockApiPatch = apiClient.api.patch as any;
  });

  describe('createProject / useCreateProject', () => {
    it('creates project successfully', async () => {
      const mockResponse = { project: mockProject };
      mockApiPost.mockResolvedValue(mockResponse);

      const input = {
        name: 'Test Project',
        priority: 'high' as const,
        tags: ['test'],
      };

      const result = await createProject(input);

      expect(mockApiPost).toHaveBeenCalledWith('/api/projects', input);
      expect(result).toEqual(mockResponse);
    });

    it('validates input with Zod schema', async () => {
      const invalidInput = {
        name: '', // Empty name should fail validation
      };

      await expect(createProject(invalidInput as any)).rejects.toThrow();
    });

    it('mutation hook invalidates projects cache on success', async () => {
      const mockResponse = { project: mockProject };
      mockApiPost.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      // Spy on cache invalidation
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await waitFor(async () => {
        result.current.mutate({
          name: 'New Project',
          priority: 'high',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify cache invalidation
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
    });

    it('mutation hook calls custom onSuccess callback', async () => {
      const mockResponse = { project: mockProject };
      mockApiPost.mockResolvedValue(mockResponse);
      const onSuccessMock = vi.fn();

      const { result } = renderHook(() => useCreateProject({ onSuccess: onSuccessMock }), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        result.current.mutate({
          name: 'New Project',
          priority: 'high',
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
        name: 'New Project',
        priority: 'high',
      });
    });

    it('handles API errors', async () => {
      const mockError = new Error('Failed to create project');
      mockApiPost.mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        result.current.mutate({
          name: 'New Project',
          priority: 'high',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('getProjects / useProjects', () => {
    it('fetches projects list successfully', async () => {
      const mockResponse = {
        projects: [mockProject],
      };
      mockApiGet.mockResolvedValue(mockResponse);

      const result = await getProjects();

      expect(mockApiGet).toHaveBeenCalledWith('/api/projects', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('fetches projects with filter parameters', async () => {
      const mockResponse = {
        projects: [mockProject],
      };
      mockApiGet.mockResolvedValue(mockResponse);

      const params = {
        pipelineStatus: ['intake' as const, 'business-requirements' as const],
        priority: ['high' as const],
        limit: 10,
      };

      await getProjects(params);

      expect(mockApiGet).toHaveBeenCalledWith('/api/projects', { params });
    });

    it('query hook returns projects data', async () => {
      const mockResponse = {
        projects: [mockProject],
      };
      mockApiGet.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it('different filter params use different cache entries', async () => {
      const mockResponse1 = { projects: [mockProject] };
      const mockResponse2 = {
        projects: [{ ...mockProject, id: 'proj_456', name: 'Another Project' }],
      };

      mockApiGet.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      // First query with no params
      const { result: result1 } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second query with different params
      const { result: result2 } = renderHook(
        () => useProjects({ params: { pipelineStatus: ['intake'] } }),
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
      const mockError = new Error('Failed to fetch projects');
      mockApiGet.mockRejectedValue(mockError);

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('queryOptions factory creates correct query key', () => {
      const params = { pipelineStatus: ['intake' as const], limit: 10 };
      const options = getProjectsQueryOptions(params);

      expect(options.queryKey).toEqual(['projects', params]);
    });

    it('queryOptions factory creates correct query key with undefined params', () => {
      const options = getProjectsQueryOptions();

      expect(options.queryKey).toEqual(['projects', {}]);
    });
  });

  describe('getProject / useProject', () => {
    it('fetches project by ID successfully', async () => {
      const mockResponse = { project: mockProject };
      mockApiGet.mockResolvedValue(mockResponse);

      const result = await getProject('proj_123');

      expect(mockApiGet).toHaveBeenCalledWith('/api/projects/proj_123');
      expect(result).toEqual(mockResponse);
    });

    it('query hook returns project data', async () => {
      const mockResponse = { project: mockProject };
      mockApiGet.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useProject({ projectId: 'proj_123' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it('handles 404 errors gracefully', async () => {
      const mockError = new Error('Project not found');
      mockApiGet.mockRejectedValue(mockError);

      const { result } = renderHook(() => useProject({ projectId: 'nonexistent' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('query is disabled when projectId is not provided', () => {
      const { result } = renderHook(() => useProject({ projectId: '' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApiGet).not.toHaveBeenCalled();
    });

    it('queryOptions factory creates correct query key', () => {
      const options = getProjectQueryOptions('proj_123');

      expect(options.queryKey).toEqual(['projects', 'proj_123']);
    });
  });

  describe('updateProject / useUpdateProject', () => {
    it('updates project successfully', async () => {
      const mockResponse = {
        project: { ...mockProject, name: 'Updated Project' },
      };
      mockApiPatch.mockResolvedValue(mockResponse);

      const variables = {
        projectId: 'proj_123',
        data: { name: 'Updated Project' },
      };

      const result = await updateProject(variables);

      expect(mockApiPatch).toHaveBeenCalledWith('/api/projects/proj_123', { name: 'Updated Project' });
      expect(result).toEqual(mockResponse);
    });

    it('validates input with Zod schema', async () => {
      const invalidInput = {
        projectId: 'proj_123',
        data: { name: '' }, // Empty name should fail validation
      };

      await expect(updateProject(invalidInput as any)).rejects.toThrow();
    });

    it('mutation hook invalidates both list and detail caches', async () => {
      const mockResponse = {
        project: { ...mockProject, pipelineStatus: 'business-requirements' as const },
      };
      mockApiPatch.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createWrapper(),
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await waitFor(async () => {
        result.current.mutate({
          projectId: 'proj_123',
          data: { pipelineStatus: 'business-requirements' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify both cache invalidations
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects', 'proj_123'] });
    });

    it('updates pipelineStatus for workflow state persistence', async () => {
      const mockResponse = {
        project: { ...mockProject, pipelineStatus: 'technical-requirements' as const },
      };
      mockApiPatch.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        result.current.mutate({
          projectId: 'proj_123',
          data: { pipelineStatus: 'technical-requirements' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiPatch).toHaveBeenCalledWith('/api/projects/proj_123', {
        pipelineStatus: 'technical-requirements',
      });
    });

    it('mutation hook calls custom onSuccess callback', async () => {
      const mockResponse = {
        project: { ...mockProject, name: 'Updated' },
      };
      mockApiPatch.mockResolvedValue(mockResponse);
      const onSuccessMock = vi.fn();

      const { result } = renderHook(() => useUpdateProject({ onSuccess: onSuccessMock }), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        result.current.mutate({
          projectId: 'proj_123',
          data: { name: 'Updated' },
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
        projectId: 'proj_123',
        data: { name: 'Updated' },
      });
    });

    it('handles API errors', async () => {
      const mockError = new Error('Failed to update project');
      mockApiPatch.mockRejectedValue(mockError);

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        result.current.mutate({
          projectId: 'proj_123',
          data: { name: 'Updated' },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('Cache Management Integration', () => {
    it('create mutation invalidates list, then list refetches', async () => {
      const createResponse = { project: mockProject };
      const listResponse = { projects: [mockProject] };

      mockApiPost.mockResolvedValue(createResponse);
      mockApiGet.mockResolvedValue(listResponse);

      // First, set up the list query
      const { result: listResult } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(listResult.current.isSuccess).toBe(true);
      });

      // Clear the get call count
      mockApiGet.mockClear();

      // Now create a new project
      const { result: createResult } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        createResult.current.mutate({
          name: 'New Project',
          priority: 'high',
        });
      });

      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true);
      });

      // List should refetch automatically
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalled();
      });
    });

    it('update mutation invalidates both list and detail caches', async () => {
      const updateResponse = {
        project: { ...mockProject, name: 'Updated Name' },
      };

      mockApiPatch.mockResolvedValue(updateResponse);

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createWrapper(),
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await waitFor(async () => {
        result.current.mutate({
          projectId: 'proj_123',
          data: { name: 'Updated Name' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Both caches should be invalidated
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects', 'proj_123'] });
    });
  });
});
