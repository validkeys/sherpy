import { useParams } from 'react-router-dom';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { Sidebar } from '@/features/sidebar';
import { MainTabs } from '@/features/tabs';
import { useChatRuntime } from '@/features/chat/hooks/use-chat-runtime';
import { useMockRuntime } from '@/features/chat/hooks/use-mock-runtime';
import { useProjectLoader } from '@/shared/hooks/use-project-loader';
import { useMessages } from '@/shared/api/chat/get-messages';
import { currentStepAtom } from '@/features/sidebar/state/workflow-atoms';
import type { WorkflowStep } from '@/features/sidebar/types';

/**
 * Project page component
 *
 * Main application view with sidebar navigation (1/3 width) and tabbed content area (2/3 width).
 * Gets projectId from route params and passes to MainTabs for chat and file management.
 *
 * If no projectId is provided in route params, defaults to 'default-project' for development.
 * In production, routing should always provide a valid projectId.
 *
 * Wraps the entire page in AssistantRuntimeProvider so that both Sidebar
 * (which uses useChatActions) and MainTabs (which contains ChatContainer) can access the runtime.
 *
 * Runtime selection:
 * - If VITE_BACKEND_URL is not set: uses mock runtime (client-side, no backend needed)
 * - If VITE_BACKEND_URL is set: uses real runtime (connects to backend API)
 */
function ProjectContentWithRuntime({
  projectId,
  messagesReady,
}: {
  projectId: string;
  messagesReady: boolean;
}) {
  // Create runtime (always call both hooks to satisfy rules of hooks)
  // messagesReady ensures messages are loaded before runtime initialization
  const useMock = !import.meta.env.VITE_BACKEND_URL;
  const mockResult = useMockRuntime(projectId);
  const realResult = useChatRuntime(projectId);

  // Select which runtime to use
  const { runtime } = useMock ? mockResult : realResult;

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-screen">
        <div className="w-1/3 border-r">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-hidden">
          <MainTabs projectId={projectId} />
        </main>
      </div>
    </AssistantRuntimeProvider>
  );
}

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const setCurrentStep = useSetAtom(currentStepAtom);

  // Fallback to 'default-project' when no route param provided (development/testing)
  const effectiveProjectId = projectId ?? 'default-project';

  // Load project and sync state
  const { project, isLoading, error } = useProjectLoader({
    projectId: effectiveProjectId,
  });

  // Pre-load chat messages (for real backend only)
  const useMock = !import.meta.env.VITE_BACKEND_URL;
  const { isLoading: isLoadingMessages } = useMessages({
    projectId: effectiveProjectId,
    queryConfig: {
      enabled: !!effectiveProjectId && !useMock,
      staleTime: Infinity,
    },
  });

  // Sync sidebar currentStep to project.pipelineStatus when project loads
  useEffect(() => {
    if (project?.project?.pipelineStatus) {
      setCurrentStep(project.project.pipelineStatus as WorkflowStep);
    }
  }, [project, setCurrentStep]);

  // Show loading state (project or messages)
  if (isLoading || (!useMock && isLoadingMessages)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">
            {isLoading ? 'Loading project...' : 'Loading chat history...'}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-destructive">Error loading project</div>
          <div className="text-sm text-muted-foreground mt-2">{error.message}</div>
        </div>
      </div>
    );
  }

  return <ProjectContentWithRuntime projectId={effectiveProjectId} messagesReady={true} />;
}
