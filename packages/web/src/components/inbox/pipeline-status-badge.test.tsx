/**
 * Pipeline Status Badge Component Tests
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PipelineStatusBadge } from "./pipeline-status-badge";

describe("PipelineStatusBadge", () => {
  describe("pipeline status rendering", () => {
    it("should render Intake status", () => {
      render(<PipelineStatusBadge status="intake" />);
      expect(screen.getByText("Intake")).toBeInTheDocument();
    });

    it("should render Gap Analysis status", () => {
      render(<PipelineStatusBadge status="gap-analysis" />);
      expect(screen.getByText("Gap Analysis")).toBeInTheDocument();
    });

    it("should render Business Req status", () => {
      render(<PipelineStatusBadge status="business-requirements" />);
      expect(screen.getByText("Business Req")).toBeInTheDocument();
    });

    it("should render Technical Req status", () => {
      render(<PipelineStatusBadge status="technical-requirements" />);
      expect(screen.getByText("Technical Req")).toBeInTheDocument();
    });

    it("should render Style Anchors status", () => {
      render(<PipelineStatusBadge status="style-anchors" />);
      expect(screen.getByText("Style Anchors")).toBeInTheDocument();
    });

    it("should render Planning status", () => {
      render(<PipelineStatusBadge status="implementation-planning" />);
      expect(screen.getByText("Planning")).toBeInTheDocument();
    });

    it("should render Review status", () => {
      render(<PipelineStatusBadge status="plan-review" />);
      expect(screen.getByText("Review")).toBeInTheDocument();
    });

    it("should render Architecture status", () => {
      render(<PipelineStatusBadge status="architecture-decisions" />);
      expect(screen.getByText("Architecture")).toBeInTheDocument();
    });

    it("should render Timeline status", () => {
      render(<PipelineStatusBadge status="delivery-timeline" />);
      expect(screen.getByText("Timeline")).toBeInTheDocument();
    });

    it("should render QA Plan status", () => {
      render(<PipelineStatusBadge status="qa-test-plan" />);
      expect(screen.getByText("QA Plan")).toBeInTheDocument();
    });

    it("should render Summaries status", () => {
      render(<PipelineStatusBadge status="summaries" />);
      expect(screen.getByText("Summaries")).toBeInTheDocument();
    });

    it("should render Active status", () => {
      render(<PipelineStatusBadge status="active-development" />);
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("should render Complete status", () => {
      render(<PipelineStatusBadge status="completed" />);
      expect(screen.getByText("Complete")).toBeInTheDocument();
    });

    it("should render Archived status", () => {
      render(<PipelineStatusBadge status="archived" />);
      expect(screen.getByText("Archived")).toBeInTheDocument();
    });

    it("should render unknown status as-is", () => {
      render(<PipelineStatusBadge status="unknown-status" />);
      expect(screen.getByText("unknown-status")).toBeInTheDocument();
    });
  });

  describe("badge sizes", () => {
    it("should render small badge", () => {
      const { container } = render(<PipelineStatusBadge status="intake" size="sm" />);
      const badge = container.querySelector(".text-xs");
      expect(badge).toBeInTheDocument();
    });

    it("should render medium badge by default", () => {
      const { container } = render(<PipelineStatusBadge status="intake" />);
      const badge = container.querySelector(".text-xs");
      expect(badge).toBeInTheDocument();
    });

    it("should render large badge", () => {
      const { container } = render(<PipelineStatusBadge status="intake" size="lg" />);
      const badge = container.querySelector(".text-sm");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should have transition classes for animations", () => {
      const { container } = render(<PipelineStatusBadge status="intake" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass("transition-all");
    });

    it("should have appropriate status color classes", () => {
      const { container } = render(<PipelineStatusBadge status="active-development" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass("bg-green-500");
    });
  });
});
