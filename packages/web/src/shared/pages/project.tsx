import { useParams } from 'react-router-dom';
import { Sidebar } from '@/features/sidebar';
import { MainTabs } from '@/features/tabs';

/**
 * Project page component
 *
 * Main application view with sidebar navigation (1/3 width) and tabbed content area (2/3 width).
 * Gets projectId from route params and passes to MainTabs for chat and file management.
 *
 * If no projectId is provided in route params, defaults to 'default-project' for development.
 * In production, routing should always provide a valid projectId.
 */
export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();

  // Fallback to 'default-project' when no route param provided (development/testing)
  const effectiveProjectId = projectId ?? 'default-project';

  return (
    <div className="flex h-screen">
      <div className="w-1/3 border-r">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-hidden">
        <MainTabs projectId={effectiveProjectId} />
      </main>
    </div>
  );
}
