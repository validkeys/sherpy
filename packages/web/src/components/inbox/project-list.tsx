/**
 * Project List - Scrollable list of projects with selection and filtering
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { useApi } from "@/hooks/use-api";
import { useProjectFilters } from "@/hooks/use-project-filters";
import { useEffect, useState } from "react";
import { ActiveFilters } from "./active-filters";
import type { HealthStatus } from "./health-indicator";
import { ProjectRow } from "./project-row";
import { SearchBar } from "./search-bar";

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  pipelineStatus: string;
  tags?: readonly string[];
  assignedPeople?: readonly string[];
  updatedAt: string;
  health?: HealthStatus;
}

interface ProjectListProps {
  onProjectSelect?: (projectId: string) => void;
  selectedProjectId?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  statusFilters?: string[];
  tagFilters?: string[];
  assignedToMe?: boolean;
  onRemoveStatusFilter?: (status: string) => void;
  onRemoveTagFilter?: (tag: string) => void;
  onRemoveAssignedToMe?: () => void;
  onClearFilters?: () => void;
}

export function ProjectList({
  onProjectSelect,
  selectedProjectId,
  searchQuery = "",
  onSearchChange,
  statusFilters = [],
  tagFilters = [],
  assignedToMe = false,
  onRemoveStatusFilter,
  onRemoveTagFilter,
  onRemoveAssignedToMe,
  onClearFilters,
}: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiClient = useApi();

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.listProjects();

        // Map API response to component format
        const mappedProjects: Project[] = response.projects.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          pipelineStatus: p.pipelineStatus,
          tags: p.tags || [],
          assignedPeople: p.assignedPeople || [],
          updatedAt: String(p.updatedAt),
          health: "healthy" as HealthStatus, // TODO: Calculate from milestones/tasks
        }));

        setProjects(mappedProjects);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
        setError(err instanceof Error ? err.message : "Failed to load projects");
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [apiClient]);

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
        <SearchBar value={searchQuery} onChange={onSearchChange || (() => {})} />
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
        <SearchBar value={searchQuery} onChange={onSearchChange || (() => {})} />
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
        <SearchBar value={searchQuery} onChange={onSearchChange || (() => {})} />
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
      <SearchBar value={searchQuery} onChange={onSearchChange || (() => {})} />

      <ActiveFilters
        searchQuery={searchQuery}
        statusFilters={statusFilters}
        tagFilters={tagFilters}
        assignedToMe={assignedToMe}
        onRemoveSearch={() => onSearchChange?.("")}
        onRemoveStatus={onRemoveStatusFilter}
        onRemoveTag={onRemoveTagFilter}
        onRemoveAssignedToMe={onRemoveAssignedToMe}
        onClearAll={onClearFilters}
      />

      <ScrollArea className="flex-1">
        <div className="border-b">
          <div className="px-4 py-2 text-sm text-muted-foreground">
            {filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"}
            {hasFilters && ` (filtered from ${projects.length})`}
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">No projects match your filters</p>
              {hasFilters && (
                <button onClick={onClearFilters} className="text-xs text-primary hover:underline">
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
              onClick={() => onProjectSelect?.(project.id)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
