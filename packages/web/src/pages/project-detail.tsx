/**
 * Project Detail Page
 * Main view for individual project with pipeline status, milestones, and documents
 */

import { PipelineStatusVisualization } from "@/components/project/pipeline-status";
import { ProjectHeader } from "@/components/project/project-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { Suspense, use, useMemo } from "react";
import { Link, useParams } from "react-router-dom";

/**
 * Error component for project not found or fetch errors
 */
function ProjectError({ error }: { error: Error }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-destructive">Error Loading Project</h1>
        <p className="text-muted-foreground">{error.message}</p>
        <Link to="/" className="text-primary hover:underline inline-block">
          Return to Projects
        </Link>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for project detail page
 */
function ProjectDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Header skeleton */}
      <div className="p-6 border rounded-lg space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      {/* Pipeline status skeleton - simplified for loading state */}
      <div className="p-6 border rounded-lg">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      {/* Placeholder for milestones section */}
      <div className="p-6 border rounded-lg">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

/**
 * Project detail content component
 * Wrapped in Suspense boundary to handle async data fetching
 */
function ProjectDetailContent({ projectId }: { projectId: string }) {
  const api = useApi();

  // Create a promise for the project data
  // React 19's `use` hook will suspend until the promise resolves
  const projectPromise = useMemo(() => api.getProject(projectId), [api, projectId]);
  const response = use(projectPromise);

  if (!response.project) {
    throw new Error("Project not found");
  }

  const { project } = response;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <ProjectHeader
        name={project.name}
        description={project.description}
        pipelineStatus={project.pipelineStatus}
        createdAt={String(project.createdAt)}
      />

      <PipelineStatusVisualization currentStatus={project.pipelineStatus} />

      {/* Placeholder for milestone list (m6-002) */}
      <div className="p-6 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Milestones</h2>
        <p className="text-muted-foreground">Milestone list coming in m6-002...</p>
      </div>

      {/* Placeholder for documents section (m6-003) */}
      <div className="p-6 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Documents</h2>
        <p className="text-muted-foreground">Document viewer coming in m6-003...</p>
      </div>
    </div>
  );
}

/**
 * Project Detail Page
 * Main entry point for /projects/:id route
 */
export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return <ProjectError error={new Error("No project ID provided")} />;
  }

  return (
    <Suspense fallback={<ProjectDetailSkeleton />}>
      <ProjectDetailContent projectId={projectId} />
    </Suspense>
  );
}
