/**
 * Project filtering hook - manages filter state and applies filters
 */

import type { PipelineStatus } from "@sherpy/shared";
import { useMemo, useState } from "react";

export interface FilterableProject {
  id: string;
  name: string;
  description?: string;
  pipelineStatus: string;
  tags?: readonly string[];
  assignedPeople?: readonly string[];
}

export interface ProjectFilters {
  searchQuery: string;
  statusFilters: string[];
  tagFilters: string[];
  assignedToMe: boolean;
}

export interface ProjectFilterActions {
  setSearchQuery: (query: string) => void;
  toggleStatus: (status: string) => void;
  toggleTag: (tag: string) => void;
  toggleAssignedToMe: () => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

export function useProjectFilters(projects: FilterableProject[], currentUserEmail?: string) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [assignedToMe, setAssignedToMe] = useState(false);

  // Extract unique tags from all projects
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    projects.forEach((project) => {
      project.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [projects]);

  // Extract unique statuses from all projects
  const availableStatuses = useMemo(() => {
    const statusSet = new Set<string>();
    projects.forEach((project) => {
      statusSet.add(project.pipelineStatus);
    });
    return Array.from(statusSet).sort();
  }, [projects]);

  // Apply all filters
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search filter (case-insensitive match on name and description)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = project.name.toLowerCase().includes(query);
        const descMatch = project.description?.toLowerCase().includes(query);
        if (!nameMatch && !descMatch) return false;
      }

      // Status filter (project must match one of selected statuses)
      if (statusFilters.length > 0) {
        if (!statusFilters.includes(project.pipelineStatus)) return false;
      }

      // Tag filter (project must have at least one selected tag)
      if (tagFilters.length > 0) {
        const projectTags = project.tags || [];
        const hasTag = tagFilters.some((tag) => projectTags.includes(tag));
        if (!hasTag) return false;
      }

      // Assigned to me filter
      if (assignedToMe && currentUserEmail) {
        const assigned = project.assignedPeople || [];
        if (!assigned.includes(currentUserEmail)) return false;
      }

      return true;
    });
  }, [projects, searchQuery, statusFilters, tagFilters, assignedToMe, currentUserEmail]);

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery.length > 0 || statusFilters.length > 0 || tagFilters.length > 0 || assignedToMe;

  // Filter actions
  const toggleStatus = (status: string) => {
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  const toggleTag = (tag: string) => {
    setTagFilters((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const toggleAssignedToMe = () => {
    setAssignedToMe((prev) => !prev);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilters([]);
    setTagFilters([]);
    setAssignedToMe(false);
  };

  return {
    // Filtered data
    filteredProjects,
    availableTags,
    availableStatuses,

    // Current filter state
    filters: {
      searchQuery,
      statusFilters,
      tagFilters,
      assignedToMe,
    },

    // Filter actions
    actions: {
      setSearchQuery,
      toggleStatus,
      toggleTag,
      toggleAssignedToMe,
      clearAllFilters,
      hasActiveFilters,
    },
  };
}
