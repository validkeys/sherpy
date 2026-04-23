/**
 * Project List - Scrollable list of projects with selection
 */

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectRow } from "./project-row";
import { useApi } from "@/hooks/use-api";
import type { HealthStatus } from "./health-indicator";

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  pipelineStatus: string;
  tags?: readonly string[];
  updatedAt: string;
  health?: HealthStatus;
}

interface ProjectListProps {
  onProjectSelect?: (projectId: string) => void;
  selectedProjectId?: string;
}

export function ProjectList({ onProjectSelect, selectedProjectId }: ProjectListProps) {
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-sm text-destructive mb-2">Failed to load projects</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-sm text-muted-foreground mb-2">No projects yet</p>
          <p className="text-xs text-muted-foreground">
            Click "New Project" to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="border-b">
        <div className="px-4 py-2 text-sm text-muted-foreground">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </div>
      </div>
      {projects.map((project) => (
        <ProjectRow
          key={project.id}
          project={project}
          selected={selectedProjectId === project.id}
          onClick={() => onProjectSelect?.(project.id)}
        />
      ))}
    </ScrollArea>
  );
}
