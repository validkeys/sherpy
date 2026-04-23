/**
 * Project List - Scrollable list of projects with selection and filtering
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { Wifi, WifiOff } from "lucide-react";
import { ActiveFilters } from "./active-filters";
import { useInboxContext } from "./filter-context";
import type { HealthStatus } from "./health-indicator";
import { ProjectRow } from "./project-row";
import { SearchBar } from "./search-bar";

interface ProjectWithHealth {
  id: string;
  name: string;
  slug: string;
  description?: string;
  pipelineStatus: string;
  tags?: readonly string[];
  assignedPeople?: readonly string[];
  updatedAt: string;
  health: HealthStatus;
}

export function ProjectList() {
  // Get all state from context
  const { filters, filterActions, projectData, selection } = useInboxContext();
  const { searchQuery, statusFilters, tagFilters, assignedToMe } = filters;
  const { setSearchQuery, toggleStatus, toggleTag, toggleAssignedToMe, clearFilters } =
    filterActions;
  const { projects: projectsRaw, loading, error, connectionState } = projectData;
  const { selectedProjectId, onProjectSelect } = selection;

  // Add health status to projects (TODO: Calculate from milestones/tasks)
  const projects: ProjectWithHealth[] = projectsRaw.map((p) => ({
    ...p,
    health: "healthy" as HealthStatus,
  }));

  // Apply filters
  const filteredProjects = projects.filter((project) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameMatch = project.name.toLowerCase().includes(query);
      const descMatch = project.description?.toLowerCase().includes(query);
      if (!nameMatch && !descMatch) return false;
    }

    // Status filter
    if (statusFilters.length > 0) {
      if (!statusFilters.includes(project.pipelineStatus)) return false;
    }

    // Tag filter
    if (tagFilters.length > 0) {
      const projectTags = project.tags || [];
      const hasTag = tagFilters.some((tag) => projectTags.includes(tag));
      if (!hasTag) return false;
    }

    // Assigned to me filter (TODO: need current user email)
    if (assignedToMe) {
      // For now, skip this filter until we have user context
      // const assigned = project.assignedPeople || [];
      // if (!assigned.includes(currentUserEmail)) return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <p className="text-sm text-destructive mb-2">Failed to load projects</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <p className="text-sm text-muted-foreground mb-2">No projects yet</p>
            <p className="text-xs text-muted-foreground">Click "New Project" to get started</p>
          </div>
        </div>
      </div>
    );
  }

  const hasFilters =
    searchQuery || statusFilters.length > 0 || tagFilters.length > 0 || assignedToMe;

  return (
    <div className="flex-1 flex flex-col">
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      <ActiveFilters
        searchQuery={searchQuery}
        statusFilters={statusFilters}
        tagFilters={tagFilters}
        assignedToMe={assignedToMe}
        onRemoveSearch={() => setSearchQuery("")}
        onRemoveStatus={toggleStatus}
        onRemoveTag={toggleTag}
        onRemoveAssignedToMe={toggleAssignedToMe}
        onClearAll={clearFilters}
      />

      <ScrollArea className="flex-1">
        <div className="border-b">
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"}
              {hasFilters && ` (filtered from ${projects.length})`}
            </span>

            {/* Connection status indicator */}
            <div className="flex items-center gap-1.5">
              {connectionState === "connected" ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs text-green-600">Live</span>
                </>
              ) : connectionState === "reconnecting" ? (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                  <span className="text-xs text-amber-600">Reconnecting...</span>
                </>
              ) : connectionState === "connecting" ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent" />
                  <span className="text-xs text-muted-foreground">Connecting...</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">No projects match your filters</p>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              selected={selectedProjectId === project.id}
              onClick={() => onProjectSelect(project.id)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
