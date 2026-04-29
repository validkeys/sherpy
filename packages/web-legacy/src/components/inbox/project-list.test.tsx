/**
 * Project List Component Tests
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { InboxContextValue } from "./filter-context";
import { InboxContextProvider } from "./filter-context";
import { ProjectList } from "./project-list";

// Helper to render ProjectList with context
function renderWithContext(contextValue: Partial<InboxContextValue>) {
  const defaultContext: InboxContextValue = {
    filters: {
      searchQuery: "",
      statusFilters: [],
      tagFilters: [],
      assignedToMe: false,
    },
    filterActions: {
      setSearchQuery: vi.fn(),
      toggleStatus: vi.fn(),
      toggleTag: vi.fn(),
      toggleAssignedToMe: vi.fn(),
      clearFilters: vi.fn(),
    },
    projectData: {
      projects: [],
      loading: false,
      error: null,
      connectionState: "disconnected" as const,
    },
    selection: {
      selectedProjectId: undefined,
      onProjectSelect: vi.fn(),
    },
    ...contextValue,
  };

  return render(
    <InboxContextProvider value={defaultContext}>
      <ProjectList />
    </InboxContextProvider>,
  );
}

const mockProjects = [
  {
    id: "1",
    name: "Project Alpha",
    slug: "project-alpha",
    description: "First test project",
    pipelineStatus: "active-development",
    tags: ["frontend", "urgent"],
    assignedPeople: ["user1@example.com"],
    updatedAt: "2024-01-01T00:00:00Z",
    health: "healthy" as const,
  },
  {
    id: "2",
    name: "Project Beta",
    slug: "project-beta",
    description: "Second test project",
    pipelineStatus: "intake",
    tags: ["backend"],
    assignedPeople: ["user2@example.com"],
    updatedAt: "2024-01-02T00:00:00Z",
    health: "at-risk" as const,
  },
  {
    id: "3",
    name: "Project Gamma",
    slug: "project-gamma",
    pipelineStatus: "completed",
    tags: ["frontend", "backend"],
    assignedPeople: [],
    updatedAt: "2024-01-03T00:00:00Z",
    health: "healthy" as const,
  },
];

describe("ProjectList", () => {
  describe("loading state", () => {
    it("should show loading spinner", () => {
      renderWithContext({
        projectData: { projects: [], loading: true, error: null, connectionState: "disconnected" },
      });
      expect(screen.getByText("Loading projects...")).toBeInTheDocument();
    });

    it("should show search bar during loading", () => {
      renderWithContext({
        projectData: { projects: [], loading: true, error: null, connectionState: "disconnected" },
        filters: { searchQuery: "", statusFilters: [], tagFilters: [], assignedToMe: false },
      });
      expect(screen.getByPlaceholderText("Search projects...")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("should show error message", () => {
      renderWithContext({
        projectData: {
          projects: [],
          loading: false,
          error: "Failed to load",
          connectionState: "disconnected",
        },
      });
      expect(screen.getByText("Failed to load projects")).toBeInTheDocument();
      expect(screen.getByText("Failed to load")).toBeInTheDocument();
    });

    it("should show search bar during error", () => {
      renderWithContext({
        projectData: {
          projects: [],
          loading: false,
          error: "Failed to load",
          connectionState: "disconnected",
        },
        filters: { searchQuery: "", statusFilters: [], tagFilters: [], assignedToMe: false },
      });
      expect(screen.getByPlaceholderText("Search projects...")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty message when no projects", () => {
      renderWithContext({
        projectData: { projects: [], loading: false, error: null, connectionState: "disconnected" },
      });
      expect(screen.getByText("No projects yet")).toBeInTheDocument();
      expect(screen.getByText('Click "New Project" to get started')).toBeInTheDocument();
    });
  });

  describe("project rendering", () => {
    it("should render list of projects", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
      });

      expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      expect(screen.getByText("Project Beta")).toBeInTheDocument();
      expect(screen.getByText("Project Gamma")).toBeInTheDocument();
    });

    it("should show project count", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
      });
      expect(screen.getByText("3 projects")).toBeInTheDocument();
    });

    it("should show singular project count", () => {
      const singleProject = mockProjects[0];
      if (!singleProject) throw new Error("Mock project not found");
      renderWithContext({
        projectData: {
          projects: [singleProject],
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
      });
      expect(screen.getByText("1 project")).toBeInTheDocument();
    });

    it("should render pipeline status badges", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
      });
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Intake")).toBeInTheDocument();
      expect(screen.getByText("Complete")).toBeInTheDocument();
    });
  });

  describe("project selection", () => {
    it("should call onProjectSelect when project is clicked", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
        selection: { selectedProjectId: undefined, onProjectSelect: onSelect },
      });

      const projectButton = screen.getByText("Project Alpha").closest("button");
      if (projectButton) {
        await user.click(projectButton);
      }

      expect(onSelect).toHaveBeenCalledWith("1");
    });

    it("should highlight selected project", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
        selection: { selectedProjectId: "2", onProjectSelect: vi.fn() },
      });

      const selectedButton = screen.getByText("Project Beta").closest("button");
      expect(selectedButton).toHaveClass("bg-accent");
    });
  });

  describe("filtering", () => {
    it("should filter projects by search query", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
        filters: { searchQuery: "alpha", statusFilters: [], tagFilters: [], assignedToMe: false },
      });

      expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      expect(screen.queryByText("Project Beta")).not.toBeInTheDocument();
      expect(screen.queryByText("Project Gamma")).not.toBeInTheDocument();
    });

    it("should filter by pipeline status", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
        filters: {
          searchQuery: "",
          statusFilters: ["active-development"],
          tagFilters: [],
          assignedToMe: false,
        },
      });

      expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      expect(screen.queryByText("Project Beta")).not.toBeInTheDocument();
      expect(screen.queryByText("Project Gamma")).not.toBeInTheDocument();
    });

    it("should filter by tags", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
        filters: {
          searchQuery: "",
          statusFilters: [],
          tagFilters: ["backend"],
          assignedToMe: false,
        },
      });

      expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
      expect(screen.getByText("Project Beta")).toBeInTheDocument();
      expect(screen.getByText("Project Gamma")).toBeInTheDocument();
    });

    it("should show filtered count", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
        filters: { searchQuery: "beta", statusFilters: [], tagFilters: [], assignedToMe: false },
      });

      expect(screen.getByText("1 project (filtered from 3)")).toBeInTheDocument();
    });

    it("should show no matches message", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
        filters: {
          searchQuery: "nonexistent",
          statusFilters: [],
          tagFilters: [],
          assignedToMe: false,
        },
      });

      expect(screen.getByText("No projects match your filters")).toBeInTheDocument();
    });

    it("should show clear filters button when filtered", () => {
      const onClearFilters = vi.fn();
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
        filters: { searchQuery: "xyz", statusFilters: [], tagFilters: [], assignedToMe: false },
        filterActions: {
          setSearchQuery: vi.fn(),
          toggleStatus: vi.fn(),
          toggleTag: vi.fn(),
          toggleAssignedToMe: vi.fn(),
          clearFilters: onClearFilters,
        },
      });

      expect(screen.getByText("No projects match your filters")).toBeInTheDocument();
      expect(screen.getByText("Clear filters")).toBeInTheDocument();
    });
  });

  describe("connection status", () => {
    it("should show Live indicator when connected", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "connected",
        },
      });
      expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it("should show Reconnecting indicator when reconnecting", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "reconnecting",
        },
      });
      expect(screen.getByText("Reconnecting...")).toBeInTheDocument();
    });

    it("should show Connecting indicator when connecting", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "connecting",
        },
      });
      expect(screen.getByText("Connecting...")).toBeInTheDocument();
    });

    it("should show Offline indicator when disconnected", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
      });
      expect(screen.getByText("Offline")).toBeInTheDocument();
    });
  });

  describe("active filters display", () => {
    it("should show search filter badge", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
        filters: { searchQuery: "test", statusFilters: [], tagFilters: [], assignedToMe: false },
      });
      expect(screen.getByText(/Search:/)).toBeInTheDocument();
    });

    it("should show status filter badges in active filters section", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
        filters: {
          searchQuery: "",
          statusFilters: ["intake"],
          tagFilters: [],
          assignedToMe: false,
        },
      });
      // The ActiveFilters component should show the filter badge
      const filterSection = screen.getByText("Filters:").closest("div");
      expect(filterSection).toBeInTheDocument();
    });

    it("should show tag filter badges", () => {
      renderWithContext({
        projectData: {
          projects: mockProjects,
          loading: false,
          error: null,
          connectionState: "disconnected",
        },
        filters: {
          searchQuery: "",
          statusFilters: [],
          tagFilters: ["frontend"],
          assignedToMe: false,
        },
      });
      expect(screen.getByText("tag:frontend")).toBeInTheDocument();
    });
  });
});
