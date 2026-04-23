/**
 * DocumentPdfExport component tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { DocumentPdfExport } from "./document-pdf-export";
import type { Document } from "@sherpy/shared";

// Helper to create test document
function createDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: `doc${Math.random()}`,
    projectId: "p1",
    documentType: "business-requirements",
    format: "yaml",
    content: "key: value\nname: test",
    version: 1,
    createdAt: new Date() as any,
    updatedAt: new Date() as any,
    ...overrides,
  };
}

describe("DocumentPdfExport", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it("renders export button", () => {
    const doc = createDocument();
    render(<DocumentPdfExport document={doc} projectName="Test Project" />);

    const button = screen.getByRole("button", { name: /export pdf/i });
    expect(button).toBeInTheDocument();
  });

  it("button is disabled when no document provided", () => {
    render(<DocumentPdfExport document={null} projectName="Test Project" />);

    const button = screen.getByRole("button", { name: /export pdf/i });
    expect(button).toBeDisabled();
  });

  it("calls window.print when button clicked", async () => {
    const user = userEvent.setup();
    const printMock = vi.fn();
    const closeMock = vi.fn();
    const focusMock = vi.fn();

    const mockWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
      print: printMock,
      close: closeMock,
      focus: focusMock,
      onload: null as (() => void) | null,
    };

    window.open = vi.fn().mockReturnValue(mockWindow);

    const doc = createDocument();
    render(<DocumentPdfExport document={doc} projectName="Test Project" />);

    const button = screen.getByRole("button", { name: /export pdf/i });
    await user.click(button);

    // Trigger the onload callback
    if (mockWindow.onload) {
      mockWindow.onload();
    }

    expect(printMock).toHaveBeenCalled();
  });

  it("creates print-friendly content before printing", async () => {
    const user = userEvent.setup();
    const printMock = vi.fn();
    const writeMock = vi.fn();

    const mockWindow = {
      document: {
        write: writeMock,
        close: vi.fn(),
      },
      print: printMock,
      close: vi.fn(),
      focus: vi.fn(),
      onload: null as (() => void) | null,
    };

    window.open = vi.fn().mockReturnValue(mockWindow);

    const doc = createDocument({
      documentType: "technical-requirements",
      content: "test content",
    });
    render(<DocumentPdfExport document={doc} projectName="My Project" />);

    const button = screen.getByRole("button", { name: /export pdf/i });
    await user.click(button);

    // Trigger the onload callback
    if (mockWindow.onload) {
      mockWindow.onload();
    }

    // Should have called write with HTML content
    expect(writeMock).toHaveBeenCalled();
    // Should have called print
    expect(printMock).toHaveBeenCalled();
  });

  it("displays download icon in button", () => {
    const doc = createDocument();
    const { container } = render(
      <DocumentPdfExport document={doc} projectName="Test Project" />
    );

    // Download icon should be present
    const button = screen.getByRole("button", { name: /export pdf/i });
    expect(button).toBeInTheDocument();

    // Check for SVG (lucide-react icons render as SVG)
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it("handles print errors gracefully", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    window.open = vi.fn(() => {
      throw new Error("Print failed");
    });

    const doc = createDocument();
    render(<DocumentPdfExport document={doc} projectName="Test Project" />);

    const button = screen.getByRole("button", { name: /export pdf/i });

    // Should not throw
    await user.click(button);

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("formats document type in printed content", async () => {
    const user = userEvent.setup();
    const printMock = vi.fn();
    const writeMock = vi.fn();

    const mockWindow = {
      document: {
        write: writeMock,
        close: vi.fn(),
      },
      print: printMock,
      close: vi.fn(),
      focus: vi.fn(),
      onload: null as (() => void) | null,
    };

    window.open = vi.fn().mockReturnValue(mockWindow);

    const doc = createDocument({
      documentType: "qa-test-plan",
    });
    render(<DocumentPdfExport document={doc} projectName="Test Project" />);

    const button = screen.getByRole("button", { name: /export pdf/i });
    await user.click(button);

    // Trigger the onload callback
    if (mockWindow.onload) {
      mockWindow.onload();
    }

    // Verify the content includes the formatted document type
    expect(writeMock).toHaveBeenCalled();
    const htmlContent = writeMock.mock.calls[0]?.[0] as string;
    expect(htmlContent).toContain("QA Test Plan");
    expect(printMock).toHaveBeenCalled();
  });
});
