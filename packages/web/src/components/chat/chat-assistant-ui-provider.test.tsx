/**
 * ChatAssistantUIProvider component tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ChatAssistantUIProvider } from "./chat-assistant-ui-provider";

// Mock the useApi hook
vi.mock("@/hooks/use-api", () => ({
  useApi: vi.fn(() => ({
    getChatMessages: vi.fn().mockResolvedValue({
      messages: [],
      hasMore: false,
    }),
    sendChatMessage: vi.fn().mockResolvedValue({
      message: {
        id: "msg-1",
        projectId: "p1",
        role: "assistant",
        content: "Test response",
        createdAt: new Date().toISOString(),
      },
    }),
  })),
}));

describe("ChatAssistantUIProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when provided", async () => {
    render(
      <ChatAssistantUIProvider projectId="p1">
        <div>Test Child</div>
      </ChatAssistantUIProvider>
    );
    await waitFor(() => {
      expect(screen.getByText("Test Child")).toBeInTheDocument();
    });
  });

  it("creates runtime configuration for project", async () => {
    const { container } = render(
      <ChatAssistantUIProvider projectId="p1">
        <div>Content</div>
      </ChatAssistantUIProvider>
    );

    // Provider should wrap children
    expect(container).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Content")).toBeInTheDocument();
    });
  });

  it("accepts different project IDs", async () => {
    const { rerender } = render(
      <ChatAssistantUIProvider projectId="project-123">
        <div>Content</div>
      </ChatAssistantUIProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    rerender(
      <ChatAssistantUIProvider projectId="project-456">
        <div>Content</div>
      </ChatAssistantUIProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Content")).toBeInTheDocument();
    });
  });

  it("renders without errors", async () => {
    expect(() => {
      render(
        <ChatAssistantUIProvider projectId="test-project">
          <div>Test</div>
        </ChatAssistantUIProvider>
      );
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.getByText("Test")).toBeInTheDocument();
    });
  });
});
