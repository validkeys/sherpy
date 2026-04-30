import { useParams } from 'react-router-dom';
import { Sidebar } from '@/features/sidebar';
import { MainTabs } from '@/features/tabs';

/**
 * Project page component
 *
 * Main application view with sidebar navigation (1/3 width) and tabbed content area (2/3 width).
 * Gets projectId from route params and passes to MainTabs for chat and file management.
 */
export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();

  // Default projectId for development if not in route params
  const effectiveProjectId = projectId || 'default-project';

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
