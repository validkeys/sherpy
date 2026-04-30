/**
 * Files Container Component
 *
 * File explorer for project files. Displays file tree with navigation
 * and file operations.
 */

interface FilesContainerProps {
  projectId: string;
}

/**
 * Main files container component.
 * Provides file browsing and management capabilities for the project.
 */
export function FilesContainer({ projectId }: FilesContainerProps) {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b bg-muted/50">
        <h2 className="text-lg font-semibold">Project Files</h2>
        <p className="text-sm text-muted-foreground">
          Browse and manage files for {projectId}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {/* File tree placeholder */}
          <div className="rounded-lg border border-dashed border-muted-foreground/25 p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <svg
                className="w-12 h-12 text-muted-foreground/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <p className="text-sm text-muted-foreground">
                File explorer coming soon
              </p>
              <p className="text-xs text-muted-foreground/75">
                View and manage your project files here
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
