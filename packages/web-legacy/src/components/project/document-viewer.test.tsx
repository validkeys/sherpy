/**
 * DocumentViewer component tests
 */

import type { Document } from "@sherpy/shared";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DocumentViewer } from "./document-viewer";

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

describe("DocumentViewer", () => {
  it("renders empty state when no document selected", () => {
    render(<DocumentViewer document={null} projectName="Test Project" />);
    expect(screen.getByText("Select a document to view")).toBeInTheDocument();
  });

  it("renders document title and metadata", () => {
    const doc = createDocument({
      documentType: "business-requirements",
      format: "yaml",
      version: 2,
    });
    render(<DocumentViewer document={doc} projectName="Test Project" />);

    expect(screen.getByText("Business Requirements")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText("yaml")).toBeInTheDocument();
  });

  it("renders YAML content with syntax highlighting", () => {
    const doc = createDocument({
      format: "yaml",
      content: "key: value\nname: test",
    });
    const { container } = render(<DocumentViewer document={doc} />);

    // Content should be visible - check for presence in the code block
    const codeBlock = container.querySelector("pre");
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock?.textContent).toContain("key");
    expect(codeBlock?.textContent).toContain("value");
  });

  it("renders markdown content with syntax highlighting", () => {
    const doc = createDocument({
      format: "markdown",
      content: "# Heading\n\nParagraph text",
    });
    const { container } = render(<DocumentViewer document={doc} />);

    const codeBlock = container.querySelector("pre");
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock?.textContent).toContain("# Heading");
    expect(codeBlock?.textContent).toContain("Paragraph text");
  });

  it("renders JSON content with syntax highlighting", () => {
    const doc = createDocument({
      format: "json",
      content: '{"name": "test", "value": 123}',
    });
    const { container } = render(<DocumentViewer document={doc} />);

    const codeBlock = container.querySelector("pre");
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock?.textContent).toContain('"name"');
    expect(codeBlock?.textContent).toContain('"test"');
  });

  it("has copy to clipboard button", () => {
    const doc = createDocument({ content: "test content" });
    render(<DocumentViewer document={doc} projectName="Test Project" />);

    const copyButton = screen.getByRole("button", { name: /copy/i });
    expect(copyButton).toBeInTheDocument();
  });

  it("copies content to clipboard when copy button clicked", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);

    // Mock navigator.clipboard
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    const doc = createDocument({ content: "test content" });
    render(<DocumentViewer document={doc} projectName="Test Project" />);

    const copyButton = screen.getByRole("button", { name: /copy/i });
    await user.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith("test content");
  });

  it("has line numbers toggle button", () => {
    const doc = createDocument({ content: "line 1\nline 2" });
    render(<DocumentViewer document={doc} projectName="Test Project" />);

    const toggleButton = screen.getByRole("button", { name: /line numbers/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it("toggles line numbers on and off", async () => {
    const user = userEvent.setup();
    const doc = createDocument({
      format: "yaml",
      content: "line1: value1\nline2: value2",
    });
    const { container } = render(<DocumentViewer document={doc} />);

    const toggleButton = screen.getByRole("button", { name: /line numbers/i });

    // Line numbers should be on by default
    expect(container.querySelector(".line-number")).toBeInTheDocument();

    // Toggle off
    await user.click(toggleButton);
    expect(container.querySelector(".line-number")).not.toBeInTheDocument();

    // Toggle back on
    await user.click(toggleButton);
    expect(container.querySelector(".line-number")).toBeInTheDocument();
  });

  it("displays line numbers when enabled", () => {
    const doc = createDocument({
      content: "line 1\nline 2\nline 3",
    });
    const { container } = render(<DocumentViewer document={doc} />);

    // Should have line number elements
    const lineNumbers = container.querySelectorAll(".line-number");
    expect(lineNumbers.length).toBeGreaterThan(0);
  });

  it("applies correct language for syntax highlighting", () => {
    const yamlDoc = createDocument({ format: "yaml" });
    const { container: yamlContainer } = render(<DocumentViewer document={yamlDoc} />);
    expect(yamlContainer.querySelector('[class*="language-yaml"]')).toBeInTheDocument();

    const jsonDoc = createDocument({ format: "json" });
    const { container: jsonContainer } = render(<DocumentViewer document={jsonDoc} />);
    expect(jsonContainer.querySelector('[class*="language-json"]')).toBeInTheDocument();

    const mdDoc = createDocument({ format: "markdown" });
    const { container: mdContainer } = render(<DocumentViewer document={mdDoc} />);
    expect(mdContainer.querySelector('[class*="language-markdown"]')).toBeInTheDocument();
  });

  it("handles empty content gracefully", () => {
    const doc = createDocument({ content: "" });
    render(<DocumentViewer document={doc} projectName="Test Project" />);

    // Should render without errors and show empty state or placeholder
    expect(screen.getByText("Business Requirements")).toBeInTheDocument();
  });

  it("includes PDF export button when document is present", () => {
    const doc = createDocument();
    render(<DocumentViewer document={doc} projectName="Test Project" />);

    const exportButton = screen.getByRole("button", { name: /export pdf/i });
    expect(exportButton).toBeInTheDocument();
  });
});
