import { useParams } from 'react-router-dom';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { Sidebar } from '@/features/sidebar';
import { MainTabs } from '@/features/tabs';
import { useChatRuntime } from '@/features/chat/hooks/use-chat-runtime';
import { useMockRuntime } from '@/features/chat/hooks/use-mock-runtime';

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
function ProjectContentWithRuntime({ projectId }: { projectId: string }) {
  // Create runtime
  const useMock = !import.meta.env.VITE_BACKEND_URL;
  const { runtime } = useMock ? useMockRuntime(projectId) : useChatRuntime(projectId);

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

  // Fallback to 'default-project' when no route param provided (development/testing)
  const effectiveProjectId = projectId ?? 'default-project';

  return <ProjectContentWithRuntime projectId={effectiveProjectId} />;
}
