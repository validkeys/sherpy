/**
 * Files Container Component
 *
 * Split-pane layout with file tree on the left (30%) and file preview on the right (70%).
 * Provides file browsing and preview capabilities for project documents.
 */

import { Button } from '@/shared/components/ui/button';
import { useGenerateDocument } from '@/shared/api/documents/generate-document';
import { FileTree } from './file-tree';
import { FilePreview } from './file-preview';
import { FilesErrorBoundary } from './files-error-boundary';

interface FilesContainerProps {
  projectId: string;
}

/**
 * Main files container component.
 * Provides file browsing and preview capabilities for the project.
 */
export function FilesContainer({ projectId }: FilesContainerProps) {
  const { mutate: generateDocument, isPending } = useGenerateDocument({
    onSuccess: () => {
      // TODO: Add toast notification when toast system is available
      // Document list will be automatically refreshed via React Query cache invalidation
    },
    onError: (error) => {
      console.error('Failed to generate document:', error);
      // TODO: Add error toast when toast system is available
    },
  });

  const handleGenerateDocument = () => {
    generateDocument({
      projectId,
      data: {
        documentType: 'implementation-plan',
        format: 'yaml',
      },
    });
  };

  return (
    <FilesErrorBoundary>
      <div className="flex h-full bg-background">
        {/* Left panel: File tree (30% width) */}
        <div className="w-[30%] border-r flex flex-col">
          <div className="p-3 border-b bg-muted/30 flex justify-between items-center">
            <h3 className="text-sm font-semibold">Documents</h3>
            <Button
              onClick={handleGenerateDocument}
              size="sm"
              variant="outline"
              isLoading={isPending}
            >
              Generate Document
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <FileTree projectId={projectId} />
          </div>
        </div>

        {/* Right panel: File preview (70% width) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <FilePreview projectId={projectId} />
        </div>
      </div>
    </FilesErrorBoundary>
  );
}
