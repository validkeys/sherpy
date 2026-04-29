/**
 * MilestoneCard component tests
 */

import type { Milestone, Task } from "@sherpy/shared";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MilestoneCard } from "./milestone-card";

// Helper to create test milestone
function createMilestone(
  overrides: Partial<Milestone> = {},
  tasks: Task[] = [],
): Milestone & { tasks: Task[] } {
  return {
    id: "m1",
    projectId: "p1",
    name: "Test Milestone",
    description: "Test description",
    status: "in-progress",
    orderIndex: 0,
    createdAt: new Date() as any,
    updatedAt: new Date() as any,
    tasks,
    ...overrides,
  };
}

// Helper to create test task
function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `t${Math.random()}`,
    milestoneId: "m1",
    projectId: "p1",
    name: "Test Task",
    status: "pending",
    priority: "medium",
    orderIndex: 0,
    createdAt: new Date() as any,
    updatedAt: new Date() as any,
    ...overrides,
  };
}

describe("MilestoneCard", () => {
  it("renders milestone name and status", () => {
    const milestone = createMilestone();
    render(<MilestoneCard milestone={milestone} />);

    expect(screen.getByText("Test Milestone")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders milestone description", () => {
    const milestone = createMilestone();
    render(<MilestoneCard milestone={milestone} />);

    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("renders task status bar", () => {
    const tasks = [
      createTask({ status: "complete" }),
      createTask({ status: "in-progress" }),
      createTask({ status: "pending" }),
    ];
    const milestone = createMilestone({}, tasks);
    render(<MilestoneCard milestone={milestone} />);

    expect(screen.getByText("1/3 tasks")).toBeInTheDocument();
  });

  it("expands and collapses to show tasks", async () => {
    const user = userEvent.setup();
    const tasks = [
      createTask({ name: "Task 1", status: "complete" }),
      createTask({ name: "Task 2", status: "pending" }),
    ];
    const milestone = createMilestone({}, tasks);
    render(<MilestoneCard milestone={milestone} />);

    // Tasks should not be visible initially
    expect(screen.queryByText("Task 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Task 2")).not.toBeInTheDocument();

    // Click to expand
    const header = screen.getByText("Test Milestone");
    await user.click(header);

    // Tasks should now be visible
    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(screen.getByText("Task 2")).toBeInTheDocument();

    // Click to collapse
    await user.click(header);

    // Tasks should be hidden again
    expect(screen.queryByText("Task 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Task 2")).not.toBeInTheDocument();
  });

  it("shows empty state when no tasks", async () => {
    const user = userEvent.setup();
    const milestone = createMilestone({}, []);
    render(<MilestoneCard milestone={milestone} />);

    // Expand to see content
    const header = screen.getByText("Test Milestone");
    await user.click(header);

    expect(screen.getByText("No tasks in this milestone")).toBeInTheDocument();
  });

  it("renders task with description, priority, and status", async () => {
    const user = userEvent.setup();
    const tasks = [
      createTask({
        name: "Important Task",
        description: "Task description",
        status: "blocked",
        priority: "high",
      }),
    ];
    const milestone = createMilestone({}, tasks);
    render(<MilestoneCard milestone={milestone} />);

    // Expand to see tasks
    const header = screen.getByText("Test Milestone");
    await user.click(header);

    expect(screen.getByText("Important Task")).toBeInTheDocument();
    expect(screen.getByText("Task description")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    // Status badge appears once on the task row
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });

  it("applies correct status colors", () => {
    const milestones = [
      createMilestone({ status: "pending" }),
      createMilestone({ status: "in-progress" }),
      createMilestone({ status: "blocked" }),
      createMilestone({ status: "complete" }),
    ];

    milestones.forEach((milestone) => {
      const { container } = render(<MilestoneCard milestone={milestone} />);
      const statusBadge = container.querySelector(
        ".bg-gray-500, .bg-blue-500, .bg-red-500, .bg-green-500",
      );
      expect(statusBadge).toBeInTheDocument();
    });
  });
});
