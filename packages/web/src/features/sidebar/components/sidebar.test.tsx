/**
 * Integration tests for Sidebar component
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider, createStore } from "jotai";
import { beforeEach, describe, expect, it } from "vitest";
import { completedStepsAtom, currentStepAtom } from "../state/workflow-atoms";
import { Sidebar } from "./sidebar";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("Sidebar", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    localStorageMock.clear();
    store = createStore();
  });

  const renderSidebar = () => {
    return render(
      <Provider store={store}>
        <Sidebar />
      </Provider>,
    );
  };

  describe("initial render", () => {
    it("renders the sidebar header", () => {
      renderSidebar();
      expect(screen.getByText("Workflow Steps")).toBeInTheDocument();
      expect(
        screen.getByText("Track your progress through the Sherpy planning pipeline"),
      ).toBeInTheDocument();
    });

    it("renders all 10 workflow steps", () => {
      renderSidebar();
      const stepButtons = screen.getAllByRole("button");
      expect(stepButtons).toHaveLength(10);
    });

    it("renders step names correctly", () => {
      renderSidebar();
      expect(screen.getByText("Intake")).toBeInTheDocument();
      expect(screen.getByText("Gap Analysis")).toBeInTheDocument();
      expect(screen.getByText("Business Requirements")).toBeInTheDocument();
      expect(screen.getByText("Technical Requirements")).toBeInTheDocument();
      expect(screen.getByText("Style Anchors")).toBeInTheDocument();
      expect(screen.getByText("Implementation Planning")).toBeInTheDocument();
      expect(screen.getByText("Plan Review")).toBeInTheDocument();
      expect(screen.getByText("Architecture Decisions")).toBeInTheDocument();
      expect(screen.getByText("Delivery Timeline")).toBeInTheDocument();
      expect(screen.getByText("QA Test Plan")).toBeInTheDocument();
    });

    it("renders first step as current by default", () => {
      renderSidebar();
      const intakeButton = screen.getByRole("button", {
        name: "Navigate to Intake",
      });
      expect(intakeButton).toHaveAttribute("aria-current", "step");
    });

    it("renders correct status indicators", () => {
      const { container } = renderSidebar();
      // First step should be current (blue)
      const currentIndicator = container.querySelector(".bg-blue-500");
      expect(currentIndicator).toBeInTheDocument();

      // Other steps should be pending (gray)
      const pendingIndicators = container.querySelectorAll(".bg-gray-300");
      expect(pendingIndicators.length).toBeGreaterThan(0);
    });
  });

  describe("step navigation", () => {
    it("updates current step when a step is clicked", async () => {
      const user = userEvent.setup();
      renderSidebar();

      const businessReqButton = screen.getByRole("button", {
        name: "Navigate to Business Requirements",
      });

      await user.click(businessReqButton);

      // Verify state updated
      expect(store.get(currentStepAtom)).toBe("business-requirements");

      // Verify UI reflects change
      expect(businessReqButton).toHaveAttribute("aria-current", "step");
    });

    it("removes current status from previous step", async () => {
      const user = userEvent.setup();
      renderSidebar();

      const intakeButton = screen.getByRole("button", {
        name: "Navigate to Intake",
      });
      const gapAnalysisButton = screen.getByRole("button", {
        name: "Navigate to Gap Analysis",
      });

      // Initially intake should be current
      expect(intakeButton).toHaveAttribute("aria-current", "step");

      // Click gap analysis
      await user.click(gapAnalysisButton);

      // Verify intake is no longer current
      expect(intakeButton).not.toHaveAttribute("aria-current");
      expect(gapAnalysisButton).toHaveAttribute("aria-current", "step");
    });

    it("can navigate between multiple steps", async () => {
      const user = userEvent.setup();
      renderSidebar();

      // Navigate through sequence: intake → business-requirements → qa-test-plan
      const businessReqButton = screen.getByRole("button", {
        name: "Navigate to Business Requirements",
      });
      await user.click(businessReqButton);
      expect(store.get(currentStepAtom)).toBe("business-requirements");

      const qaTestPlanButton = screen.getByRole("button", {
        name: "Navigate to QA Test Plan",
      });
      await user.click(qaTestPlanButton);
      expect(store.get(currentStepAtom)).toBe("qa-test-plan");

      // Go back to earlier step
      const styleAnchorsButton = screen.getByRole("button", {
        name: "Navigate to Style Anchors",
      });
      await user.click(styleAnchorsButton);
      expect(store.get(currentStepAtom)).toBe("style-anchors");
    });
  });

  describe("status updates", () => {
    it("marks completed steps correctly", () => {
      store.set(completedStepsAtom, ["intake", "gap-analysis"]);
      store.set(currentStepAtom, "business-requirements");

      const { container } = renderSidebar();

      // Completed steps should have green indicators
      const completeIndicators = container.querySelectorAll(".bg-green-500");
      expect(completeIndicators.length).toBe(2);

      // Current step should have blue indicator
      const currentIndicators = container.querySelectorAll(".bg-blue-500");
      expect(currentIndicators.length).toBe(1);
    });

    it("reflects status changes in UI", async () => {
      const user = userEvent.setup();
      store.set(completedStepsAtom, ["intake"]);
      const { container } = renderSidebar();

      // Intake should show as complete (green)
      const completeIndicators = container.querySelectorAll(".bg-green-500");
      expect(completeIndicators.length).toBeGreaterThan(0);

      // Click on gap analysis (should become current/blue)
      const gapAnalysisButton = screen.getByRole("button", {
        name: "Navigate to Gap Analysis",
      });
      await user.click(gapAnalysisButton);

      // Gap analysis should now be current
      expect(store.get(currentStepAtom)).toBe("gap-analysis");
      expect(gapAnalysisButton).toHaveAttribute("aria-current", "step");
    });
  });

  describe("keyboard navigation", () => {
    it("navigates on Enter key press", async () => {
      const user = userEvent.setup();
      renderSidebar();

      const technicalReqButton = screen.getByRole("button", {
        name: "Navigate to Technical Requirements",
      });

      technicalReqButton.focus();
      await user.keyboard("{Enter}");

      expect(store.get(currentStepAtom)).toBe("technical-requirements");
      expect(technicalReqButton).toHaveAttribute("aria-current", "step");
    });

    it("navigates on Space key press", async () => {
      const user = userEvent.setup();
      renderSidebar();

      const deliveryTimelineButton = screen.getByRole("button", {
        name: "Navigate to Delivery Timeline",
      });

      deliveryTimelineButton.focus();
      await user.keyboard(" ");

      expect(store.get(currentStepAtom)).toBe("delivery-timeline");
      expect(deliveryTimelineButton).toHaveAttribute("aria-current", "step");
    });

    it("can tab through all steps", async () => {
      const user = userEvent.setup();
      renderSidebar();

      const allButtons = screen.getAllByRole("button");

      // Tab through first few steps
      allButtons[0].focus();
      expect(document.activeElement).toBe(allButtons[0]);

      await user.tab();
      expect(document.activeElement).toBe(allButtons[1]);

      await user.tab();
      expect(document.activeElement).toBe(allButtons[2]);
    });
  });

  describe("component structure", () => {
    it("renders as an aside element", () => {
      const { container } = renderSidebar();
      const aside = container.querySelector("aside");
      expect(aside).toBeInTheDocument();
    });

    it("has correct width styling", () => {
      const { container } = renderSidebar();
      const aside = container.querySelector("aside");
      expect(aside).toHaveClass("w-1/3");
    });

    it("has full height styling", () => {
      const { container } = renderSidebar();
      const aside = container.querySelector("aside");
      expect(aside).toHaveClass("h-screen");
    });

    it("has scrollable step list", () => {
      const { container } = renderSidebar();
      const nav = container.querySelector("nav");
      expect(nav).toHaveClass("overflow-y-auto");
    });

    it("renders nav element for step list", () => {
      const { container } = renderSidebar();
      const nav = container.querySelector("nav");
      expect(nav).toBeInTheDocument();
    });
  });

  describe("state integration", () => {
    it("reads from currentStepAtom", () => {
      store.set(currentStepAtom, "architecture-decisions");
      renderSidebar();

      const architectureButton = screen.getByRole("button", {
        name: "Navigate to Architecture Decisions",
      });
      expect(architectureButton).toHaveAttribute("aria-current", "step");
    });

    it("updates currentStepAtom on click", async () => {
      const user = userEvent.setup();
      renderSidebar();

      expect(store.get(currentStepAtom)).toBe("intake"); // default

      const planReviewButton = screen.getByRole("button", {
        name: "Navigate to Plan Review",
      });
      await user.click(planReviewButton);

      expect(store.get(currentStepAtom)).toBe("plan-review");
    });

    it("reflects completedStepsAtom in status indicators", () => {
      store.set(completedStepsAtom, [
        "intake",
        "gap-analysis",
        "business-requirements",
        "technical-requirements",
      ]);
      store.set(currentStepAtom, "style-anchors");

      const { container } = renderSidebar();

      // Should have 4 completed (green) indicators
      const completeIndicators = container.querySelectorAll(".bg-green-500");
      expect(completeIndicators.length).toBe(4);

      // Should have 1 current (blue) indicator
      const currentIndicators = container.querySelectorAll(".bg-blue-500");
      expect(currentIndicators.length).toBe(1);

      // Should have 5 pending (gray) indicators
      const pendingIndicators = container.querySelectorAll(".bg-gray-300");
      expect(pendingIndicators.length).toBe(5);
    });
  });
});
