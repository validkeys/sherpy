/**
 * Inbox Layout - Three-panel email-style UI
 */

import { useState, cloneElement, isValidElement } from "react";
import { Sidebar } from "./sidebar";
import { DetailPanel } from "./detail-panel";

interface InboxLayoutProps {
  children: React.ReactNode;
}

export function InboxLayout({ children }: InboxLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleNewProject = () => {
    console.log("New project clicked");
    // TODO: Open new project dialog
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  // Pass selection handlers to children
  const childrenWithProps = isValidElement(children)
    ? cloneElement(children, {
        onProjectSelect: handleProjectSelect,
        selectedProjectId,
      } as any)
    : children;

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onNewProject={handleNewProject}
      />

      {/* Main Content (Project List) */}
      <div className="flex-1 flex flex-col min-w-[400px]">
        {childrenWithProps}
      </div>

      {/* Detail Panel */}
      <DetailPanel projectId={selectedProjectId} />
    </div>
  );
}
