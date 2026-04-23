/**
 * Filter Context - Manages inbox filter state without prop drilling
 */

import type { Project } from "@/hooks/use-realtime-projects";
import type { ConnectionState } from "@/hooks/use-websocket";
import { createContext, useContext } from "react";

export interface FilterState {
  searchQuery: string;
  statusFilters: string[];
  tagFilters: string[];
  assignedToMe: boolean;
}

export interface FilterActions {
  setSearchQuery: (query: string) => void;
  toggleStatus: (status: string) => void;
  toggleTag: (tag: string) => void;
  toggleAssignedToMe: () => void;
  clearFilters: () => void;
}

export interface ProjectData {
  projects: Project[];
  loading: boolean;
  error: string | null;
  connectionState: ConnectionState;
}

export interface SelectionState {
  selectedProjectId: string | undefined;
  onProjectSelect: (projectId: string) => void;
}

export interface InboxContextValue {
  filters: FilterState;
  filterActions: FilterActions;
  projectData: ProjectData;
  selection: SelectionState;
}

const InboxContext = createContext<InboxContextValue | undefined>(undefined);

export function useInboxContext() {
  const context = useContext(InboxContext);
  if (!context) {
    throw new Error("useInboxContext must be used within InboxContextProvider");
  }
  return context;
}

export const InboxContextProvider = InboxContext.Provider;
