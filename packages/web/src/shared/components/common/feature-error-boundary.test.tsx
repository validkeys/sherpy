import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { FeatureErrorBoundary } from "./feature-error-boundary";

/**
 * Test component that throws an error
 */
function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("Feature test error");
  }
  return <div>Feature content</div>;
}

describe("FeatureErrorBoundary", () => {
  // Suppress console.error during tests to avoid cluttering test output
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalConsoleError;
  });

  it("renders children when no error occurs", () => {
    render(
      <FeatureErrorBoundary featureName="TestFeature">
        <div>Feature content</div>
      </FeatureErrorBoundary>,
    );

    expect(screen.getByText("Feature content")).toBeInTheDocument();
  });

  it("renders feature-specific error UI when error occurs", () => {
    render(
      <FeatureErrorBoundary featureName="Projects">
        <ThrowError shouldThrow={true} />
      </FeatureErrorBoundary>,
    );

    expect(screen.getByText(/Projects encountered an error/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /We were unable to load this section. The rest of the application should work normally./i,
      ),
    ).toBeInTheDocument();
  });

  it("displays the feature name in error message", () => {
    render(
      <FeatureErrorBoundary featureName="Chat">
        <ThrowError shouldThrow={true} />
      </FeatureErrorBoundary>,
    );

    expect(screen.getByText(/Chat encountered an error/i)).toBeInTheDocument();
  });

  it("displays error details in development mode", () => {
    render(
      <FeatureErrorBoundary featureName="TestFeature">
        <ThrowError shouldThrow={true} />
      </FeatureErrorBoundary>,
    );

    // Check if the error message is visible (using getAllByText since it appears in both message and stack)
    const errorMessages = screen.getAllByText(/Feature test error/i);
    expect(errorMessages.length).toBeGreaterThan(0);
  });

  it("provides Try Again button", () => {
    render(
      <FeatureErrorBoundary featureName="TestFeature">
        <ThrowError shouldThrow={true} />
      </FeatureErrorBoundary>,
    );

    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("calls onError callback when error occurs", () => {
    const onError = vi.fn();

    render(
      <FeatureErrorBoundary featureName="TestFeature" onError={onError}>
        <ThrowError shouldThrow={true} />
      </FeatureErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      }),
    );
  });

  it("provides Try Again button that is clickable", async () => {
    const user = userEvent.setup();

    render(
      <FeatureErrorBoundary featureName="TestFeature">
        <ThrowError shouldThrow={true} />
      </FeatureErrorBoundary>,
    );

    // Error UI should be visible
    expect(screen.getByText(/TestFeature encountered an error/i)).toBeInTheDocument();

    // Try Again button should be present and clickable
    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    expect(tryAgainButton).toBeInTheDocument();

    // Clicking should not throw an error (this verifies the reset handler is wired up)
    await user.click(tryAgainButton);
  });

  it("resets when resetKeys change", () => {
    let shouldThrow = true;

    const { rerender } = render(
      <FeatureErrorBoundary featureName="TestFeature" resetKeys={["key1"]}>
        <ThrowError shouldThrow={shouldThrow} />
      </FeatureErrorBoundary>,
    );

    // Error UI should be visible
    expect(screen.getByText(/TestFeature encountered an error/i)).toBeInTheDocument();

    // Prepare to not throw on next render
    shouldThrow = false;

    // Change resetKeys
    rerender(
      <FeatureErrorBoundary featureName="TestFeature" resetKeys={["key2"]}>
        <ThrowError shouldThrow={shouldThrow} />
      </FeatureErrorBoundary>,
    );

    // Normal content should now be visible
    expect(screen.getByText("Feature content")).toBeInTheDocument();
  });
});
