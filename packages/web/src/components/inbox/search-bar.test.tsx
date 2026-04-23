/**
 * Search Bar Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "./search-bar";

describe("SearchBar", () => {
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnChange = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rendering", () => {
    it("should render search input", () => {
      render(<SearchBar value="" onChange={mockOnChange} />);
      expect(screen.getByPlaceholderText("Search projects...")).toBeInTheDocument();
    });

    it("should render with custom placeholder", () => {
      render(<SearchBar value="" onChange={mockOnChange} placeholder="Find something..." />);
      expect(screen.getByPlaceholderText("Find something...")).toBeInTheDocument();
    });

    it("should render search icon", () => {
      const { container } = render(<SearchBar value="" onChange={mockOnChange} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it("should render keyboard shortcut hint", () => {
      render(<SearchBar value="" onChange={mockOnChange} />);
      expect(screen.getByText("K")).toBeInTheDocument();
    });
  });

  describe("controlled input", () => {
    it("should display the provided value", () => {
      render(<SearchBar value="test query" onChange={mockOnChange} />);
      const input = screen.getByPlaceholderText("Search projects...") as HTMLInputElement;
      expect(input.value).toBe("test query");
    });

    it("should update when value prop changes", () => {
      const { rerender } = render(<SearchBar value="first" onChange={mockOnChange} />);
      const input = screen.getByPlaceholderText("Search projects...") as HTMLInputElement;
      expect(input.value).toBe("first");

      rerender(<SearchBar value="second" onChange={mockOnChange} />);
      expect(input.value).toBe("second");
    });
  });

  describe("debounced onChange", () => {
    it("should debounce onChange calls by 300ms", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SearchBar value="" onChange={mockOnChange} />);
      const input = screen.getByPlaceholderText("Search projects...");

      // Type text
      await user.type(input, "test");

      // Should not have called onChange yet
      expect(mockOnChange).not.toHaveBeenCalled();

      // Advance timers by 300ms
      await vi.advanceTimersByTimeAsync(300);

      // Now onChange should have been called
      expect(mockOnChange).toHaveBeenCalledWith("test");
    });

    it("should only call onChange once after multiple rapid changes", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SearchBar value="" onChange={mockOnChange} />);
      const input = screen.getByPlaceholderText("Search projects...");

      // Type text
      await user.type(input, "abc");

      // Advance timers by 300ms
      await vi.advanceTimersByTimeAsync(300);

      // Should have been called once with final value
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith("abc");
    });
  });

  describe("clear button", () => {
    it("should not show clear button when input is empty", () => {
      render(<SearchBar value="" onChange={mockOnChange} />);
      const clearButton = screen.queryByRole("button");
      expect(clearButton).not.toBeInTheDocument();
    });

    it("should show clear button when input has value", () => {
      render(<SearchBar value="test" onChange={mockOnChange} />);
      const clearButton = screen.getByRole("button");
      expect(clearButton).toBeInTheDocument();
    });

    it("should clear input when clear button is clicked", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SearchBar value="test" onChange={mockOnChange} />);
      const clearButton = screen.getByRole("button");

      await user.click(clearButton);

      // Should call onChange with empty string immediately
      expect(mockOnChange).toHaveBeenCalledWith("");
    });

    it("should focus input after clearing", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SearchBar value="test" onChange={mockOnChange} />);
      const input = screen.getByPlaceholderText("Search projects...");
      const clearButton = screen.getByRole("button");

      await user.click(clearButton);

      expect(input).toHaveFocus();
    });
  });

  describe("keyboard shortcuts", () => {
    it("should focus input when Cmd+K is pressed", async () => {
      render(<SearchBar value="" onChange={mockOnChange} />);
      const input = screen.getByPlaceholderText("Search projects...") as HTMLInputElement;

      // Simulate Cmd+K (Mac) - create and dispatch event manually
      const event = new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });

    it("should focus input when Ctrl+K is pressed", async () => {
      render(<SearchBar value="" onChange={mockOnChange} />);
      const input = screen.getByPlaceholderText("Search projects...") as HTMLInputElement;

      // Simulate Ctrl+K (Windows/Linux) - create and dispatch event manually
      const event = new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });
  });

  describe("accessibility", () => {
    it("should have accessible input", () => {
      render(<SearchBar value="" onChange={mockOnChange} />);
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });

    it("should have clear button when visible", () => {
      render(<SearchBar value="test" onChange={mockOnChange} />);
      const clearButton = screen.getByRole("button");
      expect(clearButton).toBeInTheDocument();
    });
  });
});
