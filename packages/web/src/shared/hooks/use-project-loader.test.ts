/**
 * Project Loader Hook Tests
 *
 * Tests for the useProjectLoader hook including:
 * - Loading projects by ID
 * - State updates (currentProjectIdAtom)
 * - URL parameter support
 * - Error handling
 * - Retry functionality
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectLoader } from './use-project-loader';
import type { Project } from '@/shared/api/projects/types';

const mockSetCurrentProjectId = vi.fn();
const mockRefetch = vi.fn();
const mockSearchParams = new URLSearchParams();

// Mock dependencies
vi.mock('jotai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jotai')>();
  return {
    ...actual,
    useSetAtom: () => mockSetCurrentProjectId,
  };
});

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, vi.fn()],
}));

vi.mock('@/shared/api/projects/get-project', () => ({
  useProject: vi.fn(),
}));

import { useProject } from '@/shared/api/projects/get-project';

const mockProject: Project = {
  id: 'project-1',
  slug: 'test-project',
  name: 'Test Project',
  description: 'A test project',
  pipelineStatus: 'intake',
  assignedPeople: [],
  tags: ['test'],
  priority: 'medium',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('useProjectLoader', () => {
  beforeEach(() => {
    mockSetCurrentProjectId.mockClear();
    mockRefetch.mockClear();
    mockSearchParams.delete('projectId');
  });

  it('loads project when projectId is provided', () => {
    vi.mocked(useProject).mockReturnValue({
      data: { project: mockProject },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useProjectLoader({ projectId: 'project-1' }));

    expect(result.current.project).toEqual({ project: mockProject });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.currentProjectId).toBe('project-1');
  });

  it('updates currentProjectIdAtom when project loads', () => {
    vi.mocked(useProject).mockReturnValue({
      data: { project: mockProject },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    renderHook(() => useProjectLoader({ projectId: 'project-1' }));

    expect(mockSetCurrentProjectId).toHaveBeenCalledWith('project-1');
  });

  it('returns loading state while fetching', () => {
    vi.mocked(useProject).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useProjectLoader({ projectId: 'project-1' }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.project).toBeUndefined();
  });

  it('returns error state when fetch fails', () => {
    const error = new Error('Failed to load project');
    vi.mocked(useProject).mockReturnValue({
      data: undefined,
      isLoading: false,
      error,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useProjectLoader({ projectId: 'project-1' }));

    expect(result.current.error).toEqual(error);
    expect(result.current.project).toBeUndefined();
  });

  it('loads project from URL params when enabled', () => {
    mockSearchParams.set('projectId', 'url-project-123');

    vi.mocked(useProject).mockReturnValue({
      data: { project: mockProject },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useProjectLoader({ enableUrlParams: true }));

    expect(result.current.currentProjectId).toBe('url-project-123');
    expect(mockSetCurrentProjectId).toHaveBeenCalledWith('url-project-123');
  });

  it('does not load from URL params when disabled', () => {
    mockSearchParams.set('projectId', 'url-project-123');

    vi.mocked(useProject).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useProjectLoader({ enableUrlParams: false }));

    expect(result.current.currentProjectId).toBe(null);
  });

  it('prioritizes explicit projectId over URL params', () => {
    mockSearchParams.set('projectId', 'url-project-123');

    vi.mocked(useProject).mockReturnValue({
      data: { project: mockProject },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() =>
      useProjectLoader({
        projectId: 'explicit-project-456',
        enableUrlParams: true,
      })
    );

    expect(result.current.currentProjectId).toBe('explicit-project-456');
    expect(mockSetCurrentProjectId).toHaveBeenCalledWith('explicit-project-456');
  });

  it('calls onProjectLoaded callback when project loads', async () => {
    const onProjectLoaded = vi.fn();

    vi.mocked(useProject).mockReturnValue({
      data: { project: mockProject },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    renderHook(() =>
      useProjectLoader({
        projectId: 'project-1',
        onProjectLoaded,
      })
    );

    await waitFor(() => {
      expect(onProjectLoaded).toHaveBeenCalledWith('project-1');
    });
  });

  it('calls onError callback when error occurs', async () => {
    const onError = vi.fn();
    const error = new Error('Load failed');

    vi.mocked(useProject).mockReturnValue({
      data: undefined,
      isLoading: false,
      error,
      refetch: mockRefetch,
    } as any);

    renderHook(() =>
      useProjectLoader({
        projectId: 'project-1',
        onError,
      })
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it('provides loadProject function to update current project', () => {
    vi.mocked(useProject).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useProjectLoader());

    result.current.loadProject('new-project-789');

    expect(mockSetCurrentProjectId).toHaveBeenCalledWith('new-project-789');
  });

  it('provides retry function to refetch after error', () => {
    vi.mocked(useProject).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useProjectLoader({ projectId: 'project-1' }));

    result.current.retry();

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('provides clearProject function to clear current project', () => {
    vi.mocked(useProject).mockReturnValue({
      data: { project: mockProject },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useProjectLoader({ projectId: 'project-1' }));

    result.current.clearProject();

    expect(mockSetCurrentProjectId).toHaveBeenCalledWith(null);
  });

  it('disables query when no projectId is available', () => {
    const mockUseProject = vi.mocked(useProject);

    renderHook(() => useProjectLoader());

    expect(mockUseProject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: '',
        queryConfig: expect.objectContaining({
          enabled: false,
        }),
      })
    );
  });

  it('enables query when projectId is available', () => {
    const mockUseProject = vi.mocked(useProject);

    mockUseProject.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    renderHook(() => useProjectLoader({ projectId: 'project-1' }));

    expect(mockUseProject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        queryConfig: expect.objectContaining({
          enabled: true,
        }),
      })
    );
  });

  it('handles project ID changes', () => {
    vi.mocked(useProject).mockReturnValue({
      data: { project: mockProject },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { rerender } = renderHook(({ projectId }) => useProjectLoader({ projectId }), {
      initialProps: { projectId: 'project-1' },
    });

    expect(mockSetCurrentProjectId).toHaveBeenCalledWith('project-1');

    mockSetCurrentProjectId.mockClear();

    rerender({ projectId: 'project-2' });

    expect(mockSetCurrentProjectId).toHaveBeenCalledWith('project-2');
  });

  it('does not call onProjectLoaded when project is not loaded', () => {
    const onProjectLoaded = vi.fn();

    vi.mocked(useProject).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    } as any);

    renderHook(() =>
      useProjectLoader({
        projectId: 'project-1',
        onProjectLoaded,
      })
    );

    expect(onProjectLoaded).not.toHaveBeenCalled();
  });

  it('does not call onError when there is no error', () => {
    const onError = vi.fn();

    vi.mocked(useProject).mockReturnValue({
      data: { project: mockProject },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    renderHook(() =>
      useProjectLoader({
        projectId: 'project-1',
        onError,
      })
    );

    expect(onError).not.toHaveBeenCalled();
  });
});
