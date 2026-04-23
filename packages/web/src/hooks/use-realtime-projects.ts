/**
 * Real-time projects hook - Fetches projects and updates via WebSocket
 */

import { useCallback, useEffect, useState } from "react";
import { useApi } from "./use-api";
import { useWebSocket } from "./use-websocket";

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  pipelineStatus: string;
  tags?: readonly string[];
  assignedPeople?: readonly string[];
  updatedAt: string;
  priority?: string;
}

export interface ProjectUpdate {
  projectId: string;
  changes: Partial<Project>;
}

export function useRealtimeProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiClient = useApi();
  const { connectionState, subscribe } = useWebSocket();

  // Initial load
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.listProjects();

      const mappedProjects: Project[] = response.projects.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        pipelineStatus: p.pipelineStatus,
        tags: p.tags || [],
        assignedPeople: p.assignedPeople || [],
        updatedAt: String(p.updatedAt),
        priority: p.priority,
      }));

      // Sort by updatedAt DESC
      mappedProjects.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      setProjects(mappedProjects);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Subscribe to WebSocket events
  useEffect(() => {
    // project:updated event handler
    const handleProjectUpdated = (event: any) => {
      const { projectId, project } = event;

      setProjects((prev) => {
        const index = prev.findIndex((p) => p.id === projectId);
        if (index === -1) {
          // New project - add it
          const newProject: Project = {
            id: project.id,
            name: project.name,
            slug: project.slug,
            description: project.description,
            pipelineStatus: project.pipelineStatus,
            tags: project.tags || [],
            assignedPeople: project.assignedPeople || [],
            updatedAt: project.updatedAt || new Date().toISOString(),
            priority: project.priority,
          };
          return [newProject, ...prev];
        }

        // Update existing project
        const updated = prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                ...project,
                updatedAt: project.updatedAt || new Date().toISOString(),
              }
            : p,
        );

        // Re-sort by updatedAt DESC
        updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return updated;
      });
    };

    // project:pipelineStatusChanged event handler
    const handlePipelineStatusChanged = (event: any) => {
      const { projectId, oldStatus, newStatus, timestamp } = event;

      setProjects((prev) => {
        const updated = prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                pipelineStatus: newStatus,
                updatedAt: timestamp || new Date().toISOString(),
              }
            : p,
        );

        // Re-sort by updatedAt DESC
        updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return updated;
      });
    };

    // task:statusChanged event handler
    const handleTaskStatusChanged = (event: any) => {
      const { projectId, taskId, oldStatus, newStatus, timestamp } = event;

      // Update project's updatedAt timestamp
      setProjects((prev) => {
        const updated = prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                updatedAt: timestamp || new Date().toISOString(),
              }
            : p,
        );

        // Re-sort by updatedAt DESC
        updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return updated;
      });
    };

    // assignment:created and assignment:updated event handlers
    const handleAssignmentChange = (event: any) => {
      const { projectId, personId, timestamp } = event;

      setProjects((prev) => {
        const updated = prev.map((p) => {
          if (p.id === projectId) {
            // Update assignedPeople if needed
            const assignedPeople = p.assignedPeople || [];
            const hasAssignment = assignedPeople.includes(personId);

            return {
              ...p,
              assignedPeople: hasAssignment ? assignedPeople : [...assignedPeople, personId],
              updatedAt: timestamp || new Date().toISOString(),
            };
          }
          return p;
        });

        // Re-sort by updatedAt DESC
        updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return updated;
      });
    };

    // Subscribe to all relevant events
    const unsubscribeProjectUpdated = subscribe("project:updated", handleProjectUpdated);
    const unsubscribePipelineStatus = subscribe(
      "project:pipelineStatusChanged",
      handlePipelineStatusChanged,
    );
    const unsubscribeTaskStatus = subscribe("task:statusChanged", handleTaskStatusChanged);
    const unsubscribeAssignmentCreated = subscribe("assignment:created", handleAssignmentChange);
    const unsubscribeAssignmentUpdated = subscribe("assignment:updated", handleAssignmentChange);

    // Cleanup subscriptions
    return () => {
      unsubscribeProjectUpdated();
      unsubscribePipelineStatus();
      unsubscribeTaskStatus();
      unsubscribeAssignmentCreated();
      unsubscribeAssignmentUpdated();
    };
  }, [subscribe]);

  return {
    projects,
    loading,
    error,
    connectionState,
    refresh: loadProjects,
  };
}
