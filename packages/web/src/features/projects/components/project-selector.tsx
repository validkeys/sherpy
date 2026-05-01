/**
 * ProjectSelector Component
 *
 * Displays a grid of project cards for selecting existing projects.
 * Includes a "Create New Project" option and handles loading/error states.
 *
 * Features:
 * - Grid layout with project cards
 * - Project metadata display (name, status, priority)
 * - "Create New Project" card
 * - Loading skeleton state
 * - Error state with retry
 */

import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';
import { useProjects } from '@/shared/api/projects/get-projects';
import type { Project } from '@/shared/api/projects/types';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
        <CardDescription>{project.description || 'No description'}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status:</span>
            <span className="font-medium capitalize">
              {project.pipelineStatus.replace(/-/g, ' ')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Priority:</span>
            <span className={`font-medium capitalize ${getPriorityColor(project.priority)}`}>
              {project.priority}
            </span>
          </div>
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {project.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded"
                >
                  {tag}
                </span>
              ))}
              {project.tags.length > 3 && (
                <span className="px-2 py-1 text-xs text-muted-foreground">
                  +{project.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    critical: 'text-red-600',
    high: 'text-orange-600',
    medium: 'text-yellow-600',
    low: 'text-green-600',
  };
  return colors[priority] || '';
}

function CreateNewProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg hover:border-primary border-dashed flex items-center justify-center min-h-[200px]"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center gap-4 pt-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <p className="text-lg font-semibold">Create New Project</p>
        <p className="text-sm text-muted-foreground text-center">
          Start a new project from scratch
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded mb-2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-destructive"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Failed to load projects</h3>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
      </div>
      <Button onClick={onRetry}>Try Again</Button>
    </div>
  );
}

interface ProjectSelectorProps {
  onCreateNew?: () => void;
}

export function ProjectSelector({ onCreateNew }: ProjectSelectorProps) {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useProjects();

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    } else {
      navigate('/projects/new');
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'An unexpected error occurred'}
        onRetry={() => refetch()}
      />
    );
  }

  const projects = data?.projects ?? [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Select a Project</h1>
        <p className="text-muted-foreground">
          Choose an existing project or create a new one to get started
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CreateNewProjectCard onClick={handleCreateNew} />

        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => handleProjectClick(project.id)}
          />
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center mt-12 text-muted-foreground">
          <p>No projects yet. Create your first project to get started!</p>
        </div>
      )}
    </div>
  );
}
