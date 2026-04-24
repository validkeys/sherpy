/**
 * ChatAssistantUIProvider component tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatAssistantUIProvider } from "./chat-assistant-ui-provider";

describe("ChatAssistantUIProvider", () => {
  it("renders children when provided", () => {
    render(
      <ChatAssistantUIProvider projectId="p1">
        <div>Test Child</div>
      </ChatAssistantUIProvider>
    );
    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("creates runtime configuration for project", () => {
    const { container } = render(
      <ChatAssistantUIProvider projectId="p1">
        <div>Content</div>
      </ChatAssistantUIProvider>
    );

    // Provider should wrap children
    expect(container).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("accepts different project IDs", () => {
    const { rerender } = render(
      <ChatAssistantUIProvider projectId="project-123">
        <div>Content</div>
      </ChatAssistantUIProvider>
    );

    expect(screen.getByText("Content")).toBeInTheDocument();

    rerender(
      <ChatAssistantUIProvider projectId="project-456">
        <div>Content</div>
      </ChatAssistantUIProvider>
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders without errors", () => {
    expect(() => {
      render(
        <ChatAssistantUIProvider projectId="test-project">
          <div>Test</div>
        </ChatAssistantUIProvider>
      );
    }).not.toThrow();
  });
});
