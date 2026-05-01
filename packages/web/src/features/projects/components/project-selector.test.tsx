/**
 * ProjectSelector Component Tests
 *
 * Tests for the project selection UI including:
 * - Rendering project cards
 * - Loading states
 * - Error states
 * - Navigation
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { ProjectSelector } from './project-selector';
import type { Project } from '@/shared/api/projects/types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/shared/api/projects/get-projects', () => ({
  useProjects: vi.fn(),
}));

import { useProjects } from '@/shared/api/projects/get-projects';

const mockProjects: Project[] = [
  {
    id: 'project-1',
    slug: 'project-one',
    name: 'Project One',
    description: 'First test project',
    pipelineStatus: 'intake',
    assignedPeople: [],
    tags: ['test', 'demo'],
    priority: 'high',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'project-2',
    slug: 'project-two',
    name: 'Project Two',
    description: 'Second test project',
    pipelineStatus: 'business-requirements',
    assignedPeople: [],
    tags: ['urgent'],
    priority: 'critical',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

describe('ProjectSelector', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders loading state', () => {
    vi.mocked(useProjects).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<ProjectSelector />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error state with retry button', async () => {
    const mockRefetch = vi.fn();
    vi.mocked(useProjects).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      refetch: mockRefetch,
    } as any);

    render(<ProjectSelector />);

    expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /try again/i });
    await waitFor(() => retryButton.click());

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders project cards with metadata', () => {
    vi.mocked(useProjects).mockReturnValue({
      data: { projects: mockProjects },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<ProjectSelector />);

    expect(screen.getByText('Project One')).toBeInTheDocument();
    expect(screen.getByText('First test project')).toBeInTheDocument();
    expect(screen.getByText('Project Two')).toBeInTheDocument();
    expect(screen.getByText('Second test project')).toBeInTheDocument();
  });

  it('renders create new project card', () => {
    vi.mocked(useProjects).mockReturnValue({
      data: { projects: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<ProjectSelector />);

    expect(screen.getByText('Create New Project')).toBeInTheDocument();
  });

  it('navigates to project when card is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useProjects).mockReturnValue({
      data: { projects: mockProjects },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<ProjectSelector />);

    const projectCard = screen.getByText('Project One').closest('.cursor-pointer') as HTMLElement;
    await user.click(projectCard);

    expect(mockNavigate).toHaveBeenCalledWith('/projects/project-1');
  });

  it('calls onCreateNew callback when provided', async () => {
    const user = userEvent.setup();
    const onCreateNew = vi.fn();
    vi.mocked(useProjects).mockReturnValue({
      data: { projects: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<ProjectSelector onCreateNew={onCreateNew} />);

    const createCard = screen.getByText('Create New Project').closest('.cursor-pointer') as HTMLElement;
    await user.click(createCard);

    expect(onCreateNew).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to /projects/new when create clicked without callback', async () => {
    const user = userEvent.setup();
    vi.mocked(useProjects).mockReturnValue({
      data: { projects: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<ProjectSelector />);

    const createCard = screen.getByText('Create New Project').closest('.cursor-pointer') as HTMLElement;
    await user.click(createCard);

    expect(mockNavigate).toHaveBeenCalledWith('/projects/new');
  });

  it('shows empty state message when no projects exist', () => {
    vi.mocked(useProjects).mockReturnValue({
      data: { projects: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<ProjectSelector />);

    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
  });

  it('displays priority with correct styling', () => {
    vi.mocked(useProjects).mockReturnValue({
      data: { projects: mockProjects },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<ProjectSelector />);

    const criticalPriority = screen.getByText('critical');
    expect(criticalPriority).toHaveClass('text-red-600');

    const highPriority = screen.getByText('high');
    expect(highPriority).toHaveClass('text-orange-600');
  });

  it('displays tags with overflow handling', () => {
    const projectWithManyTags: Project = {
      ...mockProjects[0],
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    };

    vi.mocked(useProjects).mockReturnValue({
      data: { projects: [projectWithManyTags] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<ProjectSelector />);

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });
});
