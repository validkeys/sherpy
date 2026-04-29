/**
 * Inbox Layout Component Tests
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InboxLayout } from "./inbox-layout";

// Mock child components and hooks
vi.mock("@/hooks/use-realtime-projects", () => ({
  useRealtimeProjects: () => ({
    projects: [],
    loading: false,
    error: null,
    connectionState: "disconnected",
  }),
}));

vi.mock("./command-palette", () => ({
  CommandPalette: () => <div data-testid="command-palette">Command Palette</div>,
}));

vi.mock("./sidebar", () => ({
  Sidebar: ({
    collapsed,
    onToggleCollapse,
  }: {
    collapsed: boolean;
    onToggleCollapse: () => void;
  }) => (
    <div data-testid="sidebar">
      Sidebar {collapsed ? "Collapsed" : "Expanded"}
      <button onClick={onToggleCollapse}>Toggle</button>
    </div>
  ),
}));

vi.mock("./detail-panel", () => ({
  DetailPanel: ({ projectId }: { projectId?: string }) => (
    <div data-testid="detail-panel">Detail Panel {projectId ? `(${projectId})` : "(none)"}</div>
  ),
}));

describe("InboxLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render three-panel layout", () => {
      render(
        <InboxLayout>
          <div>Main Content</div>
        </InboxLayout>,
      );

      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
      expect(screen.getByText("Main Content")).toBeInTheDocument();
      expect(screen.getByTestId("detail-panel")).toBeInTheDocument();
    });

    it("should render command palette", () => {
      render(
        <InboxLayout>
          <div>Main Content</div>
        </InboxLayout>,
      );

      expect(screen.getByTestId("command-palette")).toBeInTheDocument();
    });

    it("should render children in main content area", () => {
      render(
        <InboxLayout>
          <div data-testid="custom-content">Custom Component</div>
        </InboxLayout>,
      );

      expect(screen.getByTestId("custom-content")).toBeInTheDocument();
    });
  });

  describe("sidebar interaction", () => {
    it("should start with sidebar expanded", () => {
      render(
        <InboxLayout>
          <div>Content</div>
        </InboxLayout>,
      );

      expect(screen.getByText("Sidebar Expanded")).toBeInTheDocument();
    });

    it("should toggle sidebar collapse state", async () => {
      const user = userEvent.setup();

      render(
        <InboxLayout>
          <div>Content</div>
        </InboxLayout>,
      );

      const toggleButton = screen.getByText("Toggle");
      await user.click(toggleButton);

      expect(screen.getByText("Sidebar Collapsed")).toBeInTheDocument();
    });
  });

  describe("project selection", () => {
    it("should start with no project selected", () => {
      render(
        <InboxLayout>
          <div>Content</div>
        </InboxLayout>,
      );

      expect(screen.getByText("Detail Panel (none)")).toBeInTheDocument();
    });
  });

  describe("filter state", () => {
    it("should provide filter props to children", () => {
      const TestChild = ({
        searchQuery,
        statusFilters,
        tagFilters,
      }: {
        searchQuery?: string;
        statusFilters?: string[];
        tagFilters?: string[];
      }) => (
        <div data-testid="test-child">
          Search: {searchQuery || "empty"}
          Status Filters: {statusFilters?.length || 0}
          Tag Filters: {tagFilters?.length || 0}
        </div>
      );

      render(
        <InboxLayout>
          <TestChild />
        </InboxLayout>,
      );

      expect(screen.getByText(/Search: empty/)).toBeInTheDocument();
      expect(screen.getByText(/Status Filters: 0/)).toBeInTheDocument();
      expect(screen.getByText(/Tag Filters: 0/)).toBeInTheDocument();
    });
  });

  describe("layout structure", () => {
    it("should have flex container", () => {
      const { container } = render(
        <InboxLayout>
          <div>Content</div>
        </InboxLayout>,
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("h-screen");
      expect(mainContainer).toHaveClass("flex");
      expect(mainContainer).toHaveClass("overflow-hidden");
    });

    it("should have three main sections", () => {
      render(
        <InboxLayout>
          <div data-testid="main-content">Content</div>
        </InboxLayout>,
      );

      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
      expect(screen.getByTestId("main-content")).toBeInTheDocument();
      expect(screen.getByTestId("detail-panel")).toBeInTheDocument();
    });
  });

  describe("responsive behavior", () => {
    it("should set min-width on main content", () => {
      const { container } = render(
        <InboxLayout>
          <div>Content</div>
        </InboxLayout>,
      );

      const mainContent = container.querySelector(".min-w-\\[400px\\]");
      expect(mainContent).toBeInTheDocument();
    });
  });
});
