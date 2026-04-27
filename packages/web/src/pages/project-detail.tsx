/**
 * Project Detail Page
 * Main view for individual project with pipeline status, milestones, and documents
 */

import { PipelineStatusVisualization } from "@/components/project/pipeline-status";
import { ProjectHeader } from "@/components/project/project-header";
import { MilestoneList } from "@/components/project/milestone-list";
import { DocumentList } from "@/components/project/document-list";
import { DocumentViewer } from "@/components/project/document-viewer";
import { ChatAssistantUIProvider } from "@/components/chat/chat-assistant-ui-provider";
import { ProjectChatPanel } from "@/components/chat/project-chat-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { useProjectEvents } from "@/hooks/use-project-events";
import { Suspense, use, useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import type { Document, PipelineStatus, GetProjectResponse } from "@sherpy/shared";
import { useDiagnostic } from "@/hooks/use-diagnostic";
import { SuspenseCache } from "@/lib/suspense-cache";

// Enterprise-grade cache with TTL and LRU eviction
export const projectCache = new SuspenseCache<GetProjectResponse>({
  maxSize: 50,           // Max 50 projects cached
  ttl: 5 * 60 * 1000,   // 5 minute TTL
});

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
 *
 * Uses React 19 Suspense with enterprise-grade promise caching:
 * - Promises cached at module level to survive Suspense remounts
 * - Automatic TTL expiration (5 minutes)
 * - LRU eviction (max 50 entries)
 * - Auto-cleanup of rejected promises for retry
 *
 * @param projectId - UUID of the project to display
 * @throws {Error} When project is not found (caught by ErrorBoundary)
 */
function ProjectDetailContent({ projectId }: { projectId: string }) {
  const api = useApi();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { latestEvent } = useProjectEvents({ projectId });

  // Derive refreshKey from latestEvent (no useEffect needed)
  const derivedRefreshKey = latestEvent ? refreshKey + 1 : refreshKey;

  // Update refreshKey when latestEvent changes
  useEffect(() => {
    if (latestEvent && derivedRefreshKey !== refreshKey) {
      console.log("[DIAG] ProjectDetailContent: latestEvent changed, invalidating cache");
      setRefreshKey(derivedRefreshKey);
      // Invalidate cache for this project to force refetch
      projectCache.invalidate(projectId);
    }
  }, [latestEvent, projectId, refreshKey, derivedRefreshKey]);

  useDiagnostic("ProjectDetailContent", {
    projectId,
    refreshKey,
    pipelineStatus,
    selectedDocumentId,
    latestEvent,
    apiClientIdentity: api,
  });

  // Use enterprise cache - handles TTL, LRU eviction, and error cleanup
  const cacheKey = `${projectId}-${refreshKey}`;
  console.log("[DIAG] Fetching project with cache key:", cacheKey);

  const projectPromise = projectCache.get(cacheKey, () => {
    console.log("[DIAG] Cache MISS - creating NEW promise for:", cacheKey);
    return api.getProject(projectId);
  });

  console.log("[DIAG] ProjectDetailContent: calling use(promise)");
  const response = use(projectPromise);
  console.log("[DIAG] ProjectDetailContent: use() resolved successfully!");

  if (!response.project) {
    throw new Error("Project not found");
  }

  const { project } = response;

  useEffect(() => {
    if (project.pipelineStatus && pipelineStatus !== project.pipelineStatus) {
      console.log("[DIAG] ProjectDetailContent: syncing pipelineStatus", project.pipelineStatus);
      setPipelineStatus(project.pipelineStatus);
    }
  }, [project.pipelineStatus, pipelineStatus]);

  // Fetch documents (mock data for now - TODO: implement API endpoint)
  const documents: Document[] = useMemo(() => {
    // Mock data until API is implemented
    return [
      {
        id: "doc1",
        projectId,
        documentType: "business-requirements",
        format: "yaml",
        content: `# Business Requirements\n\nProject: ${project.name}\n\n## Overview\nThis document outlines the business requirements for the project.\n\n## Goals\n- Goal 1: Deliver high-quality features\n- Goal 2: Meet deadlines\n- Goal 3: Maintain code quality`,
        version: 1,
        createdAt: new Date(Date.now() - 86400000 * 2) as any, // 2 days ago
        updatedAt: new Date(Date.now() - 86400000 * 2) as any,
      },
      {
        id: "doc2",
        projectId,
        documentType: "technical-requirements",
        format: "markdown",
        content: `# Technical Requirements\n\n## Architecture\n- React 19 with TypeScript\n- Effect-TS for functional programming\n- shadcn/ui component library\n\n## Key Technologies\n- **Frontend**: React, TypeScript, Tailwind CSS\n- **Backend**: Effect-TS, PostgreSQL\n- **Testing**: Vitest, React Testing Library`,
        version: 1,
        createdAt: new Date(Date.now() - 86400000) as any, // 1 day ago
        updatedAt: new Date(Date.now() - 86400000) as any,
      },
      {
        id: "doc3",
        projectId,
        documentType: "implementation-plan",
        format: "yaml",
        content: `implementation_plan:\n  milestones:\n    - id: m1\n      name: "Setup & Foundation"\n      tasks:\n        - Configure project structure\n        - Set up CI/CD pipeline\n        - Create base components\n    - id: m2\n      name: "Core Features"\n      tasks:\n        - Implement authentication\n        - Build API endpoints\n        - Create UI components`,
        version: 1,
        createdAt: new Date(Date.now() - 3600000) as any, // 1 hour ago
        updatedAt: new Date(Date.now() - 3600000) as any,
      },
    ];
  }, [projectId, project.name]);

  // Initialize selectedDocumentId to first document if none selected
  // IMPORTANT: State updates MUST be in useEffect, not useMemo, to avoid infinite render loops
  useEffect(() => {
    if (!selectedDocumentId && documents.length > 0) {
      const firstDoc = documents[0];
      if (firstDoc) {
        console.log("[DIAG] ProjectDetailContent: initializing selectedDocumentId to first document");
        setSelectedDocumentId(firstDoc.id);
      }
    }
  }, [selectedDocumentId, documents]);

  // Pure computation only - no side effects allowed in useMemo
  const selectedDocument = useMemo(() => {
    return documents.find((d) => d.id === selectedDocumentId) || null;
  }, [selectedDocumentId, documents]);

  // Mock milestones data - TODO: fetch from API
  const milestones: Array<never> = [];

  return (
    <ChatAssistantUIProvider projectId={projectId}>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <ProjectHeader
          name={project.name}
          description={project.description}
          pipelineStatus={project.pipelineStatus}
          createdAt={String(project.createdAt)}
        />

        <PipelineStatusVisualization
          projectId={projectId}
          currentStatus={pipelineStatus || project.pipelineStatus}
        />

        {/* Milestones section */}
        {milestones.length > 0 ? (
          <MilestoneList milestones={milestones} />
        ) : (
          <div className="p-6 border rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Milestones</h2>
            <p className="text-muted-foreground">No milestones found for this project</p>
          </div>
        )}

        {/* Documents section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Documents</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 border rounded-lg overflow-hidden">
            {/* Document list sidebar */}
            <div className="border-r bg-muted/20">
              <DocumentList
                documents={documents}
                selectedDocumentId={selectedDocumentId}
                onSelectDocument={setSelectedDocumentId}
              />
            </div>

            {/* Document viewer */}
            <div className="min-h-[600px]">
              <DocumentViewer
                document={selectedDocument ?? null}
                projectName={project.name}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Chat panel */}
      <ProjectChatPanel />
    </ChatAssistantUIProvider>
  );
}

/**
 * Project Detail Page
 * Main entry point for /projects/:id route
 */
export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const renderCount = useRef(0);
  renderCount.current++;

  console.log(`[DIAG] ProjectDetailPage render #${renderCount.current}, projectId=${projectId}`);

  useEffect(() => {
    console.log("[DIAG] ProjectDetailPage MOUNTED");
    return () => {
      console.log("[DIAG] ProjectDetailPage UNMOUNTING");
    };
  }, []);

  if (!projectId) {
    return <ProjectError error={new Error("No project ID provided")} />;
  }

  // Suspense boundary moved to App.tsx route level to prevent remounting issues
  return <ProjectDetailContent projectId={projectId} />;
}
