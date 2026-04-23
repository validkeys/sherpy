/**
 * TaskStatusBar component tests
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { TaskStatusBar } from "./task-status-bar";

describe("TaskStatusBar", () => {
  it("renders empty state when no tasks", () => {
    const counts = { complete: 0, inProgress: 0, blocked: 0, pending: 0 };
    render(<TaskStatusBar counts={counts} />);

    expect(screen.getByText("0/0 tasks")).toBeInTheDocument();
  });

  it("renders task counts correctly", () => {
    const counts = { complete: 5, inProgress: 2, blocked: 1, pending: 2 };
    render(<TaskStatusBar counts={counts} />);

    expect(screen.getByText("5/10 tasks")).toBeInTheDocument();
  });

  it("shows all task statuses in tooltip", async () => {
    const user = userEvent.setup();
    const counts = { complete: 5, inProgress: 2, blocked: 1, pending: 2 };
    render(<TaskStatusBar counts={counts} />);

    // Hover over the bar to show tooltip
    const statusBar = screen.getByLabelText("5 complete").parentElement;
    if (statusBar) {
      await user.hover(statusBar);

      // Tooltip should show all status counts (may have duplicates for accessibility)
      const completeElements = await screen.findAllByText(/Complete: 5/);
      expect(completeElements.length).toBeGreaterThan(0);

      expect(screen.getAllByText(/In Progress: 2/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Blocked: 1/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Pending: 2/).length).toBeGreaterThan(0);
    }
  });

  it("renders correct proportions for status segments", () => {
    const counts = { complete: 5, inProgress: 0, blocked: 0, pending: 5 };
    render(<TaskStatusBar counts={counts} />);

    const completeSegment = screen.getByLabelText("5 complete");
    const pendingSegment = screen.getByLabelText("5 pending");

    // Each should be 50% width (5/10)
    expect(completeSegment).toHaveStyle({ width: "50%" });
    expect(pendingSegment).toHaveStyle({ width: "50%" });
  });

  it("only renders segments for non-zero counts", () => {
    const counts = { complete: 10, inProgress: 0, blocked: 0, pending: 0 };
    render(<TaskStatusBar counts={counts} />);

    expect(screen.getByLabelText("10 complete")).toBeInTheDocument();
    expect(screen.queryByLabelText(/in progress/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/blocked/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/pending/)).not.toBeInTheDocument();
  });
});
