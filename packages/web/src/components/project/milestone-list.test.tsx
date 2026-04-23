/**
 * MilestoneList component tests
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MilestoneList } from "./milestone-list";
import type { Milestone, Task } from "@sherpy/shared";

// Helper to create test milestone
function createMilestone(overrides: Partial<Milestone> = {}, tasks: Task[] = []): Milestone & { tasks: Task[] } {
  return {
    id: `m${Math.random()}`,
    projectId: "p1",
    name: "Test Milestone",
    description: "Test description",
    status: "pending",
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

describe("MilestoneList", () => {
  it("renders empty state when no milestones", () => {
    render(<MilestoneList milestones={[]} />);

    expect(screen.getByText("No milestones found for this project")).toBeInTheDocument();
    expect(
      screen.getByText("Milestones will appear here once they are created"),
    ).toBeInTheDocument();
  });

  it("renders section header with milestone count", () => {
    const milestones = [
      createMilestone({ name: "M1" }),
      createMilestone({ name: "M2" }),
      createMilestone({ name: "M3" }),
    ];
    render(<MilestoneList milestones={milestones} />);

    expect(screen.getByText(/Milestones/)).toBeInTheDocument();
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("renders all milestones", () => {
    const milestones = [
      createMilestone({ name: "Milestone 1" }),
      createMilestone({ name: "Milestone 2" }),
      createMilestone({ name: "Milestone 3" }),
    ];
    render(<MilestoneList milestones={milestones} />);

    expect(screen.getByText("Milestone 1")).toBeInTheDocument();
    expect(screen.getByText("Milestone 2")).toBeInTheDocument();
    expect(screen.getByText("Milestone 3")).toBeInTheDocument();
  });

  it("sorts milestones by orderIndex", () => {
    const milestones = [
      createMilestone({ name: "Third", orderIndex: 2 }),
      createMilestone({ name: "First", orderIndex: 0 }),
      createMilestone({ name: "Second", orderIndex: 1 }),
    ];
    render(<MilestoneList milestones={milestones} />);

    const milestoneNames = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(milestoneNames).toEqual(["First", "Second", "Third"]);
  });

  it("renders milestones with their task counts", () => {
    const tasks1 = [createTask({ status: "complete" }), createTask({ status: "pending" })];
    const tasks2 = [createTask(), createTask(), createTask()];
    const milestones = [
      createMilestone({ name: "M1" }, tasks1),
      createMilestone({ name: "M2" }, tasks2),
    ];
    render(<MilestoneList milestones={milestones} />);

    expect(screen.getByText("1/2 tasks")).toBeInTheDocument();
    expect(screen.getByText("0/3 tasks")).toBeInTheDocument();
  });

  it("handles milestones with no tasks", () => {
    const milestones = [createMilestone({ name: "Empty Milestone" }, [])];
    render(<MilestoneList milestones={milestones} />);

    expect(screen.getByText("Empty Milestone")).toBeInTheDocument();
    expect(screen.getByText("0/0 tasks")).toBeInTheDocument();
  });
});
