/**
 * Inbox Layout - Three-panel email-style UI with filtering and real-time updates
 */

import { useRealtimeProjects } from "@/hooks/use-realtime-projects";
import { cloneElement, isValidElement, useState } from "react";
import { CommandPalette } from "./command-palette";
import { DetailPanel } from "./detail-panel";
import { Sidebar } from "./sidebar";

interface InboxLayoutProps {
  children: React.ReactNode;
}

export function InboxLayout({ children }: InboxLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();

  // Real-time projects with WebSocket updates
  const { projects, loading, error, connectionState } = useRealtimeProjects();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [assignedToMe, setAssignedToMe] = useState(false);

  // Compute available tags and statuses
  const availableTags = Array.from(new Set(projects.flatMap((p) => p.tags || []))).sort();

  const availableStatuses = Array.from(new Set(projects.map((p) => p.pipelineStatus))).sort();

  // Compute project counts
  const projectCounts = {
    total: projects.length,
    byStatus: projects.reduce(
      (acc, p) => {
        acc[p.pipelineStatus] = (acc[p.pipelineStatus] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
    byTag: projects.reduce(
      (acc, p) => {
        (p.tags || []).forEach((tag) => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
        return acc;
      },
      {} as Record<string, number>,
    ),
    assignedToMe: 0, // TODO: Calculate based on current user
  };

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

  const handleToggleStatus = (status: string) => {
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  const handleToggleTag = (tag: string) => {
    setTagFilters((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleToggleAssignedToMe = () => {
    setAssignedToMe((prev) => !prev);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilters([]);
    setTagFilters([]);
    setAssignedToMe(false);
  };

  // Pass filter props and real-time data to children
  const childrenWithProps = isValidElement(children)
    ? cloneElement(children, {
        onProjectSelect: handleProjectSelect,
        selectedProjectId,
        searchQuery,
        onSearchChange: setSearchQuery,
        statusFilters,
        tagFilters,
        assignedToMe,
        onRemoveStatusFilter: handleToggleStatus,
        onRemoveTagFilter: handleToggleTag,
        onRemoveAssignedToMe: handleToggleAssignedToMe,
        onClearFilters: handleClearFilters,
        projects,
        loading,
        error,
        connectionState,
      } as any)
    : children;

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Command Palette */}
      <CommandPalette projects={projects} onSelectProject={handleProjectSelect} />

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onNewProject={handleNewProject}
        availableStatuses={availableStatuses}
        availableTags={availableTags}
        statusFilters={statusFilters}
        tagFilters={tagFilters}
        assignedToMe={assignedToMe}
        onToggleStatus={handleToggleStatus}
        onToggleTag={handleToggleTag}
        onToggleAssignedToMe={handleToggleAssignedToMe}
        projectCounts={projectCounts}
      />

      {/* Main Content (Project List) */}
      <div className="flex-1 flex flex-col min-w-[400px]">{childrenWithProps}</div>

      {/* Detail Panel */}
      <DetailPanel projectId={selectedProjectId} />
    </div>
  );
}
