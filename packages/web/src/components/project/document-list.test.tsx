/**
 * DocumentList component tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { DocumentList } from "./document-list";
import type { Document } from "@sherpy/shared";

// Helper to create test document
function createDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: `doc${Math.random()}`,
    projectId: "p1",
    documentType: "business-requirements",
    format: "yaml",
    content: "# Test content",
    version: 1,
    createdAt: new Date() as any,
    updatedAt: new Date() as any,
    ...overrides,
  };
}

describe("DocumentList", () => {
  it("renders empty state when no documents", () => {
    render(<DocumentList documents={[]} selectedDocumentId={null} onSelectDocument={vi.fn()} />);
    expect(screen.getByText("No documents available")).toBeInTheDocument();
  });

  it("renders list of documents", () => {
    const documents = [
      createDocument({ documentType: "business-requirements", format: "yaml" }),
      createDocument({ documentType: "technical-requirements", format: "markdown" }),
      createDocument({ documentType: "implementation-plan", format: "yaml" }),
    ];
    render(<DocumentList documents={documents} selectedDocumentId={null} onSelectDocument={vi.fn()} />);

    expect(screen.getByText("Business Requirements")).toBeInTheDocument();
    expect(screen.getByText("Technical Requirements")).toBeInTheDocument();
    expect(screen.getByText("Implementation Plan")).toBeInTheDocument();
  });

  it("shows format badge for each document", () => {
    const documents = [
      createDocument({ documentType: "business-requirements", format: "yaml" }),
      createDocument({ documentType: "technical-requirements", format: "markdown" }),
    ];
    render(<DocumentList documents={documents} selectedDocumentId={null} onSelectDocument={vi.fn()} />);

    expect(screen.getByText("yaml")).toBeInTheDocument();
    expect(screen.getByText("markdown")).toBeInTheDocument();
  });

  it("calls onSelectDocument when clicking a document", async () => {
    const user = userEvent.setup();
    const onSelectDocument = vi.fn();
    const documents = [
      createDocument({ id: "doc1", documentType: "business-requirements" }),
      createDocument({ id: "doc2", documentType: "technical-requirements" }),
    ];
    render(<DocumentList documents={documents} selectedDocumentId={null} onSelectDocument={onSelectDocument} />);

    await user.click(screen.getByText("Business Requirements"));
    expect(onSelectDocument).toHaveBeenCalledWith("doc1");

    await user.click(screen.getByText("Technical Requirements"));
    expect(onSelectDocument).toHaveBeenCalledWith("doc2");
  });

  it("highlights selected document", () => {
    const documents = [
      createDocument({ id: "doc1", documentType: "business-requirements" }),
      createDocument({ id: "doc2", documentType: "technical-requirements" }),
    ];
    const { container } = render(<DocumentList documents={documents} selectedDocumentId="doc1" onSelectDocument={vi.fn()} />);

    const selectedItem = container.querySelector('[data-selected="true"]');
    expect(selectedItem).toBeInTheDocument();
    expect(selectedItem).toHaveTextContent("Business Requirements");
  });

  it("displays document version", () => {
    const documents = [
      createDocument({ documentType: "business-requirements", version: 2 }),
    ];
    render(<DocumentList documents={documents} selectedDocumentId={null} onSelectDocument={vi.fn()} />);

    expect(screen.getByText("v2")).toBeInTheDocument();
  });

  it("formats document type names correctly", () => {
    const documents = [
      createDocument({ documentType: "architecture-decision-record" }),
      createDocument({ documentType: "qa-test-plan" }),
      createDocument({ documentType: "executive-summary" }),
    ];
    render(<DocumentList documents={documents} selectedDocumentId={null} onSelectDocument={vi.fn()} />);

    expect(screen.getByText("Architecture Decision Record")).toBeInTheDocument();
    expect(screen.getByText("QA Test Plan")).toBeInTheDocument();
    expect(screen.getByText("Executive Summary")).toBeInTheDocument();
  });

  it("displays created date in relative format", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const documents = [
      createDocument({ createdAt: yesterday as any }),
    ];
    render(<DocumentList documents={documents} selectedDocumentId={null} onSelectDocument={vi.fn()} />);

    // Should show some form of relative time (depends on implementation)
    expect(screen.getByText(/ago|yesterday/i)).toBeInTheDocument();
  });
});
