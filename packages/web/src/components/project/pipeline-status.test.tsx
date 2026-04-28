/**
 * PipelineStatusVisualization component tests
 */

import type { PipelineStatus } from "@sherpy/shared";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineStatusVisualization } from "./pipeline-status";

// Mock the hooks
vi.mock("@/hooks/use-project-events", () => ({
  useProjectEvents: vi.fn(() => ({ latestEvent: null })),
}));

vi.mock("@/hooks/use-diagnostic", () => ({
  useDiagnostic: vi.fn(),
}));

describe("PipelineStatusVisualization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders pipeline status heading", () => {
    render(<PipelineStatusVisualization projectId="test-project" currentStatus="intake" />);

    expect(screen.getByText("Pipeline Status")).toBeInTheDocument();
  });

  it("highlights current stage correctly", () => {
    render(
      <PipelineStatusVisualization
        projectId="test-project"
        currentStatus="business-requirements"
      />,
    );

    // Find the Business Req stage badge
    const businessReqBadge = screen.getByLabelText(/Business Req - current/i);
    expect(businessReqBadge).toBeInTheDocument();
    expect(businessReqBadge).toHaveClass("bg-blue-500");
  });

  it("dims completed stages", () => {
    render(
      <PipelineStatusVisualization
        projectId="test-project"
        currentStatus="technical-requirements"
      />,
    );

    // Earlier stages should be marked completed
    const intakeBadge = screen.getByLabelText(/Intake - completed/i);
    const gapAnalysisBadge = screen.getByLabelText(/Gap Analysis - completed/i);
    const businessReqBadge = screen.getByLabelText(/Business Req - completed/i);

    expect(intakeBadge).toHaveClass("bg-green-500");
    expect(gapAnalysisBadge).toHaveClass("bg-green-500");
    expect(businessReqBadge).toHaveClass("bg-green-500");
  });

  it("greys out upcoming stages", () => {
    render(<PipelineStatusVisualization projectId="test-project" currentStatus="intake" />);

    // Later stages should be marked upcoming
    const gapAnalysisBadge = screen.getByLabelText(/Gap Analysis - upcoming/i);
    const businessReqBadge = screen.getByLabelText(/Business Req - upcoming/i);

    expect(gapAnalysisBadge).toHaveClass("bg-muted");
    expect(businessReqBadge).toHaveClass("bg-muted");
  });

  it("renders all pipeline stages", () => {
    render(<PipelineStatusVisualization projectId="test-project" currentStatus="intake" />);

    // Check for all stage labels
    expect(screen.getByText("Intake")).toBeInTheDocument();
    expect(screen.getByText("Gap Analysis")).toBeInTheDocument();
    expect(screen.getByText("Business Req")).toBeInTheDocument();
    expect(screen.getByText("Technical Req")).toBeInTheDocument();
    expect(screen.getByText("Style Anchors")).toBeInTheDocument();
    expect(screen.getByText("Planning")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Architecture")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText("QA Plan")).toBeInTheDocument();
    expect(screen.getByText("Summaries")).toBeInTheDocument();
    expect(screen.getByText("Development")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("handles single-stage pipeline (intake)", () => {
    render(<PipelineStatusVisualization projectId="test-project" currentStatus="intake" />);

    const intakeBadge = screen.getByLabelText(/Intake - current/i);
    expect(intakeBadge).toHaveClass("bg-blue-500");
  });

  it("handles final stage (completed)", () => {
    render(<PipelineStatusVisualization projectId="test-project" currentStatus="completed" />);

    const completedBadge = screen.getByLabelText(/Complete - current/i);
    expect(completedBadge).toHaveClass("bg-blue-500");

    // All earlier stages should be completed
    const intakeBadge = screen.getByLabelText(/Intake - completed/i);
    expect(intakeBadge).toHaveClass("bg-green-500");
  });

  it("handles archived status with special UI", () => {
    render(
      <PipelineStatusVisualization
        projectId="test-project"
        currentStatus="archived"
        as
        PipelineStatus
      />,
    );

    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByText("This project has been archived")).toBeInTheDocument();

    // Should not show the normal pipeline stages
    expect(screen.queryByText("Intake")).not.toBeInTheDocument();
  });

  it("updates status when WebSocket event received", async () => {
    const { useProjectEvents } = await import("@/hooks/use-project-events");

    // Start at intake
    const { rerender } = render(
      <PipelineStatusVisualization projectId="test-project" currentStatus="intake" />,
    );

    // Verify initial state
    expect(screen.getByLabelText(/Intake - current/i)).toBeInTheDocument();

    // Simulate WebSocket event
    vi.mocked(useProjectEvents).mockReturnValue({
      latestEvent: {
        type: "pipeline-status-changed",
        payload: {
          projectId: "test-project",
          oldStatus: "intake",
          newStatus: "gap-analysis",
        },
      } as any,
    });

    // Force re-render
    rerender(<PipelineStatusVisualization projectId="test-project" currentStatus="intake" />);

    // Wait for the status to update
    await waitFor(() => {
      const gapAnalysisBadge = screen.getByLabelText(/Gap Analysis - current/i);
      expect(gapAnalysisBadge).toBeInTheDocument();
    });
  });

  it("provides accessible screen reader text", () => {
    render(
      <PipelineStatusVisualization
        projectId="test-project"
        currentStatus="business-requirements"
      />,
    );

    // Check for sr-only text that announces stage
    const srText = screen.getByText(/Stage \d+ of \d+:/i);
    expect(srText).toBeInTheDocument();
    expect(srText).toHaveClass("sr-only");
  });

  it("renders responsive layouts (desktop and mobile)", () => {
    const { container } = render(
      <PipelineStatusVisualization projectId="test-project" currentStatus="intake" />,
    );

    // Desktop layout should be hidden on mobile
    const desktopLayout = container.querySelector(".hidden.lg\\:block");
    expect(desktopLayout).toBeInTheDocument();

    // Mobile layout should be hidden on desktop
    const mobileLayout = container.querySelector(".lg\\:hidden");
    expect(mobileLayout).toBeInTheDocument();
  });

  it("shows check icons for completed stages", () => {
    render(
      <PipelineStatusVisualization
        projectId="test-project"
        currentStatus="technical-requirements"
      />,
    );

    // Check for presence of check icons (via aria-hidden SVGs in completed badges)
    const completedBadges = [
      screen.getByLabelText(/Intake - completed/i),
      screen.getByLabelText(/Gap Analysis - completed/i),
      screen.getByLabelText(/Business Req - completed/i),
    ];

    completedBadges.forEach((badge) => {
      // Check icons should be present in completed stage badges
      const icon = badge.querySelector('svg[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  it("shows numbered badges for upcoming and current stages", () => {
    render(<PipelineStatusVisualization projectId="test-project" currentStatus="intake" />);

    // Current stage (intake) should show "1"
    const intakeBadge = screen.getByLabelText(/Intake - current/i);
    expect(intakeBadge.textContent).toContain("1");

    // Upcoming stages should show their numbers
    const gapAnalysisBadge = screen.getByLabelText(/Gap Analysis - upcoming/i);
    expect(gapAnalysisBadge.textContent).toContain("2");
  });
});
