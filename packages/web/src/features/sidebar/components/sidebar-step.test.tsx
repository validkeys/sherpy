/**
 * Unit tests for SidebarStep component
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WorkflowStepConfig } from "../types";
import { SidebarStep } from "./sidebar-step";

const mockStep: WorkflowStepConfig = {
  id: "business-requirements",
  name: "Business Requirements",
  description: "Define business goals, stakeholders, and success criteria",
};

describe("SidebarStep", () => {
  describe("rendering", () => {
    it("renders step name", () => {
      render(<SidebarStep step={mockStep} status="pending" isActive={false} onClick={vi.fn()} />);
      expect(screen.getByText("Business Requirements")).toBeInTheDocument();
    });

    it("renders step description", () => {
      render(<SidebarStep step={mockStep} status="pending" isActive={false} onClick={vi.fn()} />);
      expect(
        screen.getByText("Define business goals, stakeholders, and success criteria"),
      ).toBeInTheDocument();
    });

    it("renders StepIndicator with correct status", () => {
      const { container } = render(
        <SidebarStep step={mockStep} status="complete" isActive={false} onClick={vi.fn()} />,
      );
      const indicator = container.querySelector(".bg-green-500");
      expect(indicator).toBeInTheDocument();
    });

    it("renders all status variants correctly", () => {
      const { container: completeContainer, unmount: unmountComplete } = render(
        <SidebarStep step={mockStep} status="complete" isActive={false} onClick={vi.fn()} />,
      );
      expect(completeContainer.querySelector(".bg-green-500")).toBeInTheDocument();
      unmountComplete();

      const { container: currentContainer, unmount: unmountCurrent } = render(
        <SidebarStep step={mockStep} status="current" isActive={false} onClick={vi.fn()} />,
      );
      expect(currentContainer.querySelector(".bg-blue-500")).toBeInTheDocument();
      unmountCurrent();

      const { container: pendingContainer } = render(
        <SidebarStep step={mockStep} status="pending" isActive={false} onClick={vi.fn()} />,
      );
      expect(pendingContainer.querySelector(".bg-gray-300")).toBeInTheDocument();
    });
  });

  describe("active state", () => {
    it("applies active styling when isActive is true", () => {
      const { container } = render(
        <SidebarStep step={mockStep} status="current" isActive={true} onClick={vi.fn()} />,
      );
      const stepElement = container.firstChild as HTMLElement;
      expect(stepElement).toHaveClass("bg-blue-50");
      expect(stepElement).toHaveClass("border-blue-200");
    });

    it("does not apply active styling when isActive is false", () => {
      const { container } = render(
        <SidebarStep step={mockStep} status="pending" isActive={false} onClick={vi.fn()} />,
      );
      const stepElement = container.firstChild as HTMLElement;
      expect(stepElement).not.toHaveClass("bg-blue-50");
      expect(stepElement).toHaveClass("border-transparent");
    });

    it("sets aria-current when active", () => {
      const { container } = render(
        <SidebarStep step={mockStep} status="current" isActive={true} onClick={vi.fn()} />,
      );
      const stepElement = container.firstChild as HTMLElement;
      expect(stepElement).toHaveAttribute("aria-current", "step");
    });

    it("does not set aria-current when not active", () => {
      const { container } = render(
        <SidebarStep step={mockStep} status="pending" isActive={false} onClick={vi.fn()} />,
      );
      const stepElement = container.firstChild as HTMLElement;
      expect(stepElement).not.toHaveAttribute("aria-current");
    });
  });

  describe("click handling", () => {
    it("calls onClick when component is clicked", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <SidebarStep step={mockStep} status="pending" isActive={false} onClick={handleClick} />,
      );

      const stepElement = screen.getByRole("button", {
        name: "Navigate to Business Requirements",
      });
      await user.click(stepElement);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("calls onClick on Enter key press", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <SidebarStep step={mockStep} status="pending" isActive={false} onClick={handleClick} />,
      );

      const stepElement = screen.getByRole("button", {
        name: "Navigate to Business Requirements",
      });
      stepElement.focus();
      await user.keyboard("{Enter}");

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("calls onClick on Space key press", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <SidebarStep step={mockStep} status="pending" isActive={false} onClick={handleClick} />,
      );

      const stepElement = screen.getByRole("button", {
        name: "Navigate to Business Requirements",
      });
      stepElement.focus();
      await user.keyboard(" ");

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick on other key presses", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <SidebarStep step={mockStep} status="pending" isActive={false} onClick={handleClick} />,
      );

      const stepElement = screen.getByRole("button", {
        name: "Navigate to Business Requirements",
      });
      stepElement.focus();
      await user.keyboard("a");

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it('has role="button"', () => {
      render(<SidebarStep step={mockStep} status="pending" isActive={false} onClick={vi.fn()} />);
      const stepElement = screen.getByRole("button");
      expect(stepElement).toBeInTheDocument();
    });

    it("has appropriate aria-label", () => {
      render(<SidebarStep step={mockStep} status="pending" isActive={false} onClick={vi.fn()} />);
      const stepElement = screen.getByRole("button", {
        name: "Navigate to Business Requirements",
      });
      expect(stepElement).toBeInTheDocument();
    });

    it("is keyboard accessible with tabIndex", () => {
      const { container } = render(
        <SidebarStep step={mockStep} status="pending" isActive={false} onClick={vi.fn()} />,
      );
      const stepElement = container.firstChild as HTMLElement;
      expect(stepElement).toHaveAttribute("tabIndex", "0");
    });

    it("can be focused with keyboard", () => {
      render(<SidebarStep step={mockStep} status="pending" isActive={false} onClick={vi.fn()} />);
      const stepElement = screen.getByRole("button");
      stepElement.focus();
      expect(document.activeElement).toBe(stepElement);
    });
  });

  describe("ref forwarding", () => {
    it("forwards ref to div element", () => {
      const ref = { current: null as HTMLDivElement | null };
      render(
        <SidebarStep
          step={mockStep}
          status="pending"
          isActive={false}
          onClick={vi.fn()}
          ref={ref}
        />,
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("custom props", () => {
    it("merges custom className", () => {
      const { container } = render(
        <SidebarStep
          step={mockStep}
          status="pending"
          isActive={false}
          onClick={vi.fn()}
          className="custom-class"
        />,
      );
      const stepElement = container.firstChild as HTMLElement;
      expect(stepElement).toHaveClass("custom-class");
      expect(stepElement).toHaveClass("flex"); // Still has base classes
    });

    it("passes through additional HTML attributes", () => {
      const { container } = render(
        <SidebarStep
          step={mockStep}
          status="pending"
          isActive={false}
          onClick={vi.fn()}
          data-testid="custom-step"
        />,
      );
      const stepElement = container.firstChild as HTMLElement;
      expect(stepElement).toHaveAttribute("data-testid", "custom-step");
    });
  });
});
