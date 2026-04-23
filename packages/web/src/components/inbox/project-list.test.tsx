/**
 * Project List Component Tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectList } from "./project-list";

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
      render(<ProjectList loading={true} projects={[]} />);
      expect(screen.getByText("Loading projects...")).toBeInTheDocument();
    });

    it("should show search bar during loading", () => {
      render(<ProjectList loading={true} projects={[]} searchQuery="" onSearchChange={vi.fn()} />);
      expect(screen.getByPlaceholderText("Search projects...")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("should show error message", () => {
      render(<ProjectList error="Failed to load" projects={[]} />);
      expect(screen.getByText("Failed to load projects")).toBeInTheDocument();
      expect(screen.getByText("Failed to load")).toBeInTheDocument();
    });

    it("should show search bar during error", () => {
      render(
        <ProjectList error="Failed to load" projects={[]} searchQuery="" onSearchChange={vi.fn()} />
      );
      expect(screen.getByPlaceholderText("Search projects...")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty message when no projects", () => {
      render(<ProjectList projects={[]} />);
      expect(screen.getByText("No projects yet")).toBeInTheDocument();
      expect(screen.getByText('Click "New Project" to get started')).toBeInTheDocument();
    });
  });

  describe("project rendering", () => {
    it("should render list of projects", () => {
      render(<ProjectList projects={mockProjects} />);

      expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      expect(screen.getByText("Project Beta")).toBeInTheDocument();
      expect(screen.getByText("Project Gamma")).toBeInTheDocument();
    });

    it("should show project count", () => {
      render(<ProjectList projects={mockProjects} />);
      expect(screen.getByText("3 projects")).toBeInTheDocument();
    });

    it("should show singular project count", () => {
      render(<ProjectList projects={[mockProjects[0]]} />);
      expect(screen.getByText("1 project")).toBeInTheDocument();
    });

    it("should render pipeline status badges", () => {
      render(<ProjectList projects={mockProjects} />);
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Intake")).toBeInTheDocument();
      expect(screen.getByText("Complete")).toBeInTheDocument();
    });
  });

  describe("project selection", () => {
    it("should call onProjectSelect when project is clicked", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<ProjectList projects={mockProjects} onProjectSelect={onSelect} />);

      const projectButton = screen.getByText("Project Alpha").closest("button");
      if (projectButton) {
        await user.click(projectButton);
      }

      expect(onSelect).toHaveBeenCalledWith("1");
    });

    it("should highlight selected project", () => {
      render(<ProjectList projects={mockProjects} selectedProjectId="2" />);

      const selectedButton = screen.getByText("Project Beta").closest("button");
      expect(selectedButton).toHaveClass("bg-accent");
    });
  });

  describe("filtering", () => {
    it("should filter projects by search query", () => {
      render(<ProjectList projects={mockProjects} searchQuery="alpha" />);

      expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      expect(screen.queryByText("Project Beta")).not.toBeInTheDocument();
      expect(screen.queryByText("Project Gamma")).not.toBeInTheDocument();
    });

    it("should filter by pipeline status", () => {
      render(<ProjectList projects={mockProjects} statusFilters={["active-development"]} />);

      expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      expect(screen.queryByText("Project Beta")).not.toBeInTheDocument();
      expect(screen.queryByText("Project Gamma")).not.toBeInTheDocument();
    });

    it("should filter by tags", () => {
      render(<ProjectList projects={mockProjects} tagFilters={["backend"]} />);

      expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
      expect(screen.getByText("Project Beta")).toBeInTheDocument();
      expect(screen.getByText("Project Gamma")).toBeInTheDocument();
    });

    it("should show filtered count", () => {
      render(<ProjectList projects={mockProjects} searchQuery="beta" />);

      expect(screen.getByText("1 project (filtered from 3)")).toBeInTheDocument();
    });

    it("should show no matches message", () => {
      render(<ProjectList projects={mockProjects} searchQuery="nonexistent" />);

      expect(screen.getByText("No projects match your filters")).toBeInTheDocument();
    });

    it("should show clear filters button when filtered", () => {
      const onClearFilters = vi.fn();
      render(
        <ProjectList projects={mockProjects} searchQuery="xyz" onClearFilters={onClearFilters} />
      );

      expect(screen.getByText("No projects match your filters")).toBeInTheDocument();
      expect(screen.getByText("Clear filters")).toBeInTheDocument();
    });
  });

  describe("connection status", () => {
    it("should show Live indicator when connected", () => {
      render(<ProjectList projects={mockProjects} connectionState="connected" />);
      expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it("should show Reconnecting indicator when reconnecting", () => {
      render(<ProjectList projects={mockProjects} connectionState="reconnecting" />);
      expect(screen.getByText("Reconnecting...")).toBeInTheDocument();
    });

    it("should show Connecting indicator when connecting", () => {
      render(<ProjectList projects={mockProjects} connectionState="connecting" />);
      expect(screen.getByText("Connecting...")).toBeInTheDocument();
    });

    it("should show Offline indicator when disconnected", () => {
      render(<ProjectList projects={mockProjects} connectionState="disconnected" />);
      expect(screen.getByText("Offline")).toBeInTheDocument();
    });
  });

  describe("active filters display", () => {
    it("should show search filter badge", () => {
      render(<ProjectList projects={mockProjects} searchQuery="test" />);
      expect(screen.getByText(/Search:/)).toBeInTheDocument();
    });

    it("should show status filter badges in active filters section", () => {
      render(<ProjectList projects={mockProjects} statusFilters={["intake"]} />);
      // The ActiveFilters component should show the filter badge
      const filterSection = screen.getByText("Filters:").closest("div");
      expect(filterSection).toBeInTheDocument();
    });

    it("should show tag filter badges", () => {
      render(<ProjectList projects={mockProjects} tagFilters={["frontend"]} />);
      expect(screen.getByText("tag:frontend")).toBeInTheDocument();
    });
  });
});
